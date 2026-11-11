package storage

import (
	"context"
	"testing"

	"ai-requirements-studio/internal/domain"
)

func TestRequirementRepository(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()
	pRepo := NewProjectRepository(db)
	rRepo := NewRequirementRepository(db)

	p := &domain.Project{ID: "proj-req-test", Name: "Req Project"}
	if err := pRepo.Create(ctx, p); err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	// 1. Next Key
	k1, err := rRepo.NextKey(ctx, "proj-req-test", "REQ")
	if err != nil {
		t.Fatalf("failed to get next key: %v", err)
	}
	if k1 != "REQ-001" {
		t.Errorf("expected REQ-001, got %s", k1)
	}

	// 2. Create Requirement
	req1 := &domain.Requirement{
		ID:             "r-101",
		ProjectID:      "proj-req-test",
		RequirementKey: "REQ-001",
		Category:       domain.CategoryFunctional,
		Title:          "User Authentication",
		Description:    "Support login via email and password",
		Priority:       domain.PriorityMustHave,
		Status:         domain.RequirementStatusDraft,
	}

	if err := rRepo.Create(ctx, req1); err != nil {
		t.Fatalf("failed to create requirement: %v", err)
	}

	// 3. Get
	fetched, err := rRepo.Get(ctx, "r-101")
	if err != nil {
		t.Fatalf("failed to get requirement: %v", err)
	}
	if fetched.Title != "User Authentication" || fetched.Priority != domain.PriorityMustHave {
		t.Errorf("mismatched fetched requirement: %+v", fetched)
	}

	// 4. Update Status & Priority
	if err := rRepo.UpdateStatus(ctx, "r-101", domain.RequirementStatusApproved); err != nil {
		t.Fatalf("failed to update status: %v", err)
	}
	if err := rRepo.UpdatePriority(ctx, "r-101", domain.PriorityShouldHave); err != nil {
		t.Fatalf("failed to update priority: %v", err)
	}

	fetched2, _ := rRepo.Get(ctx, "r-101")
	if fetched2.Status != domain.RequirementStatusApproved || fetched2.Priority != domain.PriorityShouldHave {
		t.Errorf("expected approved and Should Have, got status=%s, priority=%s", fetched2.Status, fetched2.Priority)
	}

	// 5. List By Project
	list, err := rRepo.ListByProject(ctx, "proj-req-test")
	if err != nil {
		t.Fatalf("failed to list requirements: %v", err)
	}
	if len(list) != 1 {
		t.Errorf("expected 1 requirement, got %d", len(list))
	}
}
