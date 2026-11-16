//go:build windows

package executil

import (
	"os/exec"
	"testing"
)

func assertWindowsSysProcAttr(t *testing.T, cmd *exec.Cmd) {
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
