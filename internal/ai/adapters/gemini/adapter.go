package gemini

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"ai-requirements-studio/internal/ai"
	"ai-requirements-studio/internal/domain"
)

type Adapter struct {
	model      string
	apiKey     string
	httpClient *http.Client
}

func NewAdapter(model, apiKey string) *Adapter {
	if model == "" {
		model = "gemini-1.5-pro"
	}
	return &Adapter{
		model:      model,
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
	if model != "" {
		a.model = model
	}
	if apiKey != "" {
		a.apiKey = apiKey
	}
}

func (a *Adapter) CheckAvailability(ctx context.Context) error {
	if a.apiKey == "" {
		return fmt.Errorf("gemini api key not configured")
	}
	return nil
}

func (a *Adapter) CheckAuthentication(ctx context.Context) error {
	if a.apiKey == "" {
		return fmt.Errorf("gemini api key missing")
	}
	return nil
}

func (a *Adapter) Generate(ctx context.Context, req ai.GenerateRequest) (*ai.GenerateResponse, error) {
	start := time.Now()
	if a.apiKey == "" {
		return nil, fmt.Errorf("gemini api key is not set. please configure it in settings")
	}

	endpoint := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", a.model, a.apiKey)

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
