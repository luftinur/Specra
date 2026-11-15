package security

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestFixEnvironmentPath(t *testing.T) {
	origPath := os.Getenv("PATH")
	defer func() {
		_ = os.Setenv("PATH", origPath)
	}()

	// Simulate macOS Finder minimal launch environment
	_ = os.Setenv("PATH", "/usr/bin:/bin")

	FixEnvironmentPath()

	newPath := os.Getenv("PATH")
	if newPath == "" {
		t.Fatal("PATH should not be empty")
	}

	dirs := strings.Split(newPath, string(filepath.ListSeparator))
	if len(dirs) < 2 {
		t.Fatalf("Expected multiple directories in PATH, got %d", len(dirs))
	}

	// Verify standard paths were added
	home, _ := os.UserHomeDir()
	localBin := filepath.Join(home, ".local", "bin")
	if info, err := os.Stat(localBin); err == nil && info.IsDir() {
		found := false
		for _, d := range dirs {
			if d == localBin {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Expected %s to be present in PATH", localBin)
		}
	}
}
