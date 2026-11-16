//go:build !windows

package executil

import "os/exec"

// HideConsoleWindow is a no-op on non-Windows platforms (macOS / Linux)
// where subprocesses do not spawn GUI console windows.
func HideConsoleWindow(cmd *exec.Cmd) {
	// No console allocation needed on Unix-like operating systems.
}
