package storage

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"ai-requirements-studio/internal/domain"
)

type RequirementRepository struct {
	db *DB
}

func NewRequirementRepository(db *DB) *RequirementRepository {
	return &RequirementRepository{db: db}
}

func (r *RequirementRepository) Create(ctx context.Context, req *domain.Requirement) error {
	query := `INSERT INTO requirements 
	          (id, project_id, requirement_key, category, title, description, priority, status, confidence, created_at, updated_at)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	          ON CONFLICT(project_id, requirement_key) DO UPDATE SET
	          category = excluded.category,
	          title = excluded.title,
	          description = excluded.description,
	          priority = excluded.priority,
	          confidence = excluded.confidence,
	          updated_at = excluded.updated_at`

	now := time.Now().UTC()
	if req.CreatedAt.IsZero() {
		req.CreatedAt = now
	}
	req.UpdatedAt = now
	if req.Status == "" {
		req.Status = domain.RequirementStatusDraft
	}

	_, err := r.db.ExecContext(ctx, query,
		req.ID, req.ProjectID, req.RequirementKey, string(req.Category),
		req.Title, req.Description, string(req.Priority), string(req.Status),
		req.Confidence, req.CreatedAt, req.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to upsert requirement: %w", err)
	}
	return nil
}

func (r *RequirementRepository) Get(ctx context.Context, id string) (*domain.Requirement, error) {
	query := `SELECT id, project_id, requirement_key, category, title, description, priority, status, confidence, created_at, updated_at 
	          FROM requirements WHERE id = ?`
	row := r.db.QueryRowContext(ctx, query, id)

	var req domain.Requirement
	var cat, prio, stat, conf sql.NullString
	err := row.Scan(&req.ID, &req.ProjectID, &req.RequirementKey, &cat, &req.Title, &req.Description, &prio, &stat, &conf, &req.CreatedAt, &req.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("requirement %s not found", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan requirement: %w", err)
	}

	req.Category = domain.RequirementCategory(cat.String)
	req.Priority = domain.MoSCoWPriority(prio.String)
	req.Status = domain.RequirementStatus(stat.String)
	req.Confidence = conf.String
	return &req, nil
}

func (r *RequirementRepository) ListByProject(ctx context.Context, projectID string) ([]domain.Requirement, error) {
	query := `SELECT id, project_id, requirement_key, category, title, description, priority, status, confidence, created_at, updated_at 
	          FROM requirements WHERE project_id = ? ORDER BY requirement_key ASC`
	rows, err := r.db.QueryContext(ctx, query, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to list requirements: %w", err)
	}
	defer rows.Close()

	var list []domain.Requirement
	for rows.Next() {
		var req domain.Requirement
		var cat, prio, stat, conf sql.NullString
		if err := rows.Scan(&req.ID, &req.ProjectID, &req.RequirementKey, &cat, &req.Title, &req.Description, &prio, &stat, &conf, &req.CreatedAt, &req.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan requirement row: %w", err)
		}
		req.Category = domain.RequirementCategory(cat.String)
		req.Priority = domain.MoSCoWPriority(prio.String)
		req.Status = domain.RequirementStatus(stat.String)
		req.Confidence = conf.String
		list = append(list, req)
	}
	return list, nil
}

func (r *RequirementRepository) UpdateStatus(ctx context.Context, id string, status domain.RequirementStatus) error {
	query := `UPDATE requirements SET status = ?, updated_at = ? WHERE id = ?`
	now := time.Now().UTC()
	res, err := r.db.ExecContext(ctx, query, string(status), now, id)
	if err != nil {
		return fmt.Errorf("failed to update requirement status: %w", err)
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("requirement %s not found for status update", id)
	}
	return nil
}

func (r *RequirementRepository) UpdatePriority(ctx context.Context, id string, priority domain.MoSCoWPriority) error {
	query := `UPDATE requirements SET priority = ?, updated_at = ? WHERE id = ?`
	now := time.Now().UTC()
	res, err := r.db.ExecContext(ctx, query, string(priority), now, id)
	if err != nil {
		return fmt.Errorf("failed to update requirement priority: %w", err)
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("requirement %s not found for priority update", id)
	}
	return nil
}

func (r *RequirementRepository) NextKey(ctx context.Context, projectID, prefix string) (string, error) {
	query := `SELECT COUNT(*) FROM requirements WHERE project_id = ? AND requirement_key LIKE ?`
	var count int
	err := r.db.QueryRowContext(ctx, query, projectID, prefix+"-%").Scan(&count)
	if err != nil {
		return "", fmt.Errorf("failed to calculate next key: %w", err)
	}
	return fmt.Sprintf("%s-%03d", prefix, count+1), nil
}
