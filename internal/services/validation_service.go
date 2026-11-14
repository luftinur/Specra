package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"ai-requirements-studio/internal/ai"
	"ai-requirements-studio/internal/domain"
	"ai-requirements-studio/internal/storage"
)

type ValidationService struct {
	valRepo  *storage.ValidationRepository
	docRepo  *storage.DocumentRepository
	reqRepo  *storage.RequirementRepository
	convRepo *storage.ConversationRepository
	engine   *ai.ValidationEngine
}

func NewValidationService(
	valRepo *storage.ValidationRepository,
	docRepo *storage.DocumentRepository,
	reqRepo *storage.RequirementRepository,
	convRepo *storage.ConversationRepository,
) *ValidationService {
	return &ValidationService{
		valRepo:  valRepo,
		docRepo:  docRepo,
		reqRepo:  reqRepo,
		convRepo: convRepo,
		engine:   ai.NewValidationEngine(),
	}
}

func (s *ValidationService) RunValidation(projectID string) ([]domain.ValidationFinding, error) {
	ctx := context.Background()
	runID := fmt.Sprintf("valrun-%d", time.Now().UnixNano())

	if err := s.valRepo.CreateRun(ctx, runID, projectID, "full_suite", "running"); err != nil {
		return nil, fmt.Errorf("failed to start validation run: %w", err)
	}

	var allFindings []domain.ValidationFinding

	// 1. Validate PRD Completeness
	prdDoc, _ := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypePRD)
	var prdVer *domain.DocumentVersion
	if prdDoc != nil {
		prdVer, _ = s.docRepo.GetCurrentVersion(ctx, prdDoc.ID)
	}
	prdContent := ""
	if prdVer != nil {
		prdContent = prdVer.Content
	}
	allFindings = append(allFindings, s.engine.ValidatePRDCompleteness(prdContent)...)

	// 2. Validate SRS Completeness
	srsDoc, _ := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypeSRS)
	var srsVer *domain.DocumentVersion
	if srsDoc != nil {
		srsVer, _ = s.docRepo.GetCurrentVersion(ctx, srsDoc.ID)
	}
	srsContent := ""
	if srsVer != nil {
		srsContent = srsVer.Content
	}
	allFindings = append(allFindings, s.engine.ValidateSRSCompleteness(srsContent)...)

	// 3. Ambiguity in Requirements
	reqs, _ := s.reqRepo.ListByProject(ctx, projectID)
	allFindings = append(allFindings, s.engine.DetectAmbiguity(reqs)...)

	// 4. Unconfirmed Assumptions
	assump, _ := s.convRepo.ListAssumptions(ctx, projectID)
	allFindings = append(allFindings, s.engine.CheckUnconfirmedAssumptions(assump)...)

	// 5. Traceability & Orphan Requirements Check
	if srsContent != "" {
		for _, r := range reqs {
			// Check if PRD requirement key is referenced in the SRS content
			if !strings.Contains(srsContent, r.RequirementKey) {
				reqID := r.ID
				allFindings = append(allFindings, domain.ValidationFinding{
					ID:            fmt.Sprintf("find-%d", time.Now().UnixNano()),
					Severity:      domain.SeverityWarning,
					FindingType:   "orphan_requirement",
					RequirementID: &reqID,
					Description:   fmt.Sprintf("Orphan Requirement: %s (%s) is not mapped or referenced in the SRS document.", r.RequirementKey, r.Title),
				})
			}
		}
	}

	// 6. Change Impact: Mark SRS as outdated if PRD version was updated after SRS
	if prdVer != nil && srsVer != nil {
		if prdVer.CreatedAt.After(srsVer.CreatedAt) {
			_ = s.docRepo.UpdateDocumentStatus(ctx, srsDoc.ID, domain.DocStatusOutdated)
			allFindings = append(allFindings, domain.ValidationFinding{
				ID:          fmt.Sprintf("find-%d", time.Now().UnixNano()),
				Severity:    domain.SeverityConflict,
				FindingType: "outdated_srs",
				Description: "Change Impact Alert: PRD was updated after SRS was created. SRS document is marked as outdated and should be regenerated.",
			})
		} else if srsDoc.Status == domain.DocStatusOutdated {
			// SRS has been regenerated / is up-to-date with PRD; heal status back to draft
			_ = s.docRepo.UpdateDocumentStatus(ctx, srsDoc.ID, domain.DocStatusDraft)
		}
	}

	// Persist findings
	for i := range allFindings {
		allFindings[i].ValidationRunID = runID
		_ = s.valRepo.SaveFinding(ctx, &allFindings[i])
	}

	return allFindings, nil
}

func (s *ValidationService) GetLatestFindings(projectID string) ([]domain.ValidationFinding, error) {
	return s.valRepo.ListLatestFindings(context.Background(), projectID)
}

func (s *ValidationService) GetTraceabilityMatrix(projectID string) ([]map[string]any, error) {
	ctx := context.Background()
	reqs, err := s.reqRepo.ListByProject(ctx, projectID)
	if err != nil {
		return nil, err
	}

	srsDoc, _ := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypeSRS)
	var srsVer *domain.DocumentVersion
	if srsDoc != nil {
		srsVer, _ = s.docRepo.GetCurrentVersion(ctx, srsDoc.ID)
	}
	srsContent := ""
	if srsVer != nil {
		srsContent = srsVer.Content
	}

	var matrix []map[string]any
	for _, r := range reqs {
		isCovered := false
		if srsContent != "" && strings.Contains(srsContent, r.RequirementKey) {
			isCovered = true
		}

		matrix = append(matrix, map[string]any{
			"requirement_id":  r.ID,
			"requirement_key": r.RequirementKey,
			"title":           r.Title,
			"priority":        r.Priority,
			"category":        r.Category,
			"status":          r.Status,
			"covered_in_srs":  isCovered,
		})
	}

	return matrix, nil
}

func (s *ValidationService) CheckChangeImpact(projectID string) (map[string]any, error) {
	ctx := context.Background()
	prdDoc, _ := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypePRD)
	srsDoc, _ := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypeSRS)

	var prdVer, srsVer *domain.DocumentVersion
	if prdDoc != nil {
		prdVer, _ = s.docRepo.GetCurrentVersion(ctx, prdDoc.ID)
	}
	if srsDoc != nil {
		srsVer, _ = s.docRepo.GetCurrentVersion(ctx, srsDoc.ID)
	}

	isOutdated := false
	if prdVer != nil && srsVer != nil {
		if prdVer.CreatedAt.After(srsVer.CreatedAt) {
			isOutdated = true
			_ = s.docRepo.UpdateDocumentStatus(ctx, srsDoc.ID, domain.DocStatusOutdated)
		} else if srsDoc.Status == domain.DocStatusOutdated {
			_ = s.docRepo.UpdateDocumentStatus(ctx, srsDoc.ID, domain.DocStatusDraft)
		}
	}

	return map[string]any{
		"srs_outdated":    isOutdated,
		"prd_updated_at":  prdDoc.UpdatedAt,
		"srs_status":      srsDoc.Status,
	}, nil
}
