package services

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"ai-requirements-studio/internal/ai"
	"ai-requirements-studio/internal/ai/adapters/antigravity"
	"ai-requirements-studio/internal/ai/adapters/gemini"
	"ai-requirements-studio/internal/ai/adapters/opencode"
	"ai-requirements-studio/internal/domain"
	"ai-requirements-studio/internal/security"
	"ai-requirements-studio/internal/storage"
)

type ProviderService struct {
	orchestrator    *ai.Orchestrator
	repo            *storage.ProviderRepository
	agyAdapter      *antigravity.Adapter
	opencodeAdapter *opencode.Adapter
	geminiAdapter   *gemini.Adapter
	credManager     *security.CredentialManager
	agentRegistry   *ai.AgentRegistry
	workspaceDir    string
}

func NewProviderService(
	orch *ai.Orchestrator,
	repo *storage.ProviderRepository,
	agy *antigravity.Adapter,
	oc *opencode.Adapter,
	gem *gemini.Adapter,
) *ProviderService {
	ps := &ProviderService{
		orchestrator:    orch,
		repo:            repo,
		agyAdapter:      agy,
		opencodeAdapter: oc,
		geminiAdapter:   gem,
		credManager:     security.NewCredentialManager(),
	}

	// Restore configured keys & settings from Keyring/DB if available
	ps.restoreSettings()
	return ps
}

func (s *ProviderService) restoreSettings() {
	if s.repo == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	// Restore API keys and configured models from Keyring/DB
	if s.agyAdapter != nil {
		model, _ := s.repo.GetSetting(ctx, "agy_model")
		if model != "" {
			s.agyAdapter.SetConfig(model)
		}
	}

	if s.opencodeAdapter != nil {
		ocKey, _ := s.credManager.GetAPIKey("opencode")
		baseURL, _ := s.repo.GetSetting(ctx, "opencode_base_url")
		model, _ := s.repo.GetSetting(ctx, "opencode_model")
		s.opencodeAdapter.SetConfig(baseURL, model, ocKey)
	}

	if s.geminiAdapter != nil {
		gemKey, _ := s.credManager.GetAPIKey("gemini")
		model, _ := s.repo.GetSetting(ctx, "gemini_model")
		s.geminiAdapter.SetConfig(model, gemKey)
	}

	// Restore Primary & Fallback Provider selections
	primary, _ := s.repo.GetSetting(ctx, "primary_provider")
	fallback, _ := s.repo.GetSetting(ctx, "fallback_provider")
	fallbackEnabledStr, _ := s.repo.GetSetting(ctx, "fallback_enabled")

	if primary != "" {
		_ = s.orchestrator.SetActiveProvider(primary)
	}
	if fallback != "" {
		enabled := fallbackEnabledStr == "true" || fallbackEnabledStr == "1"
		_ = s.orchestrator.SetFallbackProvider(fallback, enabled)
	}
}

func (s *ProviderService) DetectInstalledCodingAgents() ([]domain.DetectedAgent, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	agents, err := ai.DetectInstalledCodingAgents(ctx)
	if err != nil {
		return nil, err
	}

	// Attach current selected models from database
	if s.repo != nil {
		agyModel, _ := s.repo.GetSetting(ctx, "agy_model")
		ocModel, _ := s.repo.GetSetting(ctx, "opencode_model")
		for i := range agents {
			switch agents[i].ID {
			case "antigravity-cli":
				agents[i].SelectedModel = agyModel
				if agents[i].Installed && agents[i].Path != "" && s.agyAdapter != nil {
					s.agyAdapter.SetExecutablePath(agents[i].Path)
				}
			case "opencode":
				agents[i].SelectedModel = ocModel
				if agents[i].Installed && agents[i].Path != "" && s.opencodeAdapter != nil {
					s.opencodeAdapter.SetExecutablePath(agents[i].Path)
				}
			}
		}
	}

	return agents, nil
}

func (s *ProviderService) GetProviderStatus() (map[string]any, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	primary, fallback, fallbackEnabled := s.orchestrator.GetConfig()

	agyModel := ""
	if s.agyAdapter != nil {
		agyModel = s.agyAdapter.GetModel()
	}
	ocModel := ""
	if s.opencodeAdapter != nil {
		ocModel = s.opencodeAdapter.GetModel()
	}
	gemModel := ""
	if s.geminiAdapter != nil {
		gemModel = s.geminiAdapter.GetModel()
	}

	providers := []map[string]any{
		{
			"id":        "antigravity-cli",
			"name":      "Antigravity CLI",
			"type":      "cli",
			"available": false,
			"version":   "unknown",
			"model":     agyModel,
		},
		{
			"id":        "opencode",
			"name":      "OpenCode / OpenAI-Compatible",
			"type":      "cli/http",
			"available": false,
			"version":   "unknown",
			"model":     ocModel,
		},
		{
			"id":        "gemini-direct",
			"name":      "Google Gemini (Direct API)",
			"type":      "cloud",
			"available": false,
			"version":   "API",
			"model":     gemModel,
		},
	}

	if s.agyAdapter != nil {
		if err := s.agyAdapter.CheckAvailability(ctx); err == nil {
			providers[0]["available"] = true
			providers[0]["version"] = "1.5.5"
		} else {
			providers[0]["error"] = err.Error()
		}
	}

	if s.opencodeAdapter != nil {
		if err := s.opencodeAdapter.CheckAvailability(ctx); err == nil {
			providers[1]["available"] = true
			providers[1]["version"] = "v2.2.5"
		} else {
			providers[1]["error"] = err.Error()
		}
	}

	if s.geminiAdapter != nil {
		if err := s.geminiAdapter.CheckAvailability(ctx); err == nil {
			providers[2]["available"] = true
		} else {
			providers[2]["error"] = err.Error()
		}
	}

	return map[string]any{
		"primary_provider":  primary,
		"fallback_provider": fallback,
		"fallback_enabled":  fallbackEnabled,
		"providers":         providers,
		"agy_model":         agyModel,
		"opencode_model":    ocModel,
		"gemini_model":      gemModel,
	}, nil
}

func (s *ProviderService) ConfigureAntigravity(model string) error {
	if s.agyAdapter != nil {
		s.agyAdapter.SetConfig(model)
	}
	if s.repo != nil {
		ctx := context.Background()
		_ = s.repo.SetSetting(ctx, "agy_model", model)
	}
	return nil
}

func (s *ProviderService) GetProviderModels(providerID string) ([]domain.ModelInfo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()

	switch providerID {
	case "antigravity-cli":
		if s.agyAdapter != nil {
			return s.agyAdapter.ListModels(ctx)
		}
	case "opencode":
		if s.opencodeAdapter != nil {
			return s.opencodeAdapter.ListModels(ctx)
		}
	case "gemini-direct":
		if s.geminiAdapter != nil {
			return s.geminiAdapter.ListModels(ctx)
		}
	}
	return []domain.ModelInfo{}, nil
}

func (s *ProviderService) ConfigureProviders(primaryID, fallbackID string, fallbackEnabled bool) error {
	if err := s.orchestrator.SetActiveProvider(primaryID); err != nil {
		return err
	}
	if err := s.orchestrator.SetFallbackProvider(fallbackID, fallbackEnabled); err != nil {
		return err
	}

	if s.repo != nil {
		ctx := context.Background()
		_ = s.repo.SetSetting(ctx, "primary_provider", primaryID)
		_ = s.repo.SetSetting(ctx, "fallback_provider", fallbackID)
		enabledStr := "0"
		if fallbackEnabled {
			enabledStr = "1"
		}
		_ = s.repo.SetSetting(ctx, "fallback_enabled", enabledStr)
	}

	return nil
}

func (s *ProviderService) ConfigureOpenCode(baseURL, model, apiKey string) error {
	if s.opencodeAdapter != nil {
		s.opencodeAdapter.SetConfig(baseURL, model, apiKey)
	}
	if apiKey != "" {
		_ = s.credManager.StoreAPIKey("opencode", apiKey)
	}
	if s.repo != nil {
		ctx := context.Background()
		_ = s.repo.SetSetting(ctx, "opencode_base_url", baseURL)
		_ = s.repo.SetSetting(ctx, "opencode_model", model)
	}
	return nil
}

func (s *ProviderService) ConfigureGemini(model, apiKey string) error {
	if s.geminiAdapter != nil {
		s.geminiAdapter.SetConfig(model, apiKey)
	}
	if apiKey != "" {
		_ = s.credManager.StoreAPIKey("gemini", apiKey)
	}
	if s.repo != nil {
		ctx := context.Background()
		_ = s.repo.SetSetting(ctx, "gemini_model", model)
	}
	return nil
}

func (s *ProviderService) GetTokenUsageSummary(projectID string) (*domain.TokenUsageSummary, error) {
	if s.repo == nil {
		return &domain.TokenUsageSummary{}, nil
	}
	return s.repo.GetTokenUsageSummary(context.Background(), projectID)
}

func (s *ProviderService) ListExecutionLogs(projectID string, limit int) ([]domain.ProviderExecution, error) {
	if s.repo == nil {
		return []domain.ProviderExecution{}, nil
	}
	return s.repo.ListExecutions(context.Background(), projectID, limit)
}

func (s *ProviderService) RunDiagnostics() (map[string]any, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	start := time.Now()
	cliAvailable := false
	cliVersion := "unknown"
	cliPath := ""
	cliError := ""

	opencodeAvailable := false
	opencodeVersion := "unknown"
	opencodePath := ""

	// Probe device coding agents for accurate paths and versions
	detectedAgents, _ := ai.DetectInstalledCodingAgents(ctx)
	agentDiagnostics := make([]map[string]any, 0, len(detectedAgents))

	for _, ag := range detectedAgents {
		diag := map[string]any{
			"id":           ag.ID,
			"name":         ag.Name,
			"installed":    ag.Installed,
			"version":      ag.Version,
			"path":         ag.Path,
			"models_count": len(ag.AvailableModels),
		}
		agentDiagnostics = append(agentDiagnostics, diag)

		if ag.ID == "antigravity-cli" && ag.Installed {
			cliAvailable = true
			cliVersion = ag.Version
			cliPath = ag.Path
		}
		if ag.ID == "opencode" && ag.Installed {
			opencodeAvailable = true
			opencodeVersion = ag.Version
			opencodePath = ag.Path
		}
	}

	if !cliAvailable && s.agyAdapter != nil {
		if err := s.agyAdapter.CheckAvailability(ctx); err == nil {
			cliAvailable = true
			cliVersion = "detected"
		} else {
			cliError = err.Error()
		}
	}

	if !opencodeAvailable && s.opencodeAdapter != nil {
		if err := s.opencodeAdapter.CheckAvailability(ctx); err == nil {
			opencodeAvailable = true
			opencodeVersion = "detected"
		}
	}

	// Test Keyring Health
	dummyKey := "diag-check-token"
	keyringHealth := "Healthy"
	if err := s.credManager.StoreAPIKey("diagnostic_test", dummyKey); err != nil {
		keyringHealth = fmt.Sprintf("Failed: %v", err)
	} else {
		_ = s.credManager.StoreAPIKey("diagnostic_test", "") // cleanup
	}

	// Capture environment diagnostics
	pathEnv := os.Getenv("PATH")
	var pathDirs []string
	if pathEnv != "" {
		pathDirs = strings.Split(pathEnv, string(os.PathListSeparator))
	}

	return map[string]any{
		"timestamp":          time.Now().UTC().Format(time.RFC3339),
		"duration_ms":        time.Since(start).Milliseconds(),
		"os":                 runtime.GOOS,
		"arch":               runtime.GOARCH,
		"cli_available":      cliAvailable,
		"cli_version":        cliVersion,
		"cli_path":           cliPath,
		"cli_error":          cliError,
		"opencode_available": opencodeAvailable,
		"opencode_version":   opencodeVersion,
		"opencode_path":      opencodePath,
		"keyring_health":     keyringHealth,
		"storage_strategy":   "Local SQLite WAL + Markdown Workspace",
		"agents":             agentDiagnostics,
		"system_path":        pathEnv,
		"path_directories":   pathDirs,
	}, nil
}

func (s *ProviderService) StoreAPIKey(providerID, apiKey string) error {
	return s.credManager.StoreAPIKey(providerID, apiKey)
}

func (s *ProviderService) HasAPIKey(providerID string) bool {
	return s.credManager.HasAPIKey(providerID)
}

func (s *ProviderService) SetAgentRegistry(ar *ai.AgentRegistry) {
	s.agentRegistry = ar
}

func (s *ProviderService) ListAgents() []domain.AgentConfig {
	if s.agentRegistry == nil {
		return []domain.AgentConfig{}
	}
	return s.agentRegistry.ListAgents()
}

func (s *ProviderService) SaveAgent(config domain.AgentConfig) error {
	if s.agentRegistry == nil {
		return fmt.Errorf("agent registry not initialized")
	}
	return s.agentRegistry.SaveAgent(config)
}

func (s *ProviderService) ListMCPServers() []domain.MCPServerConfig {
	if s.agentRegistry == nil {
		return []domain.MCPServerConfig{}
	}
	return s.agentRegistry.ListMCPServers()
}

func (s *ProviderService) SaveMCPServer(server domain.MCPServerConfig) error {
	if s.agentRegistry == nil {
		return fmt.Errorf("agent registry not initialized")
	}
	return s.agentRegistry.SaveMCPServer(server)
}

func (s *ProviderService) DeleteMCPServer(id string) error {
	if s.agentRegistry == nil {
		return fmt.Errorf("agent registry not initialized")
	}
	return s.agentRegistry.DeleteMCPServer(id)
}

func (s *ProviderService) ListSkills() []domain.SkillConfig {
	if s.agentRegistry == nil {
		return []domain.SkillConfig{}
	}
	return s.agentRegistry.ListSkills()
}

func (s *ProviderService) SaveSkill(skill domain.SkillConfig) error {
	if s.agentRegistry == nil {
		return fmt.Errorf("agent registry not initialized")
	}
	return s.agentRegistry.SaveSkill(skill)
}

func (s *ProviderService) DeleteSkill(id string) error {
	if s.agentRegistry == nil {
		return fmt.Errorf("agent registry not initialized")
	}
	return s.agentRegistry.DeleteSkill(id)
}

func (s *ProviderService) GetMCPServersForAgent(agentID string) []domain.MCPServerConfig {
	if s.agentRegistry == nil {
		return []domain.MCPServerConfig{}
	}
	return s.agentRegistry.GetMCPServersForAgent(agentID)
}

func (s *ProviderService) SetWorkspaceDir(dir string) {
	s.workspaceDir = dir
}

func (s *ProviderService) GetGeneralSettings() (domain.GeneralSettings, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	cfg := domain.GeneralSettings{
		Theme:                  "system",
		FontSize:               "standard",
		Animations:             true,
		Language:               "id",
		ChatLanguage:           "id",
		DocLanguage:            "en",
		AutoSaveDraft:          true,
		AutoSaveIntervalMs:     1000,
		DefaultDocDepth:        "standard",
		ProactiveClarification: true,
		DesktopNotifications:   true,
		WorkspacePath:          s.workspaceDir,
	}

	if s.repo == nil {
		return cfg, nil
	}

	if val, err := s.repo.GetSetting(ctx, "gen_theme"); err == nil && val != "" {
		cfg.Theme = val
	}
	if val, err := s.repo.GetSetting(ctx, "gen_font_size"); err == nil && val != "" {
		cfg.FontSize = val
	}
	if val, err := s.repo.GetSetting(ctx, "gen_animations"); err == nil {
		cfg.Animations = (val == "true" || val == "1")
	}
	if val, err := s.repo.GetSetting(ctx, "gen_language"); err == nil && val != "" {
		cfg.Language = val
	}
	if val, err := s.repo.GetSetting(ctx, "gen_chat_language"); err == nil && val != "" {
		cfg.ChatLanguage = val
	} else if cfg.Language != "" {
		cfg.ChatLanguage = cfg.Language
	}
	if val, err := s.repo.GetSetting(ctx, "gen_doc_language"); err == nil && val != "" {
		cfg.DocLanguage = val
	}
	if val, err := s.repo.GetSetting(ctx, "gen_auto_save_draft"); err == nil {
		cfg.AutoSaveDraft = (val == "true" || val == "1")
	}
	if val, err := s.repo.GetSetting(ctx, "gen_default_doc_depth"); err == nil && val != "" {
		cfg.DefaultDocDepth = val
	}
	if val, err := s.repo.GetSetting(ctx, "gen_proactive_clarification"); err == nil {
		cfg.ProactiveClarification = (val == "true" || val == "1")
	}
	if val, err := s.repo.GetSetting(ctx, "gen_desktop_notifications"); err == nil {
		cfg.DesktopNotifications = (val == "true" || val == "1")
	}

	return cfg, nil
}

func (s *ProviderService) SaveGeneralSettings(cfg domain.GeneralSettings) error {
	if s.repo == nil {
		return fmt.Errorf("repository not available")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	_ = s.repo.SetSetting(ctx, "gen_theme", cfg.Theme)
	_ = s.repo.SetSetting(ctx, "gen_font_size", cfg.FontSize)
	_ = s.repo.SetSetting(ctx, "gen_animations", fmt.Sprintf("%t", cfg.Animations))
	_ = s.repo.SetSetting(ctx, "gen_language", cfg.Language)
	_ = s.repo.SetSetting(ctx, "gen_chat_language", cfg.ChatLanguage)
	_ = s.repo.SetSetting(ctx, "gen_doc_language", cfg.DocLanguage)
	_ = s.repo.SetSetting(ctx, "gen_auto_save_draft", fmt.Sprintf("%t", cfg.AutoSaveDraft))
	_ = s.repo.SetSetting(ctx, "gen_default_doc_depth", cfg.DefaultDocDepth)
	_ = s.repo.SetSetting(ctx, "gen_proactive_clarification", fmt.Sprintf("%t", cfg.ProactiveClarification))
	_ = s.repo.SetSetting(ctx, "gen_desktop_notifications", fmt.Sprintf("%t", cfg.DesktopNotifications))

	return nil
}

func (s *ProviderService) OpenWorkspaceInExplorer() error {
	dir := s.workspaceDir
	if dir == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return err
		}
		dir = filepath.Join(home, "AI-Requirements-Studio")
	}
	_ = os.MkdirAll(dir, 0755)

	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("explorer", dir)
	} else if runtime.GOOS == "darwin" {
		cmd = exec.Command("open", dir)
	} else {
		cmd = exec.Command("xdg-open", dir)
	}
	return cmd.Start()
}
