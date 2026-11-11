package storage

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"ai-requirements-studio/internal/domain"
)

type ProjectRepository struct {
	db *DB
}

func NewProjectRepository(db *DB) *ProjectRepository {
	return &ProjectRepository{db: db}
}

func (r *ProjectRepository) Create(ctx context.Context, p *domain.Project) error {
	query := `INSERT INTO projects (id, name, description, status, created_at, updated_at) 
	          VALUES (?, ?, ?, ?, ?, ?)`
	now := time.Now().UTC()
	if p.CreatedAt.IsZero() {
		p.CreatedAt = now
	}
	if p.UpdatedAt.IsZero() {
		p.UpdatedAt = now
	}
	if p.Status == "" {
		p.Status = domain.ProjectStatusActive
	}

	_, err := r.db.ExecContext(ctx, query, p.ID, p.Name, p.Description, string(p.Status), p.CreatedAt, p.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert project: %w", err)
	}
	return nil
}

func (r *ProjectRepository) Get(ctx context.Context, id string) (*domain.Project, error) {
	query := `SELECT id, name, description, status, created_at, updated_at FROM projects WHERE id = ?`
	row := r.db.QueryRowContext(ctx, query, id)

	var p domain.Project
	var status string
	err := row.Scan(&p.ID, &p.Name, &p.Description, &status, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("project with id %s not found", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan project: %w", err)
	}
	p.Status = domain.ProjectStatus(status)
	return &p, nil
}

func (r *ProjectRepository) List(ctx context.Context) ([]domain.Project, error) {
	query := `SELECT id, name, description, status, created_at, updated_at FROM projects ORDER BY updated_at DESC`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list projects: %w", err)
	}
	defer rows.Close()

	var projects []domain.Project
	for rows.Next() {
		var p domain.Project
		var status string
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &status, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan project row: %w", err)
		}
		p.Status = domain.ProjectStatus(status)
		projects = append(projects, p)
	}
	return projects, nil
}

func (r *ProjectRepository) Update(ctx context.Context, p *domain.Project) error {
	query := `UPDATE projects SET name = ?, description = ?, status = ?, updated_at = ? WHERE id = ?`
	p.UpdatedAt = time.Now().UTC()
	res, err := r.db.ExecContext(ctx, query, p.Name, p.Description, string(p.Status), p.UpdatedAt, p.ID)
	if err != nil {
		return fmt.Errorf("failed to update project: %w", err)
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("project with id %s not found for update", p.ID)
	}
	return nil
}

func (r *ProjectRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM projects WHERE id = ?`
	res, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete project: %w", err)
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("project with id %s not found for deletion", id)
	}
	return nil
}
