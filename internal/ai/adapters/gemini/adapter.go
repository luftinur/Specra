package gemini

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"ai-requirements-studio/internal/ai"
	"ai-requirements-studio/internal/domain"
)

type Adapter struct {
	mu         sync.RWMutex
	model      string
	apiKey     string
	httpClient *http.Client
}

func sanitizeModelName(name string) string {
	trimmed := strings.TrimSpace(name)
	trimmed = strings.ReplaceAll(trimmed, "\n", "")
	trimmed = strings.ReplaceAll(trimmed, "\r", "")
	for strings.HasPrefix(trimmed, "--") {
		trimmed = strings.TrimPrefix(trimmed, "-")
	}
	return trimmed
}

func NewAdapter(model, apiKey string) *Adapter {
	if model == "" {
		model = "gemini-1.5-pro"
	}
	return &Adapter{
		model:      sanitizeModelName(model),
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 90 * time.Second},
	}
}

func (a *Adapter) ID() string {
	return "gemini-direct"
}

func (a *Adapter) Name() string {
	return "Google Gemini (Direct API)"
}

func (a *Adapter) Type() domain.ProviderType {
	return domain.ProviderAPI
}

func (a *Adapter) SetConfig(model, apiKey string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if model != "" {
		a.model = sanitizeModelName(model)
	}
	if apiKey != "" {
		a.apiKey = apiKey
	}
}

func (a *Adapter) GetModel() string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.model
}

func (a *Adapter) getCredentials() (string, string) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.model, a.apiKey
}

func (a *Adapter) ListModels(ctx context.Context) ([]domain.ModelInfo, error) {
	defaultModels := []domain.ModelInfo{
		{ID: "gemini-2.5-flash", DisplayName: "Gemini 2.5 Flash (Fast & Capable)"},
		{ID: "gemini-2.5-pro", DisplayName: "Gemini 2.5 Pro (State-of-the-art Reasoning)"},
		{ID: "gemini-1.5-pro", DisplayName: "Gemini 1.5 Pro (Long Context)"},
		{ID: "gemini-1.5-flash", DisplayName: "Gemini 1.5 Flash (Ultra Fast)"},
	}

	if a.apiKey == "" {
		return defaultModels, nil
	}

	endpoint := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models?key=%s", a.apiKey)
	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return defaultModels, nil
	}

	resp, err := a.httpClient.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			_ = resp.Body.Close()
		}
		return defaultModels, nil
	}
	defer resp.Body.Close()

	var payload struct {
		Models []struct {
			Name                       string   `json:"name"`
			DisplayName                string   `json:"displayName"`
			SupportedGenerationMethods []string `json:"supportedGenerationMethods"`
		} `json:"models"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil || len(payload.Models) == 0 {
		return defaultModels, nil
	}

	var models []domain.ModelInfo
	for _, m := range payload.Models {
		canGenerate := false
		for _, method := range m.SupportedGenerationMethods {
			if method == "generateContent" {
				canGenerate = true
				break
			}
		}
		if canGenerate {
			id := strings.TrimPrefix(m.Name, "models/")
			displayName := m.DisplayName
			if displayName == "" {
				displayName = id
			}
			models = append(models, domain.ModelInfo{
				ID:          id,
				DisplayName: displayName,
			})
		}
	}

	if len(models) == 0 {
		return defaultModels, nil
	}
	return models, nil
}

func (a *Adapter) CheckAvailability(ctx context.Context) error {
	_, key := a.getCredentials()
	if key == "" {
		return fmt.Errorf("gemini api key not configured")
	}
	return nil
}

func (a *Adapter) CheckAuthentication(ctx context.Context) error {
	_, key := a.getCredentials()
	if key == "" {
		return fmt.Errorf("gemini api key missing")
	}
	return nil
}

func (a *Adapter) Generate(ctx context.Context, req ai.GenerateRequest) (*ai.GenerateResponse, error) {
	start := time.Now()
	defaultModel, apiKey := a.getCredentials()
	if apiKey == "" {
		return nil, fmt.Errorf("gemini api key is not set. please configure it in settings")
	}

	targetModel := sanitizeModelName(req.Model)
	if targetModel == "" {
		targetModel = defaultModel
	}
	endpoint := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", targetModel, apiKey)

	userText := req.Prompt
	if req.System != "" {
		userText = fmt.Sprintf("SYSTEM INSTRUCTION:\n%s\n\nUSER PROMPT:\n%s", req.System, req.Prompt)
	}

	bodyPayload := map[string]any{
		"contents": []map[string]any{
			{
				"parts": []map[string]string{
					{"text": userText},
				},
			},
		},
		"generationConfig": map[string]any{
			"temperature": 0.2,
		},
	}

	payloadBytes, err := json.Marshal(bodyPayload)
	if err != nil {
		return nil, fmt.Errorf("failed to encode gemini payload: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(payloadBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create gemini request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("gemini http request failed: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read gemini response body: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("gemini api error (HTTP %d): %s", resp.StatusCode, string(respBytes))
	}

	type GeminiResponse struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
		UsageMetadata struct {
			PromptTokenCount     int `json:"promptTokenCount"`
			CandidatesTokenCount int `json:"candidatesTokenCount"`
			TotalTokenCount      int `json:"totalTokenCount"`
		} `json:"usageMetadata"`
	}

	var geminiResp GeminiResponse
	if err := json.Unmarshal(respBytes, &geminiResp); err != nil {
		return nil, fmt.Errorf("failed to decode gemini response: %w", err)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("received empty candidates from gemini api")
	}

	dur := time.Since(start).Seconds()
	textResult := strings.TrimSpace(geminiResp.Candidates[0].Content.Parts[0].Text)

	return &ai.GenerateResponse{
		Content:         textResult,
		ProviderID:      a.ID(),
		Model:           a.model,
		DurationSeconds: dur,
		Usage: &ai.TokenUsage{
			InputTokens:  geminiResp.UsageMetadata.PromptTokenCount,
			OutputTokens: geminiResp.UsageMetadata.CandidatesTokenCount,
			TotalTokens:  geminiResp.UsageMetadata.TotalTokenCount,
		},
	}, nil
}
