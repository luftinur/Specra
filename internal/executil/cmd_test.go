package executil

import (
	"context"
	"runtime"
	"strings"
	"testing"
	"time"
)

func TestHideConsoleWindow(t *testing.T) {
	cmd := Command("echo", "hello")
	if cmd == nil {
		t.Fatal("expected non-nil cmd")
	}

	assertWindowsSysProcAttr(t, cmd)
}

func TestCommandContext_Execution(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var cmd = CommandContext(ctx, "cmd", "/c", "echo", "test_silent")
	if runtime.GOOS != "windows" {
		cmd = CommandContext(ctx, "echo", "test_silent")
	}

	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("command failed: %v", err)
	}

	trimmed := strings.TrimSpace(string(out))
	if trimmed != "test_silent" {
		t.Errorf("expected 'test_silent', got %q", trimmed)
	}
}
