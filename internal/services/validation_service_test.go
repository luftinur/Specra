package services

import (
	"context"
	"testing"
	"time"

	"ai-requirements-studio/internal/domain"
	"ai-requirements-studio/internal/storage"
)

func TestValidationService_TraceabilityAndImpact(t *testing.T) {
	db, cleanup := setupServiceTestDB(t)
	defer cleanup()

	ctx := context.Background()
	projRepo := storage.NewProjectRepository(db)
	reqRepo := storage.NewRequirementRepository(db)
	convRepo := storage.NewConversationRepository(db)
	docRepo := storage.NewDocumentRepository(db)
	valRepo := storage.NewValidationRepository(db)

	svc := NewValidationService(valRepo, docRepo, reqRepo, convRepo)

	p := &domain.Project{ID: "proj-val-test", Name: "Validation Test"}
	_ = projRepo.Create(ctx, p)

	// Create Requirements
	_ = reqRepo.Create(ctx, &domain.Requirement{
		ID:             "r-1",
		ProjectID:      p.ID,
		RequirementKey: "REQ-001",
		Title:          "QRIS Payment",
		Description:    "Support instant QRIS barcode scan",
		Status:         domain.RequirementStatusApproved,
	})
	_ = reqRepo.Create(ctx, &domain.Requirement{
		ID:             "r-2",
		ProjectID:      p.ID,
		RequirementKey: "REQ-002",
		Title:          "Fast Reporting",
		Description:    "Report must be fast and seamless",
		Status:         domain.RequirementStatusDraft,
	})

	// Create PRD & SRS Documents
	prdDoc, _ := docRepo.GetOrCreate(ctx, p.ID, domain.DocTypePRD)
	_, _ = docRepo.AddVersion(ctx, prdDoc.ID, "# PRD Content\nREQ-001 and REQ-002 included.", nil)

	srsDoc, _ := docRepo.GetOrCreate(ctx, p.ID, domain.DocTypeSRS)
	// Notice: SRS only references REQ-001! REQ-002 is an orphan requirement!
	_, _ = docRepo.AddVersion(ctx, srsDoc.ID, "# SRS Content\nImplements REQ-001 with Payment Gateway API.", nil)

	// 1. Run Validation
	findings, err := svc.RunValidation(p.ID)
	if err != nil {
		t.Fatalf("failed to run validation: %v", err)
	}
	if len(findings) == 0 {
		t.Errorf("expected validation findings, got 0")
	}

	// Verify orphan requirement finding for REQ-002
	foundOrphan := false
	foundAmbig := false
	for _, f := range findings {
		if f.FindingType == "orphan_requirement" && *f.RequirementID == "r-2" {
			foundOrphan = true
		}
		if f.FindingType == "ambiguous_requirement" && *f.RequirementID == "r-2" {
			foundAmbig = true
		}
	}
	if !foundOrphan {
		t.Errorf("expected orphan requirement finding for REQ-002")
	}
	if !foundAmbig {
		t.Errorf("expected ambiguous requirement finding for 'fast' in REQ-002")
	}

	// 2. Traceability Matrix
	matrix, err := svc.GetTraceabilityMatrix(p.ID)
	if err != nil {
		t.Fatalf("failed to get traceability matrix: %v", err)
	}
	if len(matrix) != 2 {
		t.Errorf("expected 2 items in matrix, got %d", len(matrix))
	}
	if matrix[0]["covered_in_srs"] != true || matrix[1]["covered_in_srs"] != false {
		t.Errorf("expected REQ-001 to be covered and REQ-002 to be orphan, got: %+v", matrix)
	}

	// 3. Change Impact: Modify PRD after SRS was created -> marks SRS as outdated
	time.Sleep(10 * time.Millisecond) // ensure newer timestamp
	_, _ = docRepo.AddVersion(ctx, prdDoc.ID, "# PRD Content Updated", nil)

	impact, err := svc.CheckChangeImpact(p.ID)
	if err != nil {
		t.Fatalf("failed to check impact: %v", err)
	}
	if impact["srs_outdated"] != true {
		t.Errorf("expected SRS to be marked outdated after PRD modification")
	}

	updatedSRS, _ := docRepo.GetOrCreate(ctx, p.ID, domain.DocTypeSRS)
	if updatedSRS.Status != domain.DocStatusOutdated {
		t.Errorf("expected SRS status to be 'outdated', got %s", updatedSRS.Status)
	}

	// 4. Regenerate SRS: Newer SRS version clears outdated status back to draft
	time.Sleep(10 * time.Millisecond) // ensure newer timestamp than PRD
	_, _ = docRepo.AddVersion(ctx, srsDoc.ID, "# SRS Content Regenerated v2", nil)
	_ = docRepo.UpdateDocumentStatus(ctx, srsDoc.ID, domain.DocStatusDraft)

	impact2, err := svc.CheckChangeImpact(p.ID)
	if err != nil {
		t.Fatalf("failed to check impact after SRS regen: %v", err)
	}
	if impact2["srs_outdated"] != false {
		t.Errorf("expected SRS to no longer be outdated after regeneration")
	}

	healedSRS, _ := docRepo.GetOrCreate(ctx, p.ID, domain.DocTypeSRS)
	if healedSRS.Status == domain.DocStatusOutdated {
		t.Errorf("expected SRS status to be healed from outdated, got %s", healedSRS.Status)
	}
}
