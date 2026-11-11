package ai

import (
	"context"
	"fmt"
	"sync"
	"time"

	"ai-requirements-studio/internal/domain"
	"ai-requirements-studio/internal/storage"
)

type Orchestrator struct {
	mu               sync.RWMutex
	providers        map[string]AIProvider
	activeProvider   string
	fallbackProvider string
	fallbackEnabled  bool
	repo             *storage.ProviderRepository
}

func NewOrchestrator(repo *storage.ProviderRepository) *Orchestrator {
	return &Orchestrator{
		providers: make(map[string]AIProvider),
		repo:      repo,
	}
}

func (o *Orchestrator) RegisterProvider(p AIProvider) {
	o.mu.Lock()
	defer o.mu.Unlock()
	o.providers[p.ID()] = p
	if o.activeProvider == "" {
		o.activeProvider = p.ID()
	}
}

func (o *Orchestrator) SetActiveProvider(id string) error {
	o.mu.Lock()
	defer o.mu.Unlock()
	if _, exists := o.providers[id]; !exists {
		return fmt.Errorf("provider %s not registered", id)
	}
	o.activeProvider = id
	return nil
}

func (o *Orchestrator) SetFallbackProvider(id string, enabled bool) error {
	o.mu.Lock()
	defer o.mu.Unlock()
	if id != "" {
		if _, exists := o.providers[id]; !exists {
			return fmt.Errorf("fallback provider %s not registered", id)
		}
	}
	o.fallbackProvider = id
	o.fallbackEnabled = enabled
	return nil
}

func (o *Orchestrator) GetActiveProvider() (AIProvider, error) {
	o.mu.RLock()
	defer o.mu.RUnlock()
	p, exists := o.providers[o.activeProvider]
	if !exists {
		return nil, fmt.Errorf("no active provider configured")
	}
	return p, nil
}

func (o *Orchestrator) GetFallbackProvider() (AIProvider, bool) {
	o.mu.RLock()
	defer o.mu.RUnlock()
	if !o.fallbackEnabled || o.fallbackProvider == "" {
		return nil, false
	}
	p, exists := o.providers[o.fallbackProvider]
	return p, exists
}

func (o *Orchestrator) GetConfig() (primary string, fallback string, fallbackEnabled bool) {
	o.mu.RLock()
	defer o.mu.RUnlock()
	return o.activeProvider, o.fallbackProvider, o.fallbackEnabled
}

func (o *Orchestrator) GetProvider(id string) (AIProvider, bool) {
	o.mu.RLock()
	defer o.mu.RUnlock()
	p, exists := o.providers[id]
	return p, exists
}

func (o *Orchestrator) Execute(ctx context.Context, req GenerateRequest) (*GenerateResponse, error) {
	primary, err := o.GetActiveProvider()
	if err != nil {
		return nil, err
	}

	execID := fmt.Sprintf("exec-%d", time.Now().UnixNano())
	start := time.Now().UTC()

	// 1. Try Primary Provider
	resp, primaryErr := primary.Generate(ctx, req)
	durMs := time.Since(start).Milliseconds()
	now := time.Now().UTC()

	if primaryErr == nil {
		resp.ExecutionID = execID
		// Primary Succeeded
		if o.repo != nil {
			var inTok, outTok, totTok int
			if resp.Usage != nil {
				inTok = resp.Usage.InputTokens
				outTok = resp.Usage.OutputTokens
				totTok = resp.Usage.TotalTokens
			}
			_ = o.repo.RecordExecution(context.Background(), &domain.ProviderExecution{
				ID:               execID,
				ProjectID:        req.ProjectID,
				ProviderID:       primary.ID(),
				Operation:        req.Role,
				Status:           "success",
				Model:            resp.Model,
				StartedAt:        start,
				CompletedAt:      &now,
				DurationMs:       durMs,
				PromptTokens:     inTok,
				CompletionTokens: outTok,
				TotalTokens:      totTok,
				FallbackUsed:     false,
			})
		}
		return resp, nil
	}

	// 2. Check if Fallback Provider is available & enabled
	fallback, hasFallback := o.GetFallbackProvider()
	if !hasFallback || fallback.ID() == primary.ID() {
		// No fallback available, record primary failure
		if o.repo != nil {
			errMsg := primaryErr.Error()
			_ = o.repo.RecordExecution(context.Background(), &domain.ProviderExecution{
				ID:          execID,
				ProjectID:   req.ProjectID,
				ProviderID:  primary.ID(),
				Operation:   req.Role,
				Status:      "failed",
				Model:       req.Model,
				StartedAt:   start,
				CompletedAt: &now,
				DurationMs:  durMs,
				ErrorCode:   &errMsg,
			})
		}
		return nil, fmt.Errorf("primary provider (%s) failed: %w", primary.Name(), primaryErr)
	}

	// 3. Execute Fallback Provider
	fbStart := time.Now().UTC()
	fbResp, fbErr := fallback.Generate(ctx, req)
	fbNow := time.Now().UTC()
	totalDurMs := time.Since(start).Milliseconds()

	if fbErr != nil {
		// Both Primary and Fallback Failed
		if o.repo != nil {
			bothErrMsg := fmt.Sprintf("primary (%s) error: %v; fallback (%s) error: %v", primary.ID(), primaryErr, fallback.ID(), fbErr)
			_ = o.repo.RecordExecution(context.Background(), &domain.ProviderExecution{
				ID:           execID,
				ProjectID:    req.ProjectID,
				ProviderID:   fallback.ID(),
				Operation:    req.Role,
				Status:       "failed",
				Model:        req.Model,
				StartedAt:    start,
				CompletedAt:  &fbNow,
				DurationMs:   totalDurMs,
				FallbackUsed: true,
				ErrorCode:    &bothErrMsg,
			})
		}
		return nil, fmt.Errorf("both primary (%s: %v) and fallback (%s: %v) failed", primary.Name(), primaryErr, fallback.Name(), fbErr)
	}

	// Fallback Succeeded
	fbResp.ExecutionID = execID
	if o.repo != nil {
		var inTok, outTok, totTok int
		if fbResp.Usage != nil {
			inTok = fbResp.Usage.InputTokens
			outTok = fbResp.Usage.OutputTokens
			totTok = fbResp.Usage.TotalTokens
		}
		_ = o.repo.RecordExecution(context.Background(), &domain.ProviderExecution{
			ID:               execID,
			ProjectID:        req.ProjectID,
			ProviderID:       fallback.ID(),
			Operation:        req.Role,
			Status:           "fallback_success",
			Model:            fbResp.Model,
			StartedAt:        fbStart,
			CompletedAt:      &fbNow,
			DurationMs:       totalDurMs,
			PromptTokens:     inTok,
			CompletionTokens: outTok,
			TotalTokens:      totTok,
			FallbackUsed:     true,
		})
	}

	return fbResp, nil
}
