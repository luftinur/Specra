package ai

import (
	"testing"

	"ai-requirements-studio/internal/domain"
)

func TestValidationEngine(t *testing.T) {
	ve := NewValidationEngine()

	// 1. Incomplete PRD
	incompletePRD := "## 1. Executive Summary\nSummary\n\n## 2. Product Vision\nVision"
	prdFindings := ve.ValidatePRDCompleteness(incompletePRD)
	if len(prdFindings) == 0 {
		t.Errorf("expected findings for incomplete PRD (missing 18 sections), got 0")
	}

	// 2. Ambiguity Detection
	reqs := []domain.Requirement{
		{
			RequirementKey: "REQ-001",
			Title:          "Fast Login",
			Description:    "The login system must be fast and user-friendly",
		},
		{
			RequirementKey: "REQ-002",
			Title:          "Data Backup",
			Description:    "Automated nightly database dump to S3 within 5 minutes",
		},
	}
	ambigFindings := ve.DetectAmbiguity(reqs)
	if len(ambigFindings) != 1 || *ambigFindings[0].RequirementID != reqs[0].ID {
		t.Errorf("expected 1 ambiguous finding for REQ-001, got %d", len(ambigFindings))
	}

	// 3. Unconfirmed Assumptions
	assumptions := []domain.Assumption{
		{ID: "a-1", Description: "All users have smartphones", Status: "unconfirmed"},
		{ID: "a-2", Description: "PostgreSQL 16 is available", Status: "confirmed"},
	}
	assumpFindings := ve.CheckUnconfirmedAssumptions(assumptions)
	if len(assumpFindings) != 1 {
		t.Errorf("expected 1 unconfirmed assumption finding, got %d", len(assumpFindings))
	}
}
