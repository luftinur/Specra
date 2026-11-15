package ai

import (
	"context"
	"testing"
	"time"
)

func TestDetectInstalledCodingAgents(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	agents, err := DetectInstalledCodingAgents(ctx)
	if err != nil {
		t.Fatalf("DetectInstalledCodingAgents failed: %v", err)
	}

	if len(agents) == 0 {
		t.Fatal("Expected at least some known agents, got 0")
	}

	foundAgy := false
	foundOpencode := false

	for _, a := range agents {
		t.Logf("Agent: %s (%s) - Installed: %v - Path: %s - Version: %s", a.ID, a.Executable, a.Installed, a.Path, a.Version)
		if a.ID == "antigravity-cli" && a.Installed {
			foundAgy = true
		}
		if a.ID == "opencode" && a.Installed {
			foundOpencode = true
		}
	}

	if !foundAgy {
		t.Errorf("Expected Google Antigravity CLI (agy) to be detected on this machine")
	}
	if !foundOpencode {
		t.Errorf("Expected OpenCode CLI (opencode) to be detected on this machine")
	}
}
