package kiro

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"ai-requirements-studio/internal/ai"
	"ai-requirements-studio/internal/domain"
	"ai-requirements-studio/internal/executil"
)

type cliResponsePayload struct {
	Response   string `json:"response"`
	Content    string `json:"content"`
	Message    string `json:"message"`
	Text       string `json:"text"`
	StopReason string `json:"stop_reason"`
	Usage      *struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
		TotalTokens  int `json:"total_tokens"`
	} `json:"usage"`
}

// Adapter executes prompts and model discovery against the standalone Kiro CLI (`kiro-cli`).
type Adapter struct {
	mu             sync.RWMutex
	executablePath string
	version        string
	model          string
	apiKey         string
}

// NewAdapter creates a Kiro CLI adapter with optional custom binary path, model, and API key.
func NewAdapter(customPath, model, apiKey string) *Adapter {
	if strings.TrimSpace(customPath) == "" {
		customPath = "kiro-cli"
	}
	cleanModel := ai.SanitizeModelName(model)
	if cleanModel == "" {
		cleanModel = "auto"
	}
	return &Adapter{
		executablePath: strings.TrimSpace(customPath),
		model:          cleanModel,
		apiKey:         strings.TrimSpace(apiKey),
	}
}

func (a *Adapter) ID() string {
	return "kiro-cli"
}

func (a *Adapter) Name() string {
	return "Kiro CLI"
}

func (a *Adapter) Type() domain.ProviderType {
	return domain.ProviderCLI
}

// SetExecutablePath updates the resolved binary path for kiro-cli.
func (a *Adapter) SetExecutablePath(path string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if strings.TrimSpace(path) != "" {
		a.executablePath = strings.TrimSpace(path)
	}
}

// SetConfig updates the default model and optional KIRO_API_KEY (empty model defaults to "auto"; empty key preserves existing key).
func (a *Adapter) SetConfig(model, apiKey string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	cleanModel := ai.SanitizeModelName(model)
	if cleanModel == "" {
		cleanModel = "auto"
	}
	a.model = cleanModel
	if strings.TrimSpace(apiKey) != "" {
		a.apiKey = strings.TrimSpace(apiKey)
	}
}

// GetModel returns the configured default model identifier.
func (a *Adapter) GetModel() string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.model
}

func (a *Adapter) snapshotConfig() (exe string, model string, apiKey string) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.executablePath, a.model, a.apiKey
}

func (a *Adapter) buildEnv(apiKey string) []string {
	if apiKey == "" {
		return nil
	}
	return append(os.Environ(), "KIRO_API_KEY="+apiKey)
}

// CheckAvailability verifies that the kiro-cli binary is reachable and responds to --version.
func (a *Adapter) CheckAvailability(ctx context.Context) error {
	exe, _, _ := a.snapshotConfig()
	cmd := executil.CommandContext(ctx, exe, "--version")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("kiro cli executable (%s) not available: %w", exe, err)
	}
	trimmed := strings.TrimSpace(ai.StripANSI(string(out)))
	if trimmed == "" {
		return fmt.Errorf("kiro cli (%s) returned empty version output", exe)
	}
	lines := strings.Split(trimmed, "\n")
	a.mu.Lock()
	a.version = strings.TrimSpace(lines[0])
	a.mu.Unlock()
	return nil
}

// CheckAuthentication verifies non-interactive session authorization via a lightweight chat probe.
func (a *Adapter) CheckAuthentication(ctx context.Context) error {
	exe, _, apiKey := a.snapshotConfig()
	cmd := executil.CommandContext(ctx, exe, "chat", "--no-interactive", "--trust-all-tools", "--trust-workspace", "--output-format", "text", "--wrap", "never")
	if env := a.buildEnv(apiKey); env != nil {
		cmd.Env = env
	}
	cmd.Stdin = strings.NewReader("ping")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("kiro cli authentication failed: %w (output: %s)", err, strings.TrimSpace(ai.StripANSI(string(out))))
	}
	return nil
}

// ListModels queries available models via `kiro-cli chat --list-models --format json`.
func (a *Adapter) ListModels(ctx context.Context) ([]domain.ModelInfo, error) {
	exe, _, apiKey := a.snapshotConfig()
	cmd := executil.CommandContext(ctx, exe, "chat", "--list-models", "--format", "json")
	if env := a.buildEnv(apiKey); env != nil {
		cmd.Env = env
	}
	out, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("failed to list models via kiro-cli: %w (output: %s)", err, strings.TrimSpace(ai.StripANSI(string(out))))
	}
	return ai.ParseKiroModelsOutput(out), nil
}

// Generate runs a non-interactive Kiro CLI chat invocation inside the isolated project directory.
func (a *Adapter) Generate(ctx context.Context, req ai.GenerateRequest) (*ai.GenerateResponse, error) {
	exe, defaultModel, apiKey := a.snapshotConfig()

	fullPrompt := req.Prompt
	if req.System != "" {
		fullPrompt = fmt.Sprintf("SYSTEM INSTRUCTION:\n%s\n\nUSER REQUEST:\n%s", req.System, req.Prompt)
	}
	if req.JSONSchema != "" {
		fullPrompt += "\n\nRespond ONLY with valid JSON matching this schema:\n" + req.JSONSchema
	}

	args := []string{"chat", "--no-interactive", "--trust-all-tools", "--trust-workspace", "--output-format", "text", "--wrap", "never"}
	targetModel := ai.SanitizeModelName(req.Model)
	if targetModel == "" {
		targetModel = defaultModel
	}
	if targetModel != "" {
		args = append(args, "--model", targetModel)
	}

	cmd := executil.CommandContext(ctx, exe, args...)
	if req.WorkDir != "" {
		cmd.Dir = req.WorkDir
	}
	if env := a.buildEnv(apiKey); env != nil {
		cmd.Env = env
	}
	cmd.Stdin = strings.NewReader(fullPrompt)

	var stdoutBuf, stderrBuf bytes.Buffer
	cmd.Stdout = &stdoutBuf
	cmd.Stderr = &stderrBuf

	start := time.Now()
	err := cmd.Run()
	elapsed := time.Since(start)

	if err != nil {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return nil, fmt.Errorf("kiro cli execution timed out: %w", err)
		}
		if errors.Is(ctx.Err(), context.Canceled) {
			return nil, fmt.Errorf("kiro cli execution was canceled")
		}
		errOut := strings.TrimSpace(ai.StripANSI(stderrBuf.String()))
		if errOut == "" {
			errOut = strings.TrimSpace(ai.StripANSI(stdoutBuf.String()))
		}
		return nil, fmt.Errorf("kiro cli execution failed: %w (stderr: %s)", err, errOut)
	}

	rawStdout := strings.TrimSpace(ai.StripANSI(stdoutBuf.String()))
	if rawStdout == "" {
		return nil, fmt.Errorf("kiro cli returned empty output")
	}

	content, usage, metadata := parseCLIResponse(rawStdout)
	if content == "" {
		return nil, fmt.Errorf("kiro cli returned empty response content")
	}

	if usage == nil {
		inTokens := len(fullPrompt) / 4
		outTokens := len(content) / 4
		usage = &ai.TokenUsage{
			InputTokens:  inTokens,
			OutputTokens: outTokens,
			TotalTokens:  inTokens + outTokens,
		}
	}

	return &ai.GenerateResponse{
		Content:         content,
		ProviderID:      a.ID(),
		Model:           targetModel,
		DurationSeconds: elapsed.Seconds(),
		Usage:           usage,
		Metadata:        metadata,
	}, nil
}

func extractPayloadText(p cliResponsePayload) string {
	switch {
	case strings.TrimSpace(p.Response) != "":
		return strings.TrimSpace(p.Response)
	case strings.TrimSpace(p.Content) != "":
		return strings.TrimSpace(p.Content)
	case strings.TrimSpace(p.Text) != "":
		return strings.TrimSpace(p.Text)
	case strings.TrimSpace(p.Message) != "":
		return strings.TrimSpace(p.Message)
	default:
		return ""
	}
}

func parseCLIResponse(raw string) (string, *ai.TokenUsage, map[string]any) {
	var payload cliResponsePayload
	if err := json.Unmarshal([]byte(raw), &payload); err == nil {
		if text := extractPayloadText(payload); text != "" {
			var usage *ai.TokenUsage
			if payload.Usage != nil && (payload.Usage.InputTokens > 0 || payload.Usage.OutputTokens > 0 || payload.Usage.TotalTokens > 0) {
				tot := payload.Usage.TotalTokens
				if tot == 0 {
					tot = payload.Usage.InputTokens + payload.Usage.OutputTokens
				}
				usage = &ai.TokenUsage{
					InputTokens:  payload.Usage.InputTokens,
					OutputTokens: payload.Usage.OutputTokens,
					TotalTokens:  tot,
				}
			}
			var meta map[string]any
			if payload.StopReason != "" {
				meta = map[string]any{"stop_reason": payload.StopReason}
			}
			return text, usage, meta
		}
	}

	// Fallback: try NDJSON lines if the CLI emitted streamed JSON events.
	var ndjsonText strings.Builder
	var lastUsage *ai.TokenUsage
	var stopReason string
	parsedLines := false
	for _, line := range strings.Split(raw, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || !strings.HasPrefix(trimmed, "{") {
			continue
		}
		var ev cliResponsePayload
		if err := json.Unmarshal([]byte(trimmed), &ev); err == nil {
			parsedLines = true
			if text := extractPayloadText(ev); text != "" {
				ndjsonText.WriteString(text)
			}
			if ev.Usage != nil && (ev.Usage.InputTokens > 0 || ev.Usage.OutputTokens > 0 || ev.Usage.TotalTokens > 0) {
				tot := ev.Usage.TotalTokens
				if tot == 0 {
					tot = ev.Usage.InputTokens + ev.Usage.OutputTokens
				}
				lastUsage = &ai.TokenUsage{
					InputTokens:  ev.Usage.InputTokens,
					OutputTokens: ev.Usage.OutputTokens,
					TotalTokens:  tot,
				}
			}
			if ev.StopReason != "" {
				stopReason = ev.StopReason
			}
		}
	}
	if parsedLines && ndjsonText.Len() > 0 {
		var meta map[string]any
		if stopReason != "" {
			meta = map[string]any{"stop_reason": stopReason}
		}
		return strings.TrimSpace(ndjsonText.String()), lastUsage, meta
	}

	return raw, nil, nil
}
