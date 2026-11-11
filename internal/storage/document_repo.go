package storage

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"sync/atomic"
	"time"

	"ai-requirements-studio/internal/domain"
)

var docVerCounter uint64

type DocumentRepository struct {
	db *DB
}

func NewDocumentRepository(db *DB) *DocumentRepository {
	return &DocumentRepository{db: db}
}

func (r *DocumentRepository) GetOrCreate(ctx context.Context, projectID string, docType domain.DocumentType) (*domain.Document, error) {
	query := `SELECT id, project_id, document_type, status, current_version_id, created_at, updated_at 
	          FROM documents WHERE project_id = ? AND document_type = ?`
	row := r.db.QueryRowContext(ctx, query, projectID, string(docType))

	var doc domain.Document
	var dType, status string
	var currVer sql.NullString
	err := row.Scan(&doc.ID, &doc.ProjectID, &dType, &status, &currVer, &doc.CreatedAt, &doc.UpdatedAt)
	if err == nil {
		doc.DocumentType = domain.DocumentType(dType)
		doc.Status = domain.DocumentStatus(status)
		if currVer.Valid {
			val := currVer.String
			doc.CurrentVersionID = &val
		}
		return &doc, nil
	}

	if errors.Is(err, sql.ErrNoRows) {
		docID := fmt.Sprintf("doc-%s-%d", docType, time.Now().UnixNano())
		now := time.Now().UTC()
		insertQuery := `INSERT INTO documents (id, project_id, document_type, status, created_at, updated_at) 
		                VALUES (?, ?, ?, 'draft', ?, ?)`
		if _, err := r.db.ExecContext(ctx, insertQuery, docID, projectID, string(docType), now, now); err != nil {
			return nil, fmt.Errorf("failed to create document record: %w", err)
		}
		return &domain.Document{
			ID:           docID,
			ProjectID:    projectID,
			DocumentType: docType,
			Status:       domain.DocStatusDraft,
			CreatedAt:    now,
			UpdatedAt:    now,
		}, nil
	}

	return nil, fmt.Errorf("failed to query document: %w", err)
}

func (r *DocumentRepository) AddVersion(ctx context.Context, docID string, content string, sourceVerID *string) (*domain.DocumentVersion, error) {
	// Find next version number
	queryVer := `SELECT COALESCE(MAX(version_number), 0) + 1 FROM document_versions WHERE document_id = ?`
	var nextVer int
	if err := r.db.QueryRowContext(ctx, queryVer, docID).Scan(&nextVer); err != nil {
		return nil, fmt.Errorf("failed to determine next version number: %w", err)
	}

	// Calculate SHA256 hash
	h := sha256.New()
	h.Write([]byte(content))
	contentHash := hex.EncodeToString(h.Sum(nil))

	verID := fmt.Sprintf("ver-%d-%d", time.Now().UnixNano(), atomic.AddUint64(&docVerCounter, 1))
	now := time.Now().UTC()

	insertQuery := `INSERT INTO document_versions 
	                (id, document_id, version_number, content, content_hash, source_version_id, created_at)
	                VALUES (?, ?, ?, ?, ?, ?, ?)`
	_, err := r.db.ExecContext(ctx, insertQuery, verID, docID, nextVer, content, contentHash, sourceVerID, now)
	if err != nil {
		return nil, fmt.Errorf("failed to insert document version: %w", err)
	}

	// Update document's current_version_id and updated_at
	updateDocQuery := `UPDATE documents SET current_version_id = ?, updated_at = ? WHERE id = ?`
	if _, err := r.db.ExecContext(ctx, updateDocQuery, verID, now, docID); err != nil {
		return nil, fmt.Errorf("failed to update document current version: %w", err)
	}

	return &domain.DocumentVersion{
		ID:              verID,
		DocumentID:      docID,
		VersionNumber:   nextVer,
		Content:         content,
		ContentHash:     contentHash,
		SourceVersionID: sourceVerID,
		CreatedAt:       now,
	}, nil
}

func (r *DocumentRepository) GetCurrentVersion(ctx context.Context, docID string) (*domain.DocumentVersion, error) {
	query := `SELECT v.id, v.document_id, v.version_number, v.content, v.content_hash, v.source_version_id, v.created_at, v.approved_at
	          FROM document_versions v
	          INNER JOIN documents d ON d.current_version_id = v.id
	          WHERE d.id = ?`
	row := r.db.QueryRowContext(ctx, query, docID)

	var v domain.DocumentVersion
	var srcVer sql.NullString
	var approvedAt sql.NullTime
	err := row.Scan(&v.ID, &v.DocumentID, &v.VersionNumber, &v.Content, &v.ContentHash, &srcVer, &v.CreatedAt, &approvedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil // No versions yet
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query current version: %w", err)
	}

	if srcVer.Valid {
		val := srcVer.String
		v.SourceVersionID = &val
	}
	if approvedAt.Valid {
		val := approvedAt.Time
		v.ApprovedAt = &val
	}
	return &v, nil
}

func (r *DocumentRepository) ListVersions(ctx context.Context, docID string) ([]domain.DocumentVersion, error) {
	query := `SELECT id, document_id, version_number, content, content_hash, source_version_id, created_at, approved_at
	          FROM document_versions WHERE document_id = ? ORDER BY version_number DESC`
	rows, err := r.db.QueryContext(ctx, query, docID)
	if err != nil {
		return nil, fmt.Errorf("failed to list document versions: %w", err)
	}
	defer rows.Close()

	var list []domain.DocumentVersion
	for rows.Next() {
		var v domain.DocumentVersion
		var srcVer sql.NullString
		var approvedAt sql.NullTime
		if err := rows.Scan(&v.ID, &v.DocumentID, &v.VersionNumber, &v.Content, &v.ContentHash, &srcVer, &v.CreatedAt, &approvedAt); err != nil {
			return nil, fmt.Errorf("failed to scan document version row: %w", err)
		}
		if srcVer.Valid {
			val := srcVer.String
			v.SourceVersionID = &val
		}
		if approvedAt.Valid {
			val := approvedAt.Time
			v.ApprovedAt = &val
		}
		list = append(list, v)
	}
	return list, nil
}

func (r *DocumentRepository) ApproveVersion(ctx context.Context, docID, versionID string) error {
	now := time.Now().UTC()
	queryVer := `UPDATE document_versions SET approved_at = ? WHERE id = ? AND document_id = ?`
	if _, err := r.db.ExecContext(ctx, queryVer, now, versionID, docID); err != nil {
		return fmt.Errorf("failed to set version approved timestamp: %w", err)
	}

	queryDoc := `UPDATE documents SET status = 'approved', updated_at = ? WHERE id = ?`
	if _, err := r.db.ExecContext(ctx, queryDoc, now, docID); err != nil {
		return fmt.Errorf("failed to update document status to approved: %w", err)
	}
	return nil
}

func (r *DocumentRepository) UpdateDocumentStatus(ctx context.Context, docID string, status domain.DocumentStatus) error {
	now := time.Now().UTC()
	query := `UPDATE documents SET status = ?, updated_at = ? WHERE id = ?`
	if _, err := r.db.ExecContext(ctx, query, string(status), now, docID); err != nil {
		return fmt.Errorf("failed to update document status: %w", err)
	}
	return nil
}
