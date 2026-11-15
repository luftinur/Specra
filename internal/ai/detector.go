package ai

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"ai-requirements-studio/internal/domain"
)

type AgentCandidate struct {
	ID            string
	Name          string
	Executable    string
	VersionArgs   []string
	Description   string
	FallbackPaths []string
}

var knownAgents = []AgentCandidate{
	{
		ID:          "antigravity-cli",
		Name:        "Google Antigravity CLI",
		Executable:  "agy",
		VersionArgs: []string{"--version"},
		Description: "Official Google Antigravity autonomous coding agent CLI with non-interactive subprocess support.",
		FallbackPaths: []string{
			".local/bin/agy",
			".gemini/antigravity-cli/bin/agy",
			".antigravity-ide/antigravity-ide/bin/agy",
			"/opt/homebrew/bin/agy",
			"/usr/local/bin/agy",
		},
	},
	{
		ID:          "opencode",
		Name:        "OpenCode AI Agent",
		Executable:  "opencode",
		VersionArgs: []string{"-v"},
		Description: "Autonomous terminal coding agent & server with multi-provider integration and background service.",
		FallbackPaths: []string{
			".opencode/bin/opencode",
			".local/bin/opencode",
			"/opt/homebrew/bin/opencode",
			"/usr/local/bin/opencode",
		},
	},
	{
		ID:          "claude-code",
		Name:        "Claude Code CLI",
		Executable:  "claude",
		VersionArgs: []string{"--version"},
		Description: "Anthropic Claude terminal-based agentic coding assistant.",
		FallbackPaths: []string{
			".local/bin/claude",
			"/opt/homebrew/bin/claude",
			"/usr/local/bin/claude",
		},
	},
	{
		ID:          "aider",
		Name:        "Aider AI Pair Programmer",
		Executable:  "aider",
		VersionArgs: []string{"--version"},
		Description: "AI pair programming in your terminal supporting git repos and multi-file editing.",
		FallbackPaths: []string{
			".local/bin/aider",
			"/opt/homebrew/bin/aider",
			"/usr/local/bin/aider",
		},
	},
	{
		ID:          "ollama",
		Name:        "Ollama Local LLM",
		Executable:  "ollama",
		VersionArgs: []string{"--version"},
		Description: "Local model runtime supporting Llama 3, Mistral, Qwen, DeepSeek via OpenAI-compatible API.",
		FallbackPaths: []string{
			"/usr/local/bin/ollama",
			"/opt/homebrew/bin/ollama",
		},
	},
	{
		ID:          "cursor",
		Name:        "Cursor IDE CLI",
		Executable:  "cursor",
		VersionArgs: []string{"--version"},
		Description: "Cursor AI editor command line launcher and automation interface.",
		FallbackPaths: []string{
			"/usr/local/bin/cursor",
			"/Applications/Cursor.app/Contents/Resources/app/bin/cursor",
		},
	},
	{
		ID:          "goose",
		Name:        "Block Goose Agent",
		Executable:  "goose",
		VersionArgs: []string{"--version"},
		Description: "Open-source extensible on-machine AI agent from Block.",
		FallbackPaths: []string{
			".local/bin/goose",
			"/opt/homebrew/bin/goose",
			"/usr/local/bin/goose",
		},
	},
}

func DetectInstalledCodingAgents(ctx context.Context) ([]domain.DetectedAgent, error) {
	results := make([]domain.DetectedAgent, 0, len(knownAgents))
	home, _ := os.UserHomeDir()

	for _, agent := range knownAgents {
		detected := domain.DetectedAgent{
			ID:          agent.ID,
			Name:        agent.Name,
			Executable:  agent.Executable,
			Description: agent.Description,
			Installed:   false,
			Version:     "Not Installed",
			Path:        "",
		}

		path, err := exec.LookPath(agent.Executable)
		if err != nil || path == "" {
			// Fallback check: probe known standard locations directly
			for _, fb := range agent.FallbackPaths {
				candidate := fb
				if !filepath.IsAbs(candidate) && home != "" {
					candidate = filepath.Join(home, candidate)
				}
				if info, statErr := os.Stat(candidate); statErr == nil && !info.IsDir() {
					if runtime.GOOS == "windows" || info.Mode()&0111 != 0 {
						path = candidate
						err = nil
						break
					}
				}
			}
		}

		if err == nil && path != "" {
			detected.Installed = true
			detected.Path = path

			// Try obtaining version with short timeout
			vCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
			cmd := exec.CommandContext(vCtx, path, agent.VersionArgs...)
			out, err := cmd.CombinedOutput()
			cancel()

			if err == nil && len(out) > 0 {
				vStr := strings.TrimSpace(string(out))
				lines := strings.Split(vStr, "\n")
				if len(lines) > 0 {
					detected.Version = strings.TrimSpace(lines[0])
				} else {
					detected.Version = vStr
				}
			} else {
				detected.Version = "Installed (Version flag unhandled)"
			}

			// Dynamically discover models supported by this agent
			detected.AvailableModels = detectAgentModels(ctx, agent.ID, path)
		}

		results = append(results, detected)
	}

	return results, nil
}

func detectAgentModels(ctx context.Context, agentID, executable string) []domain.ModelInfo {
	mCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	var models []domain.ModelInfo

	switch agentID {
	case "antigravity-cli":
		cmd := exec.CommandContext(mCtx, executable, "models")
		out, err := cmd.CombinedOutput()
		if err == nil {
			for _, rawLine := range strings.Split(string(out), "\n") {
				line := strings.TrimSpace(rawLine)
				if line == "" || strings.HasPrefix(line, "Fetching") || strings.HasPrefix(line, "Usage:") {
					continue
				}
				parts := strings.Split(line, "\t")
				if len(parts) >= 2 {
					id := strings.TrimSpace(parts[0])
					name := strings.TrimSpace(parts[1])
					if id != "" {
						models = append(models, domain.ModelInfo{ID: id, DisplayName: name})
					}
				} else {
					fields := strings.Fields(line)
					if len(fields) > 0 {
						id := fields[0]
						name := id
						if len(fields) > 1 {
							name = strings.Join(fields[1:], " ")
						}
						models = append(models, domain.ModelInfo{ID: id, DisplayName: name})
					}
				}
			}
		}
	case "opencode":
		cmd := exec.CommandContext(mCtx, executable, "models")
		out, err := cmd.CombinedOutput()
		if err == nil {
			for _, rawLine := range strings.Split(string(out), "\n") {
				line := strings.TrimSpace(rawLine)
				if line == "" || strings.HasPrefix(line, "DESCRIPTION") || strings.HasPrefix(line, "USAGE") || strings.HasPrefix(line, "GLOBAL") {
					continue
				}
				if strings.Contains(line, "/") || strings.Contains(line, "-") || strings.Contains(line, ".") {
					models = append(models, domain.ModelInfo{ID: line, DisplayName: line})
				}
			}
		}
	case "ollama":
		cmd := exec.CommandContext(mCtx, executable, "list")
		out, err := cmd.CombinedOutput()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for i, rawLine := range lines {
				if i == 0 { // Skip header: NAME ID SIZE MODIFIED
					continue
				}
				fields := strings.Fields(rawLine)
				if len(fields) > 0 {
					name := fields[0]
					models = append(models, domain.ModelInfo{ID: name, DisplayName: name})
				}
			}
		}
	case "claude-code":
		models = []domain.ModelInfo{
			{ID: "claude-3-7-sonnet", DisplayName: "Claude 3.7 Sonnet (Hybrid Thinking)"},
			{ID: "claude-3-5-sonnet", DisplayName: "Claude 3.5 Sonnet (Standard)"},
			{ID: "claude-3-5-haiku", DisplayName: "Claude 3.5 Haiku (Fast)"},
		}
	}

	return models
}
