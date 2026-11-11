package storage

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"ai-requirements-studio/internal/domain"
)

type ProviderRepository struct {
	db *DB
}

func NewProviderRepository(db *DB) *ProviderRepository {
	return &ProviderRepository{db: db}
}

func (r *ProviderRepository) UpsertProvider(ctx context.Context, p *domain.AIProviderConfig) error {
	query := `INSERT INTO ai_providers (id, provider_type, name, executable_path, model, config_json, enabled)
	          VALUES (?, ?, ?, ?, ?, ?, ?)
	          ON CONFLICT(id) DO UPDATE SET 
	          name = excluded.name,
	          executable_path = excluded.executable_path,
	          model = excluded.model,
	          config_json = excluded.config_json,
	          enabled = excluded.enabled`
	_, err := r.db.ExecContext(ctx, query, p.ID, string(p.ProviderType), p.Name, p.ExecutablePath, p.Model, p.ConfigJSON, p.Enabled)
	if err != nil {
		return fmt.Errorf("failed to upsert provider: %w", err)
	}
	return nil
}

func (r *ProviderRepository) ListProviders(ctx context.Context) ([]domain.AIProviderConfig, error) {
	query := `SELECT id, provider_type, name, executable_path, model, config_json, enabled FROM ai_providers`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list providers: %w", err)
	}
	defer rows.Close()

	var providers []domain.AIProviderConfig
	for rows.Next() {
		var p domain.AIProviderConfig
		var pType string
		var execPath, model, cfg sql.NullString
		if err := rows.Scan(&p.ID, &pType, &p.Name, &execPath, &model, &cfg, &p.Enabled); err != nil {
			return nil, fmt.Errorf("failed to scan provider: %w", err)
		}
		p.ProviderType = domain.ProviderType(pType)
		if execPath.Valid {
			p.ExecutablePath = execPath.String
		}
		if model.Valid {
			p.Model = model.String
		}
		if cfg.Valid {
			p.ConfigJSON = cfg.String
		}
		providers = append(providers, p)
	}
	return providers, nil
}

func (r *ProviderRepository) RecordExecution(ctx context.Context, exec *domain.ProviderExecution) error {
	query := `INSERT INTO provider_executions (id, project_id, provider_id, operation, status, model, started_at, completed_at, duration_ms, prompt_tokens, completion_tokens, total_tokens, fallback_used, error_code)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := r.db.ExecContext(ctx, query, exec.ID, exec.ProjectID, exec.ProviderID, exec.Operation, exec.Status, exec.Model, exec.StartedAt, exec.CompletedAt, exec.DurationMs, exec.PromptTokens, exec.CompletionTokens, exec.TotalTokens, exec.FallbackUsed, exec.ErrorCode)
	if err != nil {
		return fmt.Errorf("failed to insert provider execution: %w", err)
	}
	return nil
}

func (r *ProviderRepository) ListExecutions(ctx context.Context, projectID string, limit int) ([]domain.ProviderExecution, error) {
	if limit <= 0 {
		limit = 50
	}
	var query string
	var rows *sql.Rows
	var err error

	if projectID != "" {
		query = `SELECT id, project_id, provider_id, operation, status, model, started_at, completed_at, duration_ms, prompt_tokens, completion_tokens, total_tokens, fallback_used, error_code 
		          FROM provider_executions WHERE project_id = ? ORDER BY started_at DESC LIMIT ?`
		rows, err = r.db.QueryContext(ctx, query, projectID, limit)
	} else {
		query = `SELECT id, project_id, provider_id, operation, status, model, started_at, completed_at, duration_ms, prompt_tokens, completion_tokens, total_tokens, fallback_used, error_code 
		          FROM provider_executions ORDER BY started_at DESC LIMIT ?`
		rows, err = r.db.QueryContext(ctx, query, limit)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to list executions: %w", err)
	}
	defer rows.Close()

	var list []domain.ProviderExecution
	for rows.Next() {
		var e domain.ProviderExecution
		var model, errCode sql.NullString
		var completedAt sql.NullTime
		var fallbackUsed sql.NullBool
		var durationMs, promptTok, complTok, totalTok sql.NullInt64

		if err := rows.Scan(&e.ID, &e.ProjectID, &e.ProviderID, &e.Operation, &e.Status, &model, &e.StartedAt, &completedAt, &durationMs, &promptTok, &complTok, &totalTok, &fallbackUsed, &errCode); err != nil {
			return nil, fmt.Errorf("failed to scan execution: %w", err)
		}

		if model.Valid {
			e.Model = model.String
		}
		if completedAt.Valid {
			e.CompletedAt = &completedAt.Time
		}
		if durationMs.Valid {
			e.DurationMs = durationMs.Int64
		}
		if promptTok.Valid {
			e.PromptTokens = int(promptTok.Int64)
		}
		if complTok.Valid {
			e.CompletionTokens = int(complTok.Int64)
		}
		if totalTok.Valid {
			e.TotalTokens = int(totalTok.Int64)
		}
		if fallbackUsed.Valid {
			e.FallbackUsed = fallbackUsed.Bool
		}
		if errCode.Valid {
			e.ErrorCode = &errCode.String
		}
		list = append(list, e)
	}
	return list, nil
}

func (r *ProviderRepository) GetTokenUsageSummary(ctx context.Context, projectID string) (*domain.TokenUsageSummary, error) {
	var query string
	var row *sql.Row

	if projectID != "" {
		query = `SELECT COUNT(*), COALESCE(SUM(prompt_tokens), 0), COALESCE(SUM(completion_tokens), 0), COALESCE(SUM(total_tokens), 0), COALESCE(AVG(duration_ms), 0), COALESCE(SUM(CASE WHEN fallback_used = 1 THEN 1 ELSE 0 END), 0)
		          FROM provider_executions WHERE project_id = ?`
		row = r.db.QueryRowContext(ctx, query, projectID)
	} else {
		query = `SELECT COUNT(*), COALESCE(SUM(prompt_tokens), 0), COALESCE(SUM(completion_tokens), 0), COALESCE(SUM(total_tokens), 0), COALESCE(AVG(duration_ms), 0), COALESCE(SUM(CASE WHEN fallback_used = 1 THEN 1 ELSE 0 END), 0)
		          FROM provider_executions`
		row = r.db.QueryRowContext(ctx, query)
	}

	var sum domain.TokenUsageSummary
	var avgDur float64
	if err := row.Scan(&sum.TotalRequests, &sum.TotalPrompt, &sum.TotalCompletion, &sum.TotalTokens, &avgDur, &sum.FallbackCount); err != nil {
		return nil, fmt.Errorf("failed to aggregate token usage: %w", err)
	}
	sum.AverageDuration = int64(avgDur)
	return &sum, nil
}

func (r *ProviderRepository) SetSetting(ctx context.Context, key, value string) error {
	query := `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
	          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
	_, err := r.db.ExecContext(ctx, query, key, value)
	return err
}

func (r *ProviderRepository) GetSetting(ctx context.Context, key string) (string, error) {
	query := `SELECT value FROM app_settings WHERE key = ?`
	var val string
	if err := r.db.QueryRowContext(ctx, query, key).Scan(&val); err != nil {
		return "", err
	}
	return val, nil
}

func (r *ProviderRepository) GetProvider(ctx context.Context, id string) (*domain.AIProviderConfig, error) {
	query := `SELECT id, provider_type, name, executable_path, model, config_json, enabled FROM ai_providers WHERE id = ?`
	row := r.db.QueryRowContext(ctx, query, id)

	var p domain.AIProviderConfig
	var pType string
	var execPath, model, cfg sql.NullString
	if err := row.Scan(&p.ID, &pType, &p.Name, &execPath, &model, &cfg, &p.Enabled); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("provider %s not found", id)
		}
		return nil, fmt.Errorf("failed to query provider: %w", err)
	}
	p.ProviderType = domain.ProviderType(pType)
	if execPath.Valid {
		p.ExecutablePath = execPath.String
	}
	if model.Valid {
		p.Model = model.String
	}
	if cfg.Valid {
		p.ConfigJSON = cfg.String
	}
	return &p, nil
}
