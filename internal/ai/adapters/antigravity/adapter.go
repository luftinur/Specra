package antigravity

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"

	"ai-requirements-studio/internal/ai"
	"ai-requirements-studio/internal/domain"
)

type CLIResponsePayload struct {
	ConversationID  string `json:"conversation_id"`
	Status          string `json:"status"`
	Response        string `json:"response"`
	DurationSeconds float64 `json:"duration_seconds"`
	Usage           struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
		TotalTokens  int `json:"total_tokens"`
	} `json:"usage"`
}

type Adapter struct {
	executablePath string
	version        string
	model          string
}

func NewAdapter(customPath string) *Adapter {
	if customPath == "" {
		customPath = "agy"
	}
	return &Adapter{executablePath: customPath}
}

func (a *Adapter) SetConfig(model string) {
	a.model = strings.TrimSpace(model)
}

func (a *Adapter) GetModel() string {
	return a.model
}

func (a *Adapter) ListModels(ctx context.Context) ([]domain.ModelInfo, error) {
	cmd := exec.CommandContext(ctx, a.executablePath, "models")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("failed to list models via agy models: %w (output: %s)", err, string(out))
	}

	lines := strings.Split(string(out), "\n")
	var models []domain.ModelInfo
	for _, rawLine := range lines {
		line := strings.TrimSpace(rawLine)
		if line == "" || strings.HasPrefix(line, "Fetching") || strings.HasPrefix(line, "Usage:") {
			continue
		}
		parts := strings.Split(line, "\t")
		if len(parts) >= 2 {
			id := strings.TrimSpace(parts[0])
			name := strings.TrimSpace(parts[1])
			if id != "" {
				models = append(models, domain.ModelInfo{
					ID:          id,
					DisplayName: name,
				})
			}
		} else {
			fields := strings.Fields(line)
			if len(fields) > 0 {
				id := fields[0]
				name := id
				if len(fields) > 1 {
					name = strings.Join(fields[1:], " ")
				}
				models = append(models, domain.ModelInfo{
					ID:          id,
					DisplayName: name,
				})
			}
		}
	}
	return models, nil
}

func (a *Adapter) ID() string {
	return "antigravity-cli"
}

func (a *Adapter) Name() string {
	return "Antigravity CLI"
}

func (a *Adapter) Type() domain.ProviderType {
	return domain.ProviderCLI
}

func (a *Adapter) CheckAvailability(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, a.executablePath, "--version")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("antigravity cli executable (%s) not available: %w", a.executablePath, err)
	}
	a.version = strings.TrimSpace(string(out))
	return nil
}

func (a *Adapter) CheckAuthentication(ctx context.Context) error {
	// A quick non-interactive prompt to verify authorization
	cmd := exec.CommandContext(ctx, a.executablePath, "-p", "ping", "--output-format", "json", "--disable-slash-commands")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("antigravity cli authentication failed: %w (output: %s)", err, string(out))
	}
	return nil
}

func (a *Adapter) Generate(ctx context.Context, req ai.GenerateRequest) (*ai.GenerateResponse, error) {
	args := []string{
		"--output-format", "json",
		"--disable-slash-commands",
	}

	targetModel := req.Model
	if targetModel == "" {
		targetModel = a.model
	}
	if targetModel != "" {
		args = append(args, "--model", targetModel)
	}

	var tempSchemaFile string
	if req.JSONSchema != "" {
		tmpFile, err := os.CreateTemp("", "agy-schema-*.json")
		if err == nil {
			_, _ = tmpFile.WriteString(req.JSONSchema)
			_ = tmpFile.Close()
			tempSchemaFile = tmpFile.Name()
			args = append(args, "--json-schema", tempSchemaFile)
			defer os.Remove(tempSchemaFile)
		} else {
			args = append(args, "--json-schema", req.JSONSchema)
		}
	}

	cmd := exec.CommandContext(ctx, a.executablePath, args...)
	if req.WorkDir != "" {
		cmd.Dir = req.WorkDir
	}
	cmd.Stdin = strings.NewReader(req.Prompt)

	var stdoutBuf, stderrBuf bytes.Buffer
	cmd.Stdout = &stdoutBuf
	cmd.Stderr = &stderrBuf

	start := time.Now()
	err := cmd.Run()
	elapsed := time.Since(start)

	if err != nil {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return nil, fmt.Errorf("antigravity execution timed out: %w", err)
		}
		if errors.Is(ctx.Err(), context.Canceled) {
			return nil, fmt.Errorf("antigravity execution was canceled")
		}
		return nil, fmt.Errorf("antigravity cli execution failed: %w (stderr: %s)", err, stderrBuf.String())
	}

	var payload CLIResponsePayload
	rawOutput := stdoutBuf.Bytes()
	if err := json.Unmarshal(rawOutput, &payload); err != nil {
		// Fallback: If not formatted JSON, treat raw stdout as content
		return &ai.GenerateResponse{
			Content:         strings.TrimSpace(stdoutBuf.String()),
			ProviderID:      a.ID(),
			Model:           req.Model,
			DurationSeconds: elapsed.Seconds(),
		}, nil
	}

	return &ai.GenerateResponse{
		Content:         strings.TrimSpace(payload.Response),
		ProviderID:      a.ID(),
		Model:           req.Model,
		DurationSeconds: payload.DurationSeconds,
		Usage: &ai.TokenUsage{
			InputTokens:  payload.Usage.InputTokens,
			OutputTokens: payload.Usage.OutputTokens,
			TotalTokens:  payload.Usage.TotalTokens,
		},
		Metadata: map[string]any{
			"conversation_id": payload.ConversationID,
			"status":          payload.Status,
		},
	}, nil
}
