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

	for _, a := range agents {
		t.Logf("Agent: %s (%s) - Installed: %v - Path: %s - Version: %s", a.ID, a.Executable, a.Installed, a.Path, a.Version)
		if a.ID == "" || a.Executable == "" || a.Name == "" {
			t.Errorf("Agent missing required identity fields: %+v", a)
		}
		if a.Installed {
			if a.Path == "" {
				t.Errorf("Agent %s marked as installed but path is empty", a.ID)
			}
			if a.Version == "Not Installed" || a.Version == "" {
				t.Errorf("Agent %s marked as installed but version is invalid: %s", a.ID, a.Version)
			}
		} else {
			if a.Version != "Not Installed" {
				t.Errorf("Agent %s marked as not installed but version is: %s", a.ID, a.Version)
			}
		}
	}
}
