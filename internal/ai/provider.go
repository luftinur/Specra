package ai

import (
	"context"

	"ai-requirements-studio/internal/domain"
)

type TokenUsage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
	TotalTokens  int `json:"total_tokens"`
}

type GenerateRequest struct {
	ProjectID  string         `json:"project_id"`
	WorkDir    string         `json:"work_dir,omitempty"` // Isolated project directory for CLI sandboxing
	Role       string         `json:"role"`   // e.g. "Product Analyst", "Business Analyst", "System Analyst"
	System     string         `json:"system"` // system prompt
	Prompt     string         `json:"prompt"`
	Context    map[string]any `json:"context,omitempty"`
	Model      string         `json:"model,omitempty"`
	JSONSchema string         `json:"json_schema,omitempty"`
}

type GenerateResponse struct {
	ExecutionID     string         `json:"execution_id,omitempty"`
	Content         string         `json:"content"`
	ProviderID      string         `json:"provider_id"`
	Model           string         `json:"model"`
	Usage           *TokenUsage    `json:"usage,omitempty"`
	DurationSeconds float64        `json:"duration_seconds"`
	Metadata        map[string]any `json:"metadata,omitempty"`
}

type AIProvider interface {
	ID() string
	Name() string
	Type() domain.ProviderType

	CheckAvailability(ctx context.Context) error
	CheckAuthentication(ctx context.Context) error
	Generate(ctx context.Context, req GenerateRequest) (*GenerateResponse, error)
}

type ModelDiscoverer interface {
	ListModels(ctx context.Context) ([]domain.ModelInfo, error)
}
