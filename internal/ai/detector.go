package ai

import (
	"context"
	"os/exec"
	"strings"
	"time"

	"ai-requirements-studio/internal/domain"
)

type AgentCandidate struct {
	ID          string
	Name        string
	Executable  string
	VersionArgs []string
	Description string
}

var knownAgents = []AgentCandidate{
	{
		ID:          "antigravity-cli",
		Name:        "Google Antigravity CLI",
		Executable:  "agy",
		VersionArgs: []string{"-v"},
		Description: "Official Google Antigravity autonomous coding agent CLI with non-interactive subprocess support.",
	},
	{
		ID:          "opencode",
		Name:        "OpenCode AI Agent",
		Executable:  "opencode",
		VersionArgs: []string{"-v"},
		Description: "Autonomous terminal coding agent & server with multi-provider integration and background service.",
	},
	{
		ID:          "claude-code",
		Name:        "Claude Code CLI",
		Executable:  "claude",
		VersionArgs: []string{"--version"},
		Description: "Anthropic Claude terminal-based agentic coding assistant.",
	},
	{
		ID:          "aider",
		Name:        "Aider AI Pair Programmer",
		Executable:  "aider",
		VersionArgs: []string{"--version"},
		Description: "AI pair programming in your terminal supporting git repos and multi-file editing.",
	},
	{
		ID:          "ollama",
		Name:        "Ollama Local LLM",
		Executable:  "ollama",
		VersionArgs: []string{"--version"},
		Description: "Local model runtime supporting Llama 3, Mistral, Qwen, DeepSeek via OpenAI-compatible API.",
	},
	{
		ID:          "cursor",
		Name:        "Cursor IDE CLI",
		Executable:  "cursor",
		VersionArgs: []string{"--version"},
		Description: "Cursor AI editor command line launcher and automation interface.",
	},
	{
		ID:          "goose",
		Name:        "Block Goose Agent",
		Executable:  "goose",
		VersionArgs: []string{"--version"},
		Description: "Open-source extensible on-machine AI agent from Block.",
	},
}

func DetectInstalledCodingAgents(ctx context.Context) ([]domain.DetectedAgent, error) {
	results := make([]domain.DetectedAgent, 0, len(knownAgents))

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
		if err == nil && path != "" {
			detected.Installed = true
			detected.Path = path

			// Try obtaining version with short timeout
			vCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
			cmd := exec.CommandContext(vCtx, agent.Executable, agent.VersionArgs...)
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
		}

		results = append(results, detected)
	}

	return results, nil
}
