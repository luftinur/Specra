package opencode

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"strings"
	"time"

	"ai-requirements-studio/internal/ai"
	"ai-requirements-studio/internal/domain"
)

type Adapter struct {
	executablePath string
	baseURL        string
	model          string
	apiKey         string
	httpClient     *http.Client
}

func NewAdapter(customPath, baseURL, model, apiKey string) *Adapter {
	if customPath == "" {
		customPath = "opencode"
	}
	if model == "" {
		model = "default"
	}
	return &Adapter{
		executablePath: customPath,
		baseURL:        strings.TrimRight(baseURL, "/"),
		model:          model,
		apiKey:         apiKey,
		httpClient:     &http.Client{Timeout: 90 * time.Second},
	}
}

func (a *Adapter) ID() string {
	return "opencode"
}

func (a *Adapter) Name() string {
	return "OpenCode / OpenAI-Compatible"
}

func (a *Adapter) Type() domain.ProviderType {
	if a.baseURL != "" {
		return domain.ProviderAPI
	}
	return domain.ProviderCLI
}

func (a *Adapter) SetConfig(baseURL, model, apiKey string) {
	a.baseURL = strings.TrimRight(baseURL, "/")
	if model != "" {
		a.model = model
	}
	a.apiKey = apiKey
}

func (a *Adapter) CheckAvailability(ctx context.Context) error {
	// 1. If HTTP endpoint is configured, check HTTP endpoint
	if a.baseURL != "" {
		req, err := http.NewRequestWithContext(ctx, "GET", a.baseURL+"/models", nil)
		if err == nil {
			if a.apiKey != "" {
				req.Header.Set("Authorization", "Bearer "+a.apiKey)
			}
			resp, err := a.httpClient.Do(req)
			if err == nil {
				defer resp.Body.Close()
				if resp.StatusCode < 500 {
					return nil
				}
			}
		}
	}

	// 2. Otherwise check CLI binary
	cmd := exec.CommandContext(ctx, a.executablePath, "-v")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("opencode cli (%s) not found and no working HTTP endpoint: %w", a.executablePath, err)
	}
	if len(out) == 0 {
		return fmt.Errorf("opencode cli returned empty output")
	}
	return nil
}

func (a *Adapter) CheckAuthentication(ctx context.Context) error {
	return nil
}

func (a *Adapter) Generate(ctx context.Context, req ai.GenerateRequest) (*ai.GenerateResponse, error) {
	start := time.Now()

	// Route 1: If HTTP baseURL is configured, call OpenAI-compatible API
	if a.baseURL != "" {
		return a.generateHTTP(ctx, req, start)
	}

	// Route 2: Call CLI subprocess
	return a.generateCLI(ctx, req, start)
}

func (a *Adapter) generateCLI(ctx context.Context, req ai.GenerateRequest, start time.Time) (*ai.GenerateResponse, error) {
	fullPrompt := req.Prompt
	if req.System != "" {
		fullPrompt = fmt.Sprintf("SYSTEM INSTRUCTION:\n%s\n\nUSER REQUEST:\n%s", req.System, req.Prompt)
	}

	args := []string{"run", "--format", "json"}
	if a.model != "" && a.model != "default" {
		args = append(args, "-m", a.model)
	}
	args = append(args, fullPrompt)

	cmd := exec.CommandContext(ctx, a.executablePath, args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		errStr := stderr.String()
		if errStr == "" {
			errStr = stdout.String()
		}
		return nil, fmt.Errorf("opencode cli error: %s (%w)", strings.TrimSpace(errStr), err)
	}

	outBytes := stdout.Bytes()
	content := string(outBytes)

	// Try parsing JSON format
	type OpenCodeJSON struct {
		Content string `json:"content"`
		Message string `json:"message"`
		Text    string `json:"text"`
		Usage   struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
			TotalTokens  int `json:"total_tokens"`
		} `json:"usage"`
	}

	var parsed OpenCodeJSON
	if err := json.Unmarshal(outBytes, &parsed); err == nil {
		if parsed.Content != "" {
			content = parsed.Content
		} else if parsed.Text != "" {
			content = parsed.Text
		} else if parsed.Message != "" {
			content = parsed.Message
		}
	}

	// Calculate approximate tokens if not provided
	inTokens := len(fullPrompt) / 4
	outTokens := len(content) / 4
	if parsed.Usage.TotalTokens > 0 {
		inTokens = parsed.Usage.InputTokens
		outTokens = parsed.Usage.OutputTokens
	}

	dur := time.Since(start).Seconds()

	return &ai.GenerateResponse{
		Content:         strings.TrimSpace(content),
		ProviderID:      a.ID(),
		Model:           a.model,
		DurationSeconds: dur,
		Usage: &ai.TokenUsage{
			InputTokens:  inTokens,
			OutputTokens: outTokens,
			TotalTokens:  inTokens + outTokens,
		},
	}, nil
}

func (a *Adapter) generateHTTP(ctx context.Context, req ai.GenerateRequest, start time.Time) (*ai.GenerateResponse, error) {
	messages := make([]map[string]string, 0)
	if req.System != "" {
		messages = append(messages, map[string]string{
			"role":    "system",
			"content": req.System,
		})
	}
	messages = append(messages, map[string]string{
		"role":    "user",
		"content": req.Prompt,
	})

	body := map[string]any{
		"model":       a.model,
		"messages":    messages,
		"temperature": 0.2,
	}

	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal http request: %w", err)
	}

	endpoint := a.baseURL + "/chat/completions"
	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create http request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	if a.apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+a.apiKey)
	}

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("http request to %s failed: %w", endpoint, err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("http error %d: %s", resp.StatusCode, string(respBytes))
	}

	type OpenAIChatResponse struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
			TotalTokens      int `json:"total_tokens"`
		} `json:"usage"`
	}

	var chatResp OpenAIChatResponse
	if err := json.Unmarshal(respBytes, &chatResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(chatResp.Choices) == 0 {
		return nil, fmt.Errorf("received empty choices from api")
	}

	dur := time.Since(start).Seconds()
	return &ai.GenerateResponse{
		Content:         chatResp.Choices[0].Message.Content,
		ProviderID:      a.ID(),
		Model:           a.model,
		DurationSeconds: dur,
		Usage: &ai.TokenUsage{
			InputTokens:  chatResp.Usage.PromptTokens,
			OutputTokens: chatResp.Usage.CompletionTokens,
			TotalTokens:  chatResp.Usage.TotalTokens,
		},
	}, nil
}
