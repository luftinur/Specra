package services

import (
	"context"
	"fmt"

	"ai-requirements-studio/internal/domain"
	"ai-requirements-studio/internal/storage"
)

type RequirementService struct {
	reqRepo  *storage.RequirementRepository
	convRepo *storage.ConversationRepository
}

func NewRequirementService(reqRepo *storage.RequirementRepository, convRepo *storage.ConversationRepository) *RequirementService {
	return &RequirementService{
		reqRepo:  reqRepo,
		convRepo: convRepo,
	}
}

func (s *RequirementService) ListRequirements(projectID string) ([]domain.Requirement, error) {
	return s.reqRepo.ListByProject(context.Background(), projectID)
}

func (s *RequirementService) ApproveRequirement(id string) error {
	return s.reqRepo.UpdateStatus(context.Background(), id, domain.RequirementStatusApproved)
}

func (s *RequirementService) RejectRequirement(id string) error {
	return s.reqRepo.UpdateStatus(context.Background(), id, domain.RequirementStatusRejected)
}

func (s *RequirementService) UpdatePriority(id string, priority string) error {
	p := domain.MoSCoWPriority(priority)
	switch p {
	case domain.PriorityMustHave, domain.PriorityShouldHave, domain.PriorityCouldHave, domain.PriorityWontHave:
		return s.reqRepo.UpdatePriority(context.Background(), id, p)
	default:
		return fmt.Errorf("invalid priority: %s (must be Must Have, Should Have, Could Have, or Won't Have)", priority)
	}
}

func (s *RequirementService) AnswerClarification(id string, answer string) error {
	if answer == "" {
		return fmt.Errorf("answer cannot be empty")
	}
	return s.convRepo.AnswerClarification(context.Background(), id, answer)
}

func (s *RequirementService) UpdateAssumptionStatus(id string, status string) error {
	return s.convRepo.UpdateAssumptionStatus(context.Background(), id, status)
}

func (s *RequirementService) CorrectAssumption(id string, correctedText string) error {
	if correctedText == "" {
		return fmt.Errorf("corrected text cannot be empty")
	}
	return s.convRepo.UpdateAssumption(context.Background(), id, correctedText, "confirmed")
}
