package services

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"ai-requirements-studio/internal/ai"
	"ai-requirements-studio/internal/domain"
	"ai-requirements-studio/internal/storage"
)

type mockDocProvider struct{}

func (m *mockDocProvider) ID() string { return "mock-doc-provider" }
func (m *mockDocProvider) Name() string { return "Mock Doc Provider" }
func (m *mockDocProvider) Type() domain.ProviderType { return domain.ProviderCLI }
func (m *mockDocProvider) CheckAvailability(ctx context.Context) error { return nil }
func (m *mockDocProvider) CheckAuthentication(ctx context.Context) error { return nil }
func (m *mockDocProvider) Generate(ctx context.Context, req ai.GenerateRequest) (*ai.GenerateResponse, error) {
	content := "## 1. Executive Summary\nSummary here\n\n## 2. Product Vision\nVision here"
	if req.Role == "System Analyst" {
		content = "## 1. Introduction\nIntro here\n\n## 2. System Overview\nOverview here"
	}
	return &ai.GenerateResponse{
		Content:    content,
		ProviderID: m.ID(),
	}, nil
}

func TestDocumentService_PRD_SRS_ApprovalGating(t *testing.T) {
	db, cleanup := setupServiceTestDB(t)
	defer cleanup()

	tmpDir, err := os.MkdirTemp("", "doc_service_workspace_*")
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

	svc := NewDocumentService(docRepo, projRepo, reqRepo, convRepo, wm, orch)

	ctx := context.Background()
	p := &domain.Project{ID: "proj-gating-test", Name: "Gating Project"}
	_ = projRepo.Create(ctx, p)
	_ = wm.InitProjectWorkspace(p.ID)

	// 1. Attempt GenerateSRS before PRD exists -> MUST FAIL
	_, err = svc.GenerateSRS(p.ID)
	if err == nil {
		t.Fatalf("expected error generating SRS before PRD is approved, got nil")
	}

	// 2. Generate PRD Draft
	prdVer, err := svc.GeneratePRD(p.ID)
	if err != nil {
		t.Fatalf("failed to generate PRD: %v", err)
	}
	if prdVer.VersionNumber != 1 {
		t.Errorf("expected version 1, got %d", prdVer.VersionNumber)
	}

	// 3. Attempt GenerateSRS while PRD is in 'draft' -> MUST FAIL
	_, err = svc.GenerateSRS(p.ID)
	if err == nil {
		t.Fatalf("expected error generating SRS while PRD is draft, got nil")
	}

	// 4. Approve PRD
	if err := svc.ApprovePRD(p.ID, prdVer.ID); err != nil {
		t.Fatalf("failed to approve PRD: %v", err)
	}

	// 5. Generate SRS from APPROVED PRD -> MUST SUCCEED
	srsVer, err := svc.GenerateSRS(p.ID)
	if err != nil {
		t.Fatalf("expected successful SRS generation after PRD approval, got: %v", err)
	}
	if srsVer.VersionNumber != 1 {
		t.Errorf("expected SRS version 1, got %d", srsVer.VersionNumber)
	}

	// 6. Regenerate PRD Section
	newPrdVer, err := svc.RegeneratePRDSection(p.ID, 1)
	if err != nil {
		t.Fatalf("failed to regenerate PRD section: %v", err)
	}
	if newPrdVer.VersionNumber != 2 {
		t.Errorf("expected PRD version 2, got %d", newPrdVer.VersionNumber)
	}

	// 7. Test Export Single Document
	exportTarget := filepath.Join(tmpDir, "exported_prd.md")
	if err := svc.ExportDocument(p.ID, "prd", exportTarget); err != nil {
		t.Fatalf("failed to export document: %v", err)
	}
	exportedData, err := os.ReadFile(exportTarget)
	if err != nil || len(exportedData) == 0 {
		t.Errorf("expected exported file to have content")
	}

	// 8. Test Export All Documents
	allExportDir := filepath.Join(tmpDir, "all_exports")
	results, err := svc.ExportAllDocuments(p.ID, allExportDir)
	if err != nil {
		t.Fatalf("failed to export all documents: %v", err)
	}
	if len(results) < 2 { // At least PRD and SRS generated
		t.Errorf("expected at least 2 documents exported, got %d", len(results))
	}
	if _, err := os.Stat(filepath.Join(allExportDir, "PRD.md")); os.IsNotExist(err) {
		t.Errorf("expected PRD.md to be exported in all_exports directory")
	}
	if _, err := os.Stat(filepath.Join(allExportDir, "SRS.md")); os.IsNotExist(err) {
		t.Errorf("expected SRS.md to be exported in all_exports directory")
	}
}
