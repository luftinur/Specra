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

	if runtime.GOOS == "windows" {
		if cmd.SysProcAttr == nil {
			t.Fatal("expected non-nil SysProcAttr on Windows")
		}
		if !cmd.SysProcAttr.HideWindow {
			t.Errorf("expected HideWindow to be true")
		}
		if cmd.SysProcAttr.CreationFlags&createNoWindow == 0 {
			t.Errorf("expected CreationFlags to have CREATE_NO_WINDOW (0x08000000)")
		}
	}
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
