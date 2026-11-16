//go:build windows

package executil

import (
	"os/exec"
	"syscall"
)

// createNoWindow is the Windows process creation flag that prevents
// the creation of a new console window when executing console binaries.
const createNoWindow = 0x08000000

// HideConsoleWindow configures the Cmd to execute silently without spawning
// a visible console / terminal window on Windows.
func HideConsoleWindow(cmd *exec.Cmd) {
	if cmd == nil {
		return
	}
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.HideWindow = true
	cmd.SysProcAttr.CreationFlags |= createNoWindow
}
