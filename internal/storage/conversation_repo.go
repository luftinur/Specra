package storage

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"ai-requirements-studio/internal/domain"
)

type ConversationRepository struct {
	db *DB
}

func NewConversationRepository(db *DB) *ConversationRepository {
	return &ConversationRepository{db: db}
}

func (r *ConversationRepository) GetOrCreateForProject(ctx context.Context, projectID, title string) (*domain.Conversation, error) {
	query := `SELECT id, project_id, title, created_at, updated_at FROM conversations WHERE project_id = ? ORDER BY created_at ASC LIMIT 1`
	row := r.db.QueryRowContext(ctx, query, projectID)

	var c domain.Conversation
	err := row.Scan(&c.ID, &c.ProjectID, &c.Title, &c.CreatedAt, &c.UpdatedAt)
	if err == nil {
		return &c, nil
	}

	if errors.Is(err, sql.ErrNoRows) {
		newID := fmt.Sprintf("conv-%d", time.Now().UnixNano())
		now := time.Now().UTC()
		insertQuery := `INSERT INTO conversations (id, project_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
		if _, err := r.db.ExecContext(ctx, insertQuery, newID, projectID, title, now, now); err != nil {
			return nil, fmt.Errorf("failed to create conversation: %w", err)
		}
		return &domain.Conversation{
			ID:        newID,
			ProjectID: projectID,
			Title:     title,
			CreatedAt: now,
			UpdatedAt: now,
		}, nil
	}

	return nil, fmt.Errorf("failed to query conversation: %w", err)
}

func (r *ConversationRepository) AddMessage(ctx context.Context, m *domain.Message) error {
	query := `INSERT INTO messages (id, conversation_id, role, content, provider_execution_id, created_at)
	          VALUES (?, ?, ?, ?, ?, ?)`
	if m.CreatedAt.IsZero() {
		m.CreatedAt = time.Now().UTC()
	}

	_, err := r.db.ExecContext(ctx, query, m.ID, m.ConversationID, string(m.Role), m.Content, m.ProviderExecutionID, m.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert message: %w", err)
	}
	return nil
}

func (r *ConversationRepository) ListMessages(ctx context.Context, conversationID string) ([]domain.Message, error) {
	query := `SELECT id, conversation_id, role, content, provider_execution_id, created_at 
	          FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`
	rows, err := r.db.QueryContext(ctx, query, conversationID)
	if err != nil {
		return nil, fmt.Errorf("failed to list messages: %w", err)
	}
	defer rows.Close()

	var messages []domain.Message
	for rows.Next() {
		var m domain.Message
		var role string
		var execID sql.NullString
		if err := rows.Scan(&m.ID, &m.ConversationID, &role, &m.Content, &execID, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan message row: %w", err)
		}
		m.Role = domain.MessageRole(role)
		if execID.Valid {
			val := execID.String
			m.ProviderExecutionID = &val
		}
		messages = append(messages, m)
	}
	return messages, nil
}

// Clarifications
func (r *ConversationRepository) AddClarification(ctx context.Context, c *domain.Clarification) error {
	query := `INSERT INTO clarifications (id, project_id, question, answer, status, created_at, answered_at)
	          VALUES (?, ?, ?, ?, ?, ?, ?)`
	now := time.Now().UTC()
	if c.CreatedAt.IsZero() {
		c.CreatedAt = now
	}
	if c.Status == "" {
		c.Status = "open"
	}

	_, err := r.db.ExecContext(ctx, query, c.ID, c.ProjectID, c.Question, c.Answer, c.Status, c.CreatedAt, c.AnsweredAt)
	if err != nil {
		return fmt.Errorf("failed to insert clarification: %w", err)
	}
	return nil
}

func (r *ConversationRepository) ListClarifications(ctx context.Context, projectID string) ([]domain.Clarification, error) {
	query := `SELECT id, project_id, question, answer, status, created_at, answered_at 
	          FROM clarifications WHERE project_id = ? ORDER BY created_at ASC`
	rows, err := r.db.QueryContext(ctx, query, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to list clarifications: %w", err)
	}
	defer rows.Close()

	var items []domain.Clarification
	for rows.Next() {
		var c domain.Clarification
		var ans sql.NullString
		var ansAt sql.NullTime
		if err := rows.Scan(&c.ID, &c.ProjectID, &c.Question, &ans, &c.Status, &c.CreatedAt, &ansAt); err != nil {
			return nil, fmt.Errorf("failed to scan clarification: %w", err)
		}
		if ans.Valid {
			val := ans.String
			c.Answer = &val
		}
		if ansAt.Valid {
			val := ansAt.Time
			c.AnsweredAt = &val
		}
		items = append(items, c)
	}
	return items, nil
}

// Assumptions
func (r *ConversationRepository) AnswerClarification(ctx context.Context, id, answer string) error {
	query := `UPDATE clarifications SET answer = ?, status = 'answered', answered_at = ? WHERE id = ?`
	now := time.Now().UTC()
	_, err := r.db.ExecContext(ctx, query, answer, now, id)
	if err != nil {
		return fmt.Errorf("failed to answer clarification: %w", err)
	}
	return nil
}

func (r *ConversationRepository) UpdateAssumptionStatus(ctx context.Context, id, status string) error {
	query := `UPDATE assumptions SET status = ? WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, status, id)
	if err != nil {
		return fmt.Errorf("failed to update assumption status: %w", err)
	}
	return nil
}

func (r *ConversationRepository) AddAssumption(ctx context.Context, a *domain.Assumption) error {
	query := `INSERT INTO assumptions (id, project_id, description, status, source_reference, created_at)
	          VALUES (?, ?, ?, ?, ?, ?)`
	now := time.Now().UTC()
	if a.CreatedAt.IsZero() {
		a.CreatedAt = now
	}
	if a.Status == "" {
		a.Status = "unconfirmed"
	}
	_, err := r.db.ExecContext(ctx, query, a.ID, a.ProjectID, a.Description, a.Status, a.SourceReference, a.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert assumption: %w", err)
	}
	return nil
}

func (r *ConversationRepository) ListAssumptions(ctx context.Context, projectID string) ([]domain.Assumption, error) {
	query := `SELECT id, project_id, description, status, source_reference, created_at 
	          FROM assumptions WHERE project_id = ? ORDER BY created_at ASC`
	rows, err := r.db.QueryContext(ctx, query, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to list assumptions: %w", err)
	}
	defer rows.Close()

	var items []domain.Assumption
	for rows.Next() {
		var a domain.Assumption
		var ref sql.NullString
		if err := rows.Scan(&a.ID, &a.ProjectID, &a.Description, &a.Status, &ref, &a.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan assumption: %w", err)
		}
		if ref.Valid {
			val := ref.String
			a.SourceReference = &val
		}
		items = append(items, a)
	}
	return items, nil
}
