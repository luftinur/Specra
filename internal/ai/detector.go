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

			// Dynamically discover models supported by this agent
			detected.AvailableModels = detectAgentModels(ctx, agent.ID, agent.Executable)
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
