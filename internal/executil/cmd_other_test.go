//go:build !windows

package executil

import (
	"os/exec"
	"testing"
)

func assertWindowsSysProcAttr(t *testing.T, cmd *exec.Cmd) {
	// No-op on non-Windows platforms where console windows are not spawned
}
