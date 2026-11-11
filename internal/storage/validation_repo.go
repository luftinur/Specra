package storage

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"ai-requirements-studio/internal/domain"
)

type ValidationRepository struct {
	db *DB
}

func NewValidationRepository(db *DB) *ValidationRepository {
	return &ValidationRepository{db: db}
}

func (r *ValidationRepository) CreateRun(ctx context.Context, id, projectID, valType, status string) error {
	query := `INSERT INTO validation_runs (id, project_id, validation_type, status, created_at)
	          VALUES (?, ?, ?, ?, ?)`
	now := time.Now().UTC()
	_, err := r.db.ExecContext(ctx, query, id, projectID, valType, status, now)
	if err != nil {
		return fmt.Errorf("failed to create validation run: %w", err)
	}
	return nil
}

func (r *ValidationRepository) SaveFinding(ctx context.Context, f *domain.ValidationFinding) error {
	query := `INSERT INTO validation_findings 
	          (id, validation_run_id, severity, finding_type, description, requirement_id, document_version_id)
	          VALUES (?, ?, ?, ?, ?, ?, ?)`
	_, err := r.db.ExecContext(ctx, query, f.ID, f.ValidationRunID, string(f.Severity), f.FindingType, f.Description, f.RequirementID, f.DocumentVersionID)
	if err != nil {
		return fmt.Errorf("failed to insert validation finding: %w", err)
	}
	return nil
}

func (r *ValidationRepository) ListLatestFindings(ctx context.Context, projectID string) ([]domain.ValidationFinding, error) {
	// Find the most recent run ID for this project
	runQuery := `SELECT id FROM validation_runs WHERE project_id = ? ORDER BY created_at DESC LIMIT 1`
	var runID string
	err := r.db.QueryRowContext(ctx, runQuery, projectID).Scan(&runID)
	if err != nil {
		return nil, nil // No runs yet
	}

	query := `SELECT id, validation_run_id, severity, finding_type, description, requirement_id, document_version_id
	          FROM validation_findings WHERE validation_run_id = ?`
	rows, err := r.db.QueryContext(ctx, query, runID)
	if err != nil {
		return nil, fmt.Errorf("failed to list validation findings: %w", err)
	}
	defer rows.Close()

	var findings []domain.ValidationFinding
	for rows.Next() {
		var f domain.ValidationFinding
		var sev string
		var reqID, docVerID sql.NullString
		if err := rows.Scan(&f.ID, &f.ValidationRunID, &sev, &f.FindingType, &f.Description, &reqID, &docVerID); err != nil {
			return nil, fmt.Errorf("failed to scan finding row: %w", err)
		}
		f.Severity = domain.FindingSeverity(sev)
		if reqID.Valid {
			val := reqID.String
			f.RequirementID = &val
		}
		if docVerID.Valid {
			val := docVerID.String
			f.DocumentVersionID = &val
		}
		findings = append(findings, f)
	}
	return findings, nil
}

// Traceability
func (r *ValidationRepository) CreateTraceabilityLink(ctx context.Context, l *domain.TraceabilityLink) error {
	query := `INSERT INTO traceability_links (id, source_requirement_id, target_requirement_id, relationship_type, created_at)
	          VALUES (?, ?, ?, ?, ?)`
	if l.CreatedAt.IsZero() {
		l.CreatedAt = time.Now().UTC()
	}
	_, err := r.db.ExecContext(ctx, query, l.ID, l.SourceRequirementID, l.TargetRequirementID, l.RelationshipType, l.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert traceability link: %w", err)
	}
	return nil
}

func (r *ValidationRepository) ListTraceabilityLinksForProject(ctx context.Context, projectID string) ([]domain.TraceabilityLink, error) {
	query := `SELECT l.id, l.source_requirement_id, l.target_requirement_id, l.relationship_type, l.created_at
	          FROM traceability_links l
	          INNER JOIN requirements r ON r.id = l.source_requirement_id
	          WHERE r.project_id = ?`
	rows, err := r.db.QueryContext(ctx, query, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to query traceability links: %w", err)
	}
	defer rows.Close()

	var links []domain.TraceabilityLink
	for rows.Next() {
		var l domain.TraceabilityLink
		if err := rows.Scan(&l.ID, &l.SourceRequirementID, &l.TargetRequirementID, &l.RelationshipType, &l.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan traceability link: %w", err)
		}
		links = append(links, l)
	}
	return links, nil
}
