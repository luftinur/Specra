package antigravity

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
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
}

func NewAdapter(customPath string) *Adapter {
	if customPath == "" {
		customPath = "agy"
	}
	return &Adapter{executablePath: customPath}
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
		"-p", req.Prompt,
		"--output-format", "json",
		"--disable-slash-commands",
	}

	if req.Model != "" {
		args = append(args, "--model", req.Model)
	}

	if req.JSONSchema != "" {
		args = append(args, "--json-schema", req.JSONSchema)
	}

	cmd := exec.CommandContext(ctx, a.executablePath, args...)
	if req.WorkDir != "" {
		cmd.Dir = req.WorkDir
	}

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
