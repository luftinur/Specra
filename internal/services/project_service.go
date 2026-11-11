package services

import (
	"context"
	"fmt"
	"time"

	"ai-requirements-studio/internal/domain"
	"ai-requirements-studio/internal/storage"
)

type ProjectService struct {
	repo      *storage.ProjectRepository
	workspace *storage.WorkspaceManager
}

func NewProjectService(repo *storage.ProjectRepository, wm *storage.WorkspaceManager) *ProjectService {
	return &ProjectService{
		repo:      repo,
		workspace: wm,
	}
}

func (s *ProjectService) CreateProject(name, description string) (*domain.Project, error) {
	if name == "" {
		return nil, fmt.Errorf("project name cannot be empty")
	}

	pID := fmt.Sprintf("proj-%d", time.Now().UnixNano())
	now := time.Now().UTC()

	p := &domain.Project{
		ID:          pID,
		Name:        name,
		Description: description,
		Status:      domain.ProjectStatusActive,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.repo.Create(context.Background(), p); err != nil {
		return nil, err
	}

	if s.workspace != nil {
		if err := s.workspace.InitProjectWorkspace(pID); err != nil {
			return nil, fmt.Errorf("failed to init workspace: %w", err)
		}
	}

	return p, nil
}

func (s *ProjectService) GetProject(id string) (*domain.Project, error) {
	return s.repo.Get(context.Background(), id)
}

func (s *ProjectService) ListProjects() ([]domain.Project, error) {
	return s.repo.List(context.Background())
}

func (s *ProjectService) UpdateProject(id, name, description, status string) (*domain.Project, error) {
	p, err := s.repo.Get(context.Background(), id)
	if err != nil {
		return nil, err
	}

	p.Name = name
	p.Description = description
	p.Status = domain.ProjectStatus(status)
	p.UpdatedAt = time.Now().UTC()

	if err := s.repo.Update(context.Background(), p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *ProjectService) DeleteProject(id string) error {
	return s.repo.Delete(context.Background(), id)
}
