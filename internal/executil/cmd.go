package executil

import (
	"context"
	"os/exec"
)

// Command returns an *exec.Cmd with console window creation suppressed on Windows.
func Command(name string, arg ...string) *exec.Cmd {
	cmd := exec.Command(name, arg...)
	HideConsoleWindow(cmd)
	return cmd
}

// CommandContext returns an *exec.Cmd with console window creation suppressed on Windows.
func CommandContext(ctx context.Context, name string, arg ...string) *exec.Cmd {
	cmd := exec.CommandContext(ctx, name, arg...)
	HideConsoleWindow(cmd)
	return cmd
}
