package storage

import (
	"context"
	"testing"

	"ai-requirements-studio/internal/domain"
)

func TestDocumentRepository(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()
	pRepo := NewProjectRepository(db)
	dRepo := NewDocumentRepository(db)

	p := &domain.Project{ID: "proj-doc-test", Name: "Document Project"}
	if err := pRepo.Create(ctx, p); err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	// 1. GetOrCreate PRD
	doc, err := dRepo.GetOrCreate(ctx, "proj-doc-test", domain.DocTypePRD)
	if err != nil {
		t.Fatalf("failed to get or create PRD: %v", err)
	}
	if doc.DocumentType != domain.DocTypePRD || doc.Status != domain.DocStatusDraft {
		t.Errorf("unexpected document: %+v", doc)
	}

	// 2. Add Version 1
	v1, err := dRepo.AddVersion(ctx, doc.ID, "# PRD v1 content", nil)
	if err != nil {
		t.Fatalf("failed to add v1: %v", err)
	}
	if v1.VersionNumber != 1 || v1.ContentHash == "" {
		t.Errorf("unexpected version 1: %+v", v1)
	}

	// 3. Add Version 2
	v2, err := dRepo.AddVersion(ctx, doc.ID, "# PRD v2 content", &v1.ID)
	if err != nil {
		t.Fatalf("failed to add v2: %v", err)
	}
	if v2.VersionNumber != 2 || *v2.SourceVersionID != v1.ID {
		t.Errorf("unexpected version 2: %+v", v2)
	}

	// 4. Get Current Version
	curr, err := dRepo.GetCurrentVersion(ctx, doc.ID)
	if err != nil {
		t.Fatalf("failed to get current version: %v", err)
	}
	if curr.ID != v2.ID {
		t.Errorf("expected current version to be v2, got %s", curr.ID)
	}

	// 5. Approve Version
	if err := dRepo.ApproveVersion(ctx, doc.ID, v2.ID); err != nil {
		t.Fatalf("failed to approve version: %v", err)
	}

	updatedDoc, _ := dRepo.GetOrCreate(ctx, "proj-doc-test", domain.DocTypePRD)
	if updatedDoc.Status != domain.DocStatusApproved {
		t.Errorf("expected approved document status, got %s", updatedDoc.Status)
	}
}
