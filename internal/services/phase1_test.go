package services

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"ai-requirements-studio/internal/ai"
	"ai-requirements-studio/internal/ai/adapters/kiro"
	"ai-requirements-studio/internal/domain"
	"ai-requirements-studio/internal/storage"
)

type failProvider struct{}

func (f *failProvider) ID() string                                { return "fail-provider" }
func (f *failProvider) Name() string                              { return "Fail Provider" }
func (f *failProvider) Type() domain.ProviderType                 { return domain.ProviderCLI }
func (f *failProvider) CheckAvailability(ctx context.Context) error { return nil }
func (f *failProvider) CheckAuthentication(ctx context.Context) error { return nil }
func (f *failProvider) Generate(ctx context.Context, req ai.GenerateRequest) (*ai.GenerateResponse, error) {
	return nil, errors.New("simulated AI engine failure: connection refused")
}

func TestDesignDocumentLifecycle(t *testing.T) {
	db, cleanup := setupServiceTestDB(t)
	defer cleanup()

	tmpDir, err := os.MkdirTemp("", "design_doc_workspace_*")
	if err != nil {
		t.Fatalf("failed to create temp workspace: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	wm, _ := storage.NewWorkspaceManager(tmpDir)
	docRepo := storage.NewDocumentRepository(db)
	projRepo := storage.NewProjectRepository(db)
	reqRepo := storage.NewRequirementRepository(db)
	convRepo := storage.NewConversationRepository(db)

	orch := ai.NewOrchestrator(nil)
	orch.RegisterProvider(&mockDocProvider{})

	docService := NewDocumentService(docRepo, projRepo, reqRepo, convRepo, wm, orch)

	ctx := context.Background()
	projectID := "proj-design-test"
	_ = projRepo.Create(ctx, &domain.Project{
		ID:          projectID,
		Name:        "Design Studio Test",
		Description: "Testing Design System generation",
		Status:      domain.ProjectStatusActive,
	})
	_ = wm.InitProjectWorkspace(projectID)

	// 1. Gating Test: GenerateDesign must fail before PRD is approved
	_, err = docService.GenerateDesign(projectID)
	if err == nil {
		t.Fatal("expected GenerateDesign to fail when PRD is not approved, but it succeeded")
	}

	// 2. Generate and approve PRD
	prdVer, err := docService.GeneratePRD(projectID)
	if err != nil {
		t.Fatalf("failed to generate PRD: %v", err)
	}
	if err := docService.ApprovePRD(projectID, prdVer.ID); err != nil {
		t.Fatalf("failed to approve PRD: %v", err)
	}

	// 3. Generate Design System Draft
	designVer, err := docService.GenerateDesign(projectID)
	if err != nil {
		t.Fatalf("expected GenerateDesign to succeed after PRD approved, got error: %v", err)
	}
	if designVer.VersionNumber != 1 {
		t.Fatalf("expected version number 1, got %d", designVer.VersionNumber)
	}

	// 4. Verify design.md exists in workspace
	designFile := filepath.Join(wm.ProjectDir(projectID), "design.md")
	if _, err := os.Stat(designFile); os.IsNotExist(err) {
		t.Fatalf("expected design.md to be written to workspace, but file not found")
	}

	// 5. Section Regeneration for Design System
	regenVer, err := docService.RegenerateDesignSection(projectID, 3)
	if err != nil {
		t.Fatalf("failed to regenerate Design section 3: %v", err)
	}
	if regenVer.VersionNumber != 2 {
		t.Fatalf("expected version number 2 after section regeneration, got %d", regenVer.VersionNumber)
	}

	// 6. Approve Design System
	if err := docService.ApproveDesign(projectID, regenVer.ID); err != nil {
		t.Fatalf("failed to approve Design System: %v", err)
	}

	details, err := docService.GetDocumentDetails(projectID, "design")
	if err != nil {
		t.Fatalf("failed to get design details: %v", err)
	}
	doc := details["document"].(*domain.Document)
	if doc.Status != domain.DocStatusApproved {
		t.Fatalf("expected doc status 'approved', got %s", doc.Status)
	}
}

func TestArchitectureDocumentLifecycle(t *testing.T) {
	db, cleanup := setupServiceTestDB(t)
	defer cleanup()

	tmpDir, err := os.MkdirTemp("", "arch_workspace_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	wm, _ := storage.NewWorkspaceManager(tmpDir)
	docRepo := storage.NewDocumentRepository(db)
	projRepo := storage.NewProjectRepository(db)
	reqRepo := storage.NewRequirementRepository(db)
	convRepo := storage.NewConversationRepository(db)

	orch := ai.NewOrchestrator(nil)
	orch.RegisterProvider(&mockDocProvider{})

	docService := NewDocumentService(docRepo, projRepo, reqRepo, convRepo, wm, orch)

	ctx := context.Background()
	projectID := "arch-proj-1"
	_ = projRepo.Create(ctx, &domain.Project{
		ID:          projectID,
		Name:        "Architecture Studio Test",
		Description: "Testing Software Architecture generation",
		Status:      domain.ProjectStatusActive,
	})
	_ = wm.InitProjectWorkspace(projectID)

	// 1. Gating Test: GenerateArchitecture must fail before PRD is approved
	_, err = docService.GenerateArchitecture(projectID)
	if err == nil {
		t.Fatal("expected GenerateArchitecture to fail when PRD is not approved, but it succeeded")
	}

	// 2. Generate and approve PRD
	prdVer, err := docService.GeneratePRD(projectID)
	if err != nil {
		t.Fatalf("failed to generate PRD: %v", err)
	}
	if err := docService.ApprovePRD(projectID, prdVer.ID); err != nil {
		t.Fatalf("failed to approve PRD: %v", err)
	}

	// 3. Generate Architecture Draft
	archVer, err := docService.GenerateArchitecture(projectID)
	if err != nil {
		t.Fatalf("expected GenerateArchitecture to succeed after PRD approved, got error: %v", err)
	}
	if archVer.VersionNumber != 1 {
		t.Fatalf("expected version number 1, got %d", archVer.VersionNumber)
	}

	// 4. Verify architecture.md exists in workspace
	archFile := filepath.Join(wm.ProjectDir(projectID), "architecture.md")
	if _, err := os.Stat(archFile); os.IsNotExist(err) {
		t.Fatalf("expected architecture.md to be written to workspace, but file not found")
	}

	// 5. Section Regeneration for Architecture
	regenVer, err := docService.RegenerateArchitectureSection(projectID, 4)
	if err != nil {
		t.Fatalf("failed to regenerate Architecture section 4: %v", err)
	}
	if regenVer.VersionNumber != 2 {
		t.Fatalf("expected version number 2 after section regeneration, got %d", regenVer.VersionNumber)
	}

	// 6. Approve Architecture
	if err := docService.ApproveArchitecture(projectID, regenVer.ID); err != nil {
		t.Fatalf("failed to approve Architecture: %v", err)
	}

	details, err := docService.GetDocumentDetails(projectID, "architecture")
	if err != nil {
		t.Fatalf("failed to get architecture details: %v", err)
	}
	doc := details["document"].(*domain.Document)
	if doc.Status != domain.DocStatusApproved {
		t.Fatalf("expected doc status 'approved', got %s", doc.Status)
	}
}

func TestConversation_AttachmentAndZeroMockFailFast(t *testing.T) {
	db, cleanup := setupServiceTestDB(t)
	defer cleanup()

	tmpDir, err := os.MkdirTemp("", "conv_workspace_*")
	if err != nil {
		t.Fatalf("failed to create temp workspace: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	wm, _ := storage.NewWorkspaceManager(tmpDir)
	projRepo := storage.NewProjectRepository(db)
	convRepo := storage.NewConversationRepository(db)
	reqRepo := storage.NewRequirementRepository(db)
	provRepo := storage.NewProviderRepository(db)

	agentRegistry := ai.NewAgentRegistry(provRepo)

	projectID := "proj-conv-test"
	ctx := context.Background()
	_ = projRepo.Create(ctx, &domain.Project{
		ID:          projectID,
		Name:        "Conv Test Project",
		Description: "Testing attachment and zero mock fail-fast",
		Status:      domain.ProjectStatusActive,
	})
	_ = wm.InitProjectWorkspace(projectID)

	conv, err := convRepo.GetOrCreateForProject(ctx, projectID, "Main Discovery")
	if err != nil {
		t.Fatalf("failed to get or create conversation: %v", err)
	}

	// 1. Test Zero Mock Data & Fail-Fast: When provider fails, return real error!
	failOrch := ai.NewOrchestrator(nil)
	failOrch.RegisterProvider(&failProvider{})

	convService := NewConversationService(convRepo, reqRepo, failOrch)
	convService.SetWorkspace(wm)
	convService.SetAgentRegistry(agentRegistry)

	_, err = convService.SendMessage(conv.ID, projectID, "Hello AI, please mock something")
	if err == nil {
		t.Fatal("expected SendMessage to fail-fast on AI error, but it returned no error (possible mock fallback)")
	}

	// 2. Test Success Flow & Attachment Upload
	successOrch := ai.NewOrchestrator(nil)
	successOrch.RegisterProvider(&mockDocProvider{})

	convServiceSuccess := NewConversationService(convRepo, reqRepo, successOrch)
	convServiceSuccess.SetWorkspace(wm)
	convServiceSuccess.SetAgentRegistry(agentRegistry)

	filename := "draft_prd.md"
	fileContent := "# Draft Specifications\n- REQ: Real-time chat\n- REQ: Multi-agent switcher"

	msg, err := convServiceSuccess.SubmitAttachment(conv.ID, projectID, filename, fileContent, "Please analyze draft", "prd-agent")
	if err != nil {
		t.Fatalf("failed to submit attachment: %v", err)
	}
	if msg == nil || msg.Role != domain.RoleAssistant {
		t.Fatalf("expected assistant response message, got: %+v", msg)
	}

	// Verify attachment file saved on disk
	savedFiles, err := convServiceSuccess.ListAttachments(projectID)
	if err != nil {
		t.Fatalf("failed to list attachments: %v", err)
	}
	if len(savedFiles) != 1 || savedFiles[0] != filename {
		t.Fatalf("expected attachment %s, got %v", filename, savedFiles)
	}

	// 3. Test PostSystemEvent (Canvas to Chat Sync)
	sysMsg, err := convServiceSuccess.PostSystemEvent(conv.ID, projectID, "PRD Draft Created", "PRD Draft v1 has been generated with 20 sections.")
	if err != nil {
		t.Fatalf("failed to post system event: %v", err)
	}
	if sysMsg == nil || sysMsg.Role != domain.RoleAssistant {
		t.Fatalf("expected system event message, got: %+v", sysMsg)
	}
	msgs, err := convRepo.ListMessages(ctx, conv.ID)
	if err != nil || len(msgs) < 3 {
		t.Fatalf("expected persisted messages including system event, got %d msgs: %v", len(msgs), err)
	}
}

func TestAgentRegistry_PersonasAndMCP(t *testing.T) {
	db, cleanup := setupServiceTestDB(t)
	defer cleanup()

	provRepo := storage.NewProviderRepository(db)
	registry := ai.NewAgentRegistry(provRepo)

	// 1. Verify 4 Default Specialist Agents
	agents := registry.ListAgents()
	if len(agents) < 4 {
		t.Fatalf("expected at least 4 default specialist agents, got %d", len(agents))
	}

	paAgent, ok := registry.GetAgent("product-analyst")
	if !ok || paAgent.Name != "Product Analyst Agent" {
		t.Fatalf("expected Product Analyst Agent to exist in registry")
	}

	saAgent, ok := registry.GetAgent("system-analyst")
	if !ok || saAgent.Name != "System Analyst Agent" {
		t.Fatalf("expected System Analyst Agent to exist in registry")
	}

	archAgent, ok := registry.GetAgent("software-architect")
	if !ok || archAgent.Name != "Software Architect Agent" {
		t.Fatalf("expected Software Architect Agent to exist in registry")
	}

	uiAgent, ok := registry.GetAgent("ui-ux-agent")
	if !ok || uiAgent.Name != "UI/UX Agent" {
		t.Fatalf("expected UI/UX Agent to exist in registry")
	}

	// 2. Modify Agent Persona and verify persistence
	paAgent.SystemPrompt = "Custom Prompt: Focus on FinTech compliance."
	if err := registry.SaveAgent(paAgent); err != nil {
		t.Fatalf("failed to save agent config: %v", err)
	}

	// Reload registry from repo
	reloadedRegistry := ai.NewAgentRegistry(provRepo)
	updatedPA, _ := reloadedRegistry.GetAgent("product-analyst")
	if updatedPA.SystemPrompt != "Custom Prompt: Focus on FinTech compliance." {
		t.Fatalf("expected persisted custom system prompt, got: %s", updatedPA.SystemPrompt)
	}

	// 3. MCP Server Management & Scoping (Global vs Persona)
	globalMCP := domain.MCPServerConfig{
		ID:        "mcp-github",
		Name:      "GitHub MCP",
		Transport: "stdio",
		Endpoint:  "npx -y @modelcontextprotocol/server-github",
		Enabled:   true,
		Scope:     "global",
	}
	personaMCP := domain.MCPServerConfig{
		ID:             "mcp-figma",
		Name:           "Figma Tokens MCP",
		Transport:      "stdio",
		Endpoint:       "npx -y @modelcontextprotocol/server-figma",
		Enabled:        true,
		Scope:          "persona",
		AssignedAgents: []string{"ui-ux-agent"},
	}

	if err := registry.SaveMCPServer(globalMCP); err != nil {
		t.Fatalf("failed to save global MCP: %v", err)
	}
	if err := registry.SaveMCPServer(personaMCP); err != nil {
		t.Fatalf("failed to save persona MCP: %v", err)
	}

	// UI/UX Agent should see both Global and Assigned Figma MCP
	uiServers := registry.GetMCPServersForAgent("ui-ux-agent")
	if len(uiServers) != 2 {
		t.Fatalf("expected UI/UX Agent to have 2 accessible MCP servers, got %d", len(uiServers))
	}

	// Product Analyst should only see Global MCP
	paServers := registry.GetMCPServersForAgent("product-analyst")
	if len(paServers) != 1 || paServers[0].ID != "mcp-github" {
		t.Fatalf("expected Product Analyst to have only 1 global MCP server, got %+v", paServers)
	}

	// 4. Custom Skill Management CRUD
	customSkill := domain.SkillConfig{
		ID:          "fintech-compliance",
		Name:        "FinTech OJK & PCI-DSS Compliance",
		Description: "Regulasi standar pembayaran digital dan proteksi data finansial.",
		Prompt:      "Always enforce PCI-DSS tokenization and OJK reporting metrics.",
		Category:    "general",
		Custom:      true,
	}

	if err := registry.SaveSkill(customSkill); err != nil {
		t.Fatalf("failed to save custom skill: %v", err)
	}

	allSkills := registry.ListSkills()
	foundSkill := false
	for _, sk := range allSkills {
		if sk.ID == "fintech-compliance" {
			foundSkill = true
			break
		}
	}
	if !foundSkill {
		t.Fatalf("expected custom skill 'fintech-compliance' in skill catalog")
	}

	// Attach skill to software architect
	archAgent.Skills = append(archAgent.Skills, "fintech-compliance")
	_ = registry.SaveAgent(archAgent)

	archSkills := registry.GetSkillsForAgent("software-architect")
	foundArchSkill := false
	for _, sk := range archSkills {
		if sk.ID == "fintech-compliance" {
			foundArchSkill = true
			break
		}
	}
	if !foundArchSkill {
		t.Fatalf("expected custom skill to be resolved for Software Architect")
	}

	// 5. Concurrency Race & Deadlock Stress Test
	var wg sync.WaitGroup
	for i := 0; i < 30; i++ {
		wg.Add(3)
		idx := i
		go func() {
			defer wg.Done()
			_ = registry.SaveSkill(domain.SkillConfig{
				ID:       fmt.Sprintf("concurrent-skill-%d", idx),
				Name:     fmt.Sprintf("Skill %d", idx),
				Custom:   true,
				Category: "general",
			})
		}()
		go func() {
			defer wg.Done()
			_ = registry.GetSkillsForAgent("software-architect")
		}()
		go func() {
			defer wg.Done()
			_ = registry.DeleteSkill(fmt.Sprintf("concurrent-skill-%d", idx))
		}()
	}
	wg.Wait()

	// Cleanup
	_ = registry.DeleteMCPServer("mcp-github")
	_ = registry.DeleteMCPServer("mcp-figma")
	_ = registry.DeleteSkill("fintech-compliance")
}

func TestGeneralSettings_Persistence(t *testing.T) {
	db, cleanup := setupServiceTestDB(t)
	defer cleanup()

	provRepo := storage.NewProviderRepository(db)
	ps := NewProviderService(nil, provRepo, nil, nil, nil, nil)
	ps.SetWorkspaceDir("C:\\TestWorkspace\\AI-Requirements-Studio")

	// 1. Check default settings
	defaults, err := ps.GetGeneralSettings()
	if err != nil {
		t.Fatalf("failed to get default general settings: %v", err)
	}
	if defaults.Theme != "system" || defaults.FontSize != "standard" || defaults.Language != "id" || defaults.ChatLanguage != "id" || defaults.DocLanguage != "en" {
		t.Fatalf("unexpected defaults: %+v", defaults)
	}
	if defaults.WorkspacePath != "C:\\TestWorkspace\\AI-Requirements-Studio" {
		t.Fatalf("expected workspace path to match, got %s", defaults.WorkspacePath)
	}

	// 2. Save custom settings
	custom := domain.GeneralSettings{
		Theme:                  "dark",
		FontSize:               "comfort",
		Animations:             false,
		Language:               "en",
		ChatLanguage:           "id",
		DocLanguage:            "en",
		AutoSaveDraft:          true,
		AutoSaveIntervalMs:     2000,
		DefaultDocDepth:        "compact",
		ProactiveClarification: false,
		DesktopNotifications:   true,
		WorkspacePath:          defaults.WorkspacePath,
	}

	if err := ps.SaveGeneralSettings(custom); err != nil {
		t.Fatalf("failed to save general settings: %v", err)
	}

	// 3. Reload and verify persistence
	reloaded, err := ps.GetGeneralSettings()
	if err != nil {
		t.Fatalf("failed to reload general settings: %v", err)
	}
	if reloaded.Theme != "dark" || reloaded.FontSize != "comfort" || reloaded.Language != "en" || reloaded.ChatLanguage != "id" || reloaded.DocLanguage != "en" || reloaded.Animations != false || reloaded.ProactiveClarification != false {
		t.Fatalf("persisted settings mismatch: %+v", reloaded)
	}
}

func TestProviderService_KiroIntegration(t *testing.T) {
	db, cleanup := setupServiceTestDB(t)
	defer cleanup()

	provRepo := storage.NewProviderRepository(db)
	orch := ai.NewOrchestrator(provRepo)
	kiroAdapter := kiro.NewAdapter("kiro-cli", "", "")
	orch.RegisterProvider(kiroAdapter)

	ps := NewProviderService(orch, provRepo, nil, nil, nil, kiroAdapter)

	if err := ps.ConfigureKiro("claude-sonnet-4", ""); err != nil {
		t.Fatalf("ConfigureKiro failed: %v", err)
	}
	if err := ps.ConfigureProviders("kiro-cli", "", false); err != nil {
		t.Fatalf("ConfigureProviders with kiro-cli failed: %v", err)
	}

	status, err := ps.GetProviderStatus()
	if err != nil {
		t.Fatalf("GetProviderStatus failed: %v", err)
	}
	if status["primary_provider"] != "kiro-cli" {
		t.Fatalf("expected primary_provider kiro-cli, got %v", status["primary_provider"])
	}
	if status["kiro_model"] != "claude-sonnet-4" {
		t.Fatalf("expected kiro_model claude-sonnet-4, got %v", status["kiro_model"])
	}

	providers, ok := status["providers"].([]map[string]any)
	if !ok {
		t.Fatalf("expected providers slice, got %T", status["providers"])
	}
	foundKiro := false
	for _, p := range providers {
		if p["id"] == "kiro-cli" {
			foundKiro = true
			if p["model"] != "claude-sonnet-4" {
				t.Fatalf("expected kiro-cli model claude-sonnet-4, got %v", p["model"])
			}
		}
	}
	if !foundKiro {
		t.Fatal("kiro-cli missing from GetProviderStatus providers list")
	}

	diag, err := ps.RunDiagnostics()
	if err != nil {
		t.Fatalf("RunDiagnostics failed: %v", err)
	}
	if _, exists := diag["kiro_available"]; !exists {
		t.Fatal("expected kiro_available in RunDiagnostics output")
	}
}
