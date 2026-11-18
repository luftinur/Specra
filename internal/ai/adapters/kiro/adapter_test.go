package kiro

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"ai-requirements-studio/internal/ai"
	"ai-requirements-studio/internal/domain"
)

func TestAdapterMetadataAndConfig(t *testing.T) {
	a := NewAdapter("", "--claude-sonnet-4", "  secret-key  ")
	if a.ID() != "kiro-cli" {
		t.Fatalf("expected ID kiro-cli, got %s", a.ID())
	}
	if a.Name() != "Kiro CLI" {
		t.Fatalf("expected Name Kiro CLI, got %s", a.Name())
	}
	if a.Type() != domain.ProviderCLI {
		t.Fatalf("expected ProviderCLI, got %s", a.Type())
	}
	if a.GetModel() != "claude-sonnet-4" {
		t.Fatalf("expected sanitized model claude-sonnet-4, got %q", a.GetModel())
	}

	// Updating model with empty string defaults to "auto" and preserves existing API key.
	a.SetConfig("", "")
	if a.GetModel() != "auto" {
		t.Fatalf("expected default model auto after reset, got %q", a.GetModel())
	}
	_, _, key := a.snapshotConfig()
	if key != "secret-key" {
		t.Fatalf("expected existing key to be preserved, got %q", key)
	}
}

func TestParseKiroModelsOutput(t *testing.T) {
	realKiroOut := []byte(`{"models":[{"model_name":"auto","description":"Models chosen by task","model_id":"auto"},{"model_name":"claude-sonnet-4.5","description":"Claude Sonnet 4.5 model","model_id":"claude-sonnet-4.5"}],"default_model":"auto"}`)
	realModels := ai.ParseKiroModelsOutput(realKiroOut)
	if len(realModels) != 2 {
		t.Fatalf("expected 2 real kiro models, got %d: %+v", len(realModels), realModels)
	}
	if realModels[0].ID != "auto" || realModels[1].ID != "claude-sonnet-4.5" {
		t.Fatalf("unexpected real kiro models: %+v", realModels)
	}

	jsonOut := []byte("\x1b[32mFetching models...\x1b[0m\n" + `{
		"object": "list",
		"data": [
			{"id": "claude-sonnet-4", "name": "Claude Sonnet 4"},
			{"id": "claude-haiku-4", "name": "Claude Haiku 4"}
		]
	}`)
	models := ai.ParseKiroModelsOutput(jsonOut)
	if len(models) != 2 {
		t.Fatalf("expected 2 models, got %d: %+v", len(models), models)
	}
	if models[0].ID != "claude-sonnet-4" || models[0].DisplayName != "Claude Sonnet 4" {
		t.Fatalf("unexpected first model: %+v", models[0])
	}

	textOut := []byte("claude-sonnet-4\tClaude Sonnet 4\nauto\tAuto\n")
	textModels := ai.ParseKiroModelsOutput(textOut)
	if len(textModels) != 2 || textModels[1].ID != "auto" {
		t.Fatalf("unexpected text fallback models: %+v", textModels)
	}

	if got := ai.ParseKiroModelsOutput([]byte("   ")); len(got) != 0 {
		t.Fatalf("expected 0 models for blank output, got %+v", got)
	}
}

func TestAdapterExecLifecycle(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("POSIX shell stub test runs on macOS/Linux")
	}

	dir := t.TempDir()
	scriptPath := filepath.Join(dir, "kiro-cli")
	workDir := filepath.Join(dir, "workspace")
	if err := os.MkdirAll(workDir, 0o755); err != nil {
		t.Fatal(err)
	}

	script := `#!/bin/sh
if [ "$1" = "--version" ]; then
  echo "kiro-cli 1.2.0"
  exit 0
fi
if [ "$1" = "chat" ] && [ "$2" = "--list-models" ]; then
  echo '{"data":[{"id":"claude-sonnet-4","name":"Claude Sonnet 4"}]}'
  exit 0
fi
if [ "$1" = "chat" ] && [ "$2" = "--no-interactive" ]; then
  if [ "$KIRO_API_KEY" = "bad-key" ]; then
    echo "unauthorized" >&2
    exit 1
  fi
  STDIN_DATA=$(cat | tr '\n' ' ')
  echo "{\"response\":\"ACK: $STDIN_DATA\",\"stop_reason\":\"end_turn\",\"usage\":{\"input_tokens\":10,\"output_tokens\":5,\"total_tokens\":15}}"
  exit 0
fi
exit 2
`
	if err := os.WriteFile(scriptPath, []byte(script), 0o755); err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	a := NewAdapter(scriptPath, "claude-sonnet-4", "good-key")
	if err := a.CheckAvailability(ctx); err != nil {
		t.Fatalf("CheckAvailability failed: %v", err)
	}

	models, err := a.ListModels(ctx)
	if err != nil {
		t.Fatalf("ListModels failed: %v", err)
	}
	if len(models) != 1 || models[0].ID != "claude-sonnet-4" {
		t.Fatalf("unexpected models: %+v", models)
	}

	resp, err := a.Generate(ctx, ai.GenerateRequest{
		WorkDir: workDir,
		System:  "Be concise",
		Prompt:  "Draft PRD",
	})
	if err != nil {
		t.Fatalf("Generate failed: %v", err)
	}
	if !strings.Contains(resp.Content, "Draft PRD") || resp.ProviderID != "kiro-cli" {
		t.Fatalf("unexpected generate response: %+v", resp)
	}
	if resp.Usage == nil || resp.Usage.TotalTokens != 15 {
		t.Fatalf("expected usage TotalTokens=15, got %+v", resp.Usage)
	}

	// Verify fail-fast error propagation on non-zero CLI exit.
	a.SetConfig("claude-sonnet-4", "bad-key")
	if _, err := a.Generate(ctx, ai.GenerateRequest{Prompt: "hello"}); err == nil {
		t.Fatal("expected error for failed CLI invocation, got nil")
	}
}
