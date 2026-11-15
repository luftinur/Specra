package security

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// FixEnvironmentPath ensures that the application's PATH environment variable
// contains essential user tool directories. When desktop applications are launched
// via GUI launchers (such as macOS Finder, Dock, or Launchpad), the OS executes
// them with a minimal default PATH (/usr/bin:/bin:/usr/sbin:/sbin) without evaluating
// user shell configuration files (~/.zshrc, ~/.bash_profile).
//
// FixEnvironmentPath dynamically queries the user's login shell and augments PATH
// with standard developer tool locations (~/.local/bin, Homebrew, Go, Node, etc.).
func FixEnvironmentPath() {
	currentPath := os.Getenv("PATH")
	existingDirs := strings.Split(currentPath, string(filepath.ListSeparator))

	seen := make(map[string]bool)
	var orderedPaths []string

	addPath := func(dir string) {
		trimmed := strings.TrimSpace(dir)
		if trimmed == "" {
			return
		}
		clean := filepath.Clean(trimmed)
		if !seen[clean] {
			seen[clean] = true
			orderedPaths = append(orderedPaths, clean)
		}
	}

	// 1. Try querying the user's login shell for the complete interactive PATH (macOS / Linux)
	if runtime.GOOS != "windows" {
		shell := os.Getenv("SHELL")
		if shell == "" {
			shell = "/bin/zsh"
			if _, err := os.Stat(shell); err != nil {
				shell = "/bin/bash"
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 1500*time.Millisecond)
		cmd := exec.CommandContext(ctx, shell, "-l", "-c", "printf '%s' \"$PATH\"")
		out, err := cmd.Output()
		cancel()

		if err == nil && len(out) > 0 {
			shellPaths := strings.Split(string(out), string(filepath.ListSeparator))
			for _, p := range shellPaths {
				addPath(p)
			}
		}
	}

	// 2. Add guaranteed standard developer tool directories
	home, _ := os.UserHomeDir()
	var standardDirs []string

	if runtime.GOOS != "windows" {
		standardDirs = []string{
			filepath.Join(home, ".local", "bin"),
			filepath.Join(home, ".opencode", "bin"),
			filepath.Join(home, ".gemini", "antigravity-cli", "bin"),
			filepath.Join(home, ".antigravity-ide", "antigravity-ide", "bin"),
			"/opt/homebrew/bin",
			"/opt/homebrew/sbin",
			"/usr/local/bin",
			"/usr/local/sbin",
			filepath.Join(home, "go", "bin"),
			filepath.Join(home, ".cargo", "bin"),
			filepath.Join(home, ".nvm", "current", "bin"),
		}
	} else {
		// Windows standard tool directories
		localAppData := os.Getenv("LOCALAPPDATA")
		appData := os.Getenv("APPDATA")
		standardDirs = []string{
			filepath.Join(home, ".local", "bin"),
			filepath.Join(home, ".opencode", "bin"),
			filepath.Join(home, "go", "bin"),
			filepath.Join(home, ".cargo", "bin"),
			filepath.Join(localAppData, "Programs"),
			filepath.Join(localAppData, "Programs", "Python"),
			filepath.Join(appData, "npm"),
		}
	}

	for _, dir := range standardDirs {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			addPath(dir)
		}
	}

	// 3. Keep any existing paths from current environment
	for _, p := range existingDirs {
		addPath(p)
	}

	newPath := strings.Join(orderedPaths, string(filepath.ListSeparator))
	_ = os.Setenv("PATH", newPath)
}
