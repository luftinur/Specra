package main_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"ai-requirements-studio/internal/ai"
	"ai-requirements-studio/internal/domain"
	"ai-requirements-studio/internal/services"
	"ai-requirements-studio/internal/storage"
)

type mockE2EAIProvider struct {
	id string
}

func (m *mockE2EAIProvider) ID() string                          { return m.id }
func (m *mockE2EAIProvider) Name() string                        { return "Mock E2E Provider: " + m.id }
func (m *mockE2EAIProvider) Type() domain.ProviderType           { return domain.ProviderCLI }
func (m *mockE2EAIProvider) CheckAvailability(ctx context.Context) error { return nil }
func (m *mockE2EAIProvider) CheckAuthentication(ctx context.Context) error { return nil }
func (m *mockE2EAIProvider) Generate(ctx context.Context, req ai.GenerateRequest) (*ai.GenerateResponse, error) {
	if req.Role == "Product Analyst" && req.Prompt[0:4] == "Role" {
		// Discovery prompt response
		rawJSON := `{
			"reply": "E2E: Analyzed user brief. Extracted core checkout requirements.",
			"role": "Product Analyst",
			"requirements": [
				{
					"key": "REQ-001",
					"category": "functional",
					"title": "QRIS Checkout",
					"description": "Provide dynamic QRIS barcode for instant checkout",
					"priority": "Must Have",
					"confidence": "high"
				}
			],
			"clarifications": [
				{"question": "Do you need split payment?"}
			],
			"assumptions": [
				{"description": "Merchant holds a bank account"}
			]
		}`
		return &ai.GenerateResponse{Content: rawJSON, ProviderID: m.id}, nil
	}

	if req.Role == "Product Analyst" {
		// Full PRD generation
		var prdText string
		for i, sec := range ai.PRDSections {
			prdText += "## " + string(rune('1'+i)) + ". " + sec + "\nSection content for " + sec + " referencing REQ-001.\n\n"
		}
		return &ai.GenerateResponse{Content: prdText, ProviderID: m.id}, nil
	}

	if req.Role == "System Analyst" {
		// Full SRS generation
		var srsText string
		for i, sec := range ai.SRSSections {
			srsText += "## " + string(rune('1'+i)) + ". " + sec + "\nTechnical specifications covering REQ-001.\n\n"
		}
		return &ai.GenerateResponse{Content: srsText, ProviderID: m.id}, nil
	}

	return &ai.GenerateResponse{Content: "Standard response", ProviderID: m.id}, nil
}

// TestEndToEndScenarios executes all 4 formal SRS Section 15.4 scenarios in sequence
func TestEndToEndScenarios(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "e2e_req_studio_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	dbPath := filepath.Join(tmpDir, "app.db")
	db, err := storage.Open(dbPath)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	defer db.Close()

	wm, err := storage.NewWorkspaceManager(tmpDir)
	if err != nil {
		t.Fatalf("failed to create workspace manager: %v", err)
	}

	// Repositories
	projRepo := storage.NewProjectRepository(db)
	convRepo := storage.NewConversationRepository(db)
	reqRepo := storage.NewRequirementRepository(db)
	docRepo := storage.NewDocumentRepository(db)
	valRepo := storage.NewValidationRepository(db)
	providerRepo := storage.NewProviderRepository(db)

	// AI Orchestrator & Providers
	orch := ai.NewOrchestrator(providerRepo)
	providerA := &mockE2EAIProvider{id: "provider-a"}
	providerB := &mockE2EAIProvider{id: "provider-b"}
	orch.RegisterProvider(providerA)
	orch.RegisterProvider(providerB)

	// Services
	projService := services.NewProjectService(projRepo, wm)
	convService := services.NewConversationService(convRepo, reqRepo, orch)
	reqService := services.NewRequirementService(reqRepo, convRepo)
	docService := services.NewDocumentService(docRepo, projRepo, reqRepo, convRepo, wm, orch)
	valService := services.NewValidationService(valRepo, docRepo, reqRepo, convRepo)

	// -------------------------------------------------------------------------
	// SCENARIO A: Project to PRD
	// 1. Create project
	// 2. Submit brief
	// 3. Analyze requirements
	// 4. Answer clarification questions
	// 5. Review requirements
	// 6. Generate PRD
	// 7. Approve PRD
	// 8. Export Markdown
	// -------------------------------------------------------------------------
	t.Log("=== Running Scenario A: Project to PRD ===")
	project, err := projService.CreateProject("E2E Book Store", "An online store for second-hand books")
	if err != nil {
		t.Fatalf("Scenario A: failed to create project: %v", err)
	}

	session, err := convService.GetSession(project.ID)
	if err != nil {
		t.Fatalf("Scenario A: failed to get session: %v", err)
	}

	// Submit brief
	aiMsg, err := convService.SendMessage(session.ID, project.ID, "Saya ingin membuat toko buku dengan fitur checkout QRIS")
	if err != nil {
		t.Fatalf("Scenario A: failed to send brief: %v", err)
	}
	if aiMsg.Role != domain.RoleAssistant {
		t.Errorf("Scenario A: expected assistant role, got %s", aiMsg.Role)
	}

	// Verify extracted requirement
	reqs, _ := reqService.ListRequirements(project.ID)
	if len(reqs) == 0 {
		t.Fatalf("Scenario A: expected requirements extracted, got 0")
	}
	if reqs[0].RequirementKey != "REQ-001" {
		t.Errorf("Scenario A: expected REQ-001, got %s", reqs[0].RequirementKey)
	}

	// Answer clarification
	clars, _ := convService.ListClarifications(project.ID)
	if len(clars) > 0 {
		_ = reqService.AnswerClarification(clars[0].ID, "No split payment needed")
	}

	// Approve requirement
	_ = reqService.ApproveRequirement(reqs[0].ID)

	// Generate PRD
	prdVer, err := docService.GeneratePRD(project.ID)
	if err != nil {
		t.Fatalf("Scenario A: failed to generate PRD: %v", err)
	}

	// Approve PRD
	if err := docService.ApprovePRD(project.ID, prdVer.ID); err != nil {
		t.Fatalf("Scenario A: failed to approve PRD: %v", err)
	}

	// Export PRD
	exportPRDPath := filepath.Join(tmpDir, "exports", "PRD_Export.md")
	_ = os.MkdirAll(filepath.Dir(exportPRDPath), 0755)
	if err := docService.ExportDocument(project.ID, "prd", exportPRDPath); err != nil {
		t.Fatalf("Scenario A: failed to export PRD: %v", err)
	}
	if _, err := os.Stat(exportPRDPath); os.IsNotExist(err) {
		t.Errorf("Scenario A: exported PRD file does not exist")
	}

	// -------------------------------------------------------------------------
	// SCENARIO B: PRD to SRS
	// 1. Load approved PRD
	// 2. Generate SRS
	// 3. Validate consistency
	// 4. Review traceability
	// 5. Approve SRS
	// 6. Export Markdown
	// -------------------------------------------------------------------------
	t.Log("=== Running Scenario B: PRD to SRS ===")
	srsVer, err := docService.GenerateSRS(project.ID)
	if err != nil {
		t.Fatalf("Scenario B: failed to generate SRS from approved PRD: %v", err)
	}
	if srsVer.VersionNumber != 1 {
		t.Errorf("Scenario B: expected SRS version 1, got %d", srsVer.VersionNumber)
	}

	// Traceability Matrix check
	matrix, err := valService.GetTraceabilityMatrix(project.ID)
	if err != nil {
		t.Fatalf("Scenario B: failed to get matrix: %v", err)
	}
	if len(matrix) == 0 || matrix[0]["covered_in_srs"] != true {
		t.Errorf("Scenario B: expected REQ-001 covered in SRS: %+v", matrix)
	}

	// Approve SRS
	if err := docService.ApproveSRS(project.ID, srsVer.ID); err != nil {
		t.Fatalf("Scenario B: failed to approve SRS: %v", err)
	}

	// Export SRS
	exportSRSPath := filepath.Join(tmpDir, "exports", "SRS_Export.md")
	if err := docService.ExportDocument(project.ID, "srs", exportSRSPath); err != nil {
		t.Fatalf("Scenario B: failed to export SRS: %v", err)
	}
	if _, err := os.Stat(exportSRSPath); os.IsNotExist(err) {
		t.Errorf("Scenario B: exported SRS file does not exist")
	}

	// -------------------------------------------------------------------------
	// SCENARIO C: Provider Switching
	// 1. Project was active with Provider A
	// 2. Switch to Provider B
	// 3. Confirm all project requirements, approved statuses remain unchanged
	// -------------------------------------------------------------------------
	t.Log("=== Running Scenario C: Provider Switching ===")
	if err := orch.SetActiveProvider("provider-b"); err != nil {
		t.Fatalf("Scenario C: failed to switch provider: %v", err)
	}
	activeProv, _ := orch.GetActiveProvider()
	if activeProv.ID() != "provider-b" {
		t.Fatalf("Scenario C: active provider is not provider-b")
	}

	// Verify project integrity after switch
	persistedReqs, _ := reqService.ListRequirements(project.ID)
	if len(persistedReqs) != len(reqs) || persistedReqs[0].Status != domain.RequirementStatusApproved {
		t.Errorf("Scenario C: requirement data corrupted after provider switch!")
	}

	// -------------------------------------------------------------------------
	// SCENARIO D: PRD Change Impact
	// 1. PRD was approved and SRS was generated
	// 2. PRD is modified (simulating requirement changes)
	// 3. Change impact detection flags SRS as OUTDATED
	// 4. Re-validation verifies the alert
	// -------------------------------------------------------------------------
	t.Log("=== Running Scenario D: PRD Change Impact ===")
	time.Sleep(15 * time.Millisecond) // Ensure newer timestamp
	newPRDVer, err := docService.SaveManualEdit(project.ID, "prd", "# PRD v2 Modified Content\nAdded new policy.")
	if err != nil {
		t.Fatalf("Scenario D: failed to edit PRD: %v", err)
	}
	if newPRDVer.VersionNumber != 2 {
		t.Errorf("Scenario D: expected PRD version 2, got %d", newPRDVer.VersionNumber)
	}

	impact, err := valService.CheckChangeImpact(project.ID)
	if err != nil {
		t.Fatalf("Scenario D: failed to check impact: %v", err)
	}
	if impact["srs_outdated"] != true {
		t.Errorf("Scenario D: expected SRS to be marked outdated after PRD modification")
	}

	// Run full validation to verify outdated_srs finding
	findings, err := valService.RunValidation(project.ID)
	if err != nil {
		t.Fatalf("Scenario D: failed to run validation: %v", err)
	}
	foundOutdatedFinding := false
	for _, f := range findings {
		if f.FindingType == "outdated_srs" {
			foundOutdatedFinding = true
			break
		}
	}
	if !foundOutdatedFinding {
		t.Errorf("Scenario D: validation run did not report outdated_srs finding")
	}

	t.Log("=== All 4 End-to-End Scenarios Passed Successfully! ===")
}
