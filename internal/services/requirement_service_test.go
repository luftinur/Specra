package services

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"ai-requirements-studio/internal/domain"
	"ai-requirements-studio/internal/storage"
)

func setupServiceTestDB(t *testing.T) (*storage.DB, func()) {
	tmpDir, err := os.MkdirTemp("", "req_service_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}

	dbPath := filepath.Join(tmpDir, "test.db")
	db, err := storage.Open(dbPath)
	if err != nil {
		os.RemoveAll(tmpDir)
		t.Fatalf("failed to open test db: %v", err)
	}

	cleanup := func() {
		db.Close()
		os.RemoveAll(tmpDir)
	}
	return db, cleanup
}

func TestRequirementService(t *testing.T) {
	db, cleanup := setupServiceTestDB(t)
	defer cleanup()

	pRepo := storage.NewProjectRepository(db)
	rRepo := storage.NewRequirementRepository(db)
	cRepo := storage.NewConversationRepository(db)
	svc := NewRequirementService(rRepo, cRepo)

	ctx := context.Background()
	_ = pRepo.Create(ctx, &domain.Project{ID: "p-svc", Name: "Service Test"})

	req := &domain.Requirement{
		ID:             "req-1",
		ProjectID:      "p-svc",
		RequirementKey: "REQ-001",
		Title:          "Database Backup",
		Description:    "Daily automated backup",
		Priority:       domain.PriorityMustHave,
		Status:         domain.RequirementStatusDraft,
	}
	_ = rRepo.Create(ctx, req)

	// Test Approve
	if err := svc.ApproveRequirement("req-1"); err != nil {
		t.Fatalf("failed to approve: %v", err)
	}
	r, _ := rRepo.Get(ctx, "req-1")
	if r.Status != domain.RequirementStatusApproved {
		t.Errorf("expected approved, got %s", r.Status)
	}

	// Test Priority update
	if err := svc.UpdatePriority("req-1", "Could Have"); err != nil {
		t.Fatalf("failed to update priority: %v", err)
	}
	r2, _ := rRepo.Get(ctx, "req-1")
	if r2.Priority != domain.PriorityCouldHave {
		t.Errorf("expected Could Have, got %s", r2.Priority)
	}

	// Test Reject
	if err := svc.RejectRequirement("req-1"); err != nil {
		t.Fatalf("failed to reject: %v", err)
	}
	r3, _ := rRepo.Get(ctx, "req-1")
	if r3.Status != domain.RequirementStatusRejected {
		t.Errorf("expected rejected, got %s", r3.Status)
	}

	// Test Clarification Answering
	_ = cRepo.AddClarification(ctx, &domain.Clarification{
		ID:        "clar-1",
		ProjectID: "p-svc",
		Question:  "What is the retention period?",
		Status:    "open",
	})
	if err := svc.AnswerClarification("clar-1", "30 days retention"); err != nil {
		t.Fatalf("failed to answer clarification: %v", err)
	}
	clars, _ := cRepo.ListClarifications(ctx, "p-svc")
	if len(clars) != 1 || clars[0].Status != "answered" || *clars[0].Answer != "30 days retention" {
		t.Errorf("unexpected clarifications: %+v", clars)
	}

	// Test Assumption Confirmation & Correction
	_ = cRepo.AddAssumption(ctx, &domain.Assumption{
		ID:          "asmp-1",
		ProjectID:   "p-svc",
		Description: "Assumed payment gateway is Stripe",
		Status:      "unconfirmed",
	})
	if err := svc.UpdateAssumptionStatus("asmp-1", "confirmed"); err != nil {
		t.Fatalf("failed to confirm assumption: %v", err)
	}
	asmps, _ := cRepo.ListAssumptions(ctx, "p-svc")
	if len(asmps) != 1 || asmps[0].Status != "confirmed" {
		t.Fatalf("expected confirmed assumption, got %+v", asmps)
	}

	// Test Assumption Correction
	if err := svc.CorrectAssumption("asmp-1", "Payment uses Midtrans QRIS and GoPay"); err != nil {
		t.Fatalf("failed to correct assumption: %v", err)
	}
	asmps2, _ := cRepo.ListAssumptions(ctx, "p-svc")
	if len(asmps2) != 1 || asmps2[0].Description != "Payment uses Midtrans QRIS and GoPay" || asmps2[0].Status != "confirmed" {
		t.Fatalf("expected corrected assumption text, got %+v", asmps2)
	}
}
