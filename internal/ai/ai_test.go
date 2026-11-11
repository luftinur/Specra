package ai

import (
	"context"
	"testing"

	"ai-requirements-studio/internal/domain"
)

type mockProvider struct {
	id   string
	name string
}

func (m *mockProvider) ID() string { return m.id }
func (m *mockProvider) Name() string { return m.name }
func (m *mockProvider) Type() domain.ProviderType { return domain.ProviderCLI }
func (m *mockProvider) CheckAvailability(ctx context.Context) error { return nil }
func (m *mockProvider) CheckAuthentication(ctx context.Context) error { return nil }
func (m *mockProvider) Generate(ctx context.Context, req GenerateRequest) (*GenerateResponse, error) {
	return &GenerateResponse{
		Content:    "Mock response for " + req.Prompt,
		ProviderID: m.id,
		Model:      req.Model,
	}, nil
}

func TestOrchestrator(t *testing.T) {
	orch := NewOrchestrator(nil)
	mock := &mockProvider{id: "mock-1", name: "Mock Provider"}

	orch.RegisterProvider(mock)

	p, err := orch.GetActiveProvider()
	if err != nil {
		t.Fatalf("failed to get active provider: %v", err)
	}
	if p.ID() != "mock-1" {
		t.Errorf("expected active provider 'mock-1', got '%s'", p.ID())
	}

	resp, err := orch.Execute(context.Background(), GenerateRequest{
		ProjectID: "proj-1",
		Prompt:    "Generate PRD",
	})
	if err != nil {
		t.Fatalf("failed to execute prompt: %v", err)
	}
	if resp.Content != "Mock response for Generate PRD" {
		t.Errorf("unexpected response content: %s", resp.Content)
	}
}
