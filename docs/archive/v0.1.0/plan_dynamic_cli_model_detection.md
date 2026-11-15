# Implementation Plan: Dynamic Model Detection & Selection for CLI Coding Agents (Antigravity, OpenCode, etc.)

## 1. Executive Summary & Key Answers
**User Query:**
> *"For coding agent CLIs like antigravity, opencode, and others, when detected, can we discover available models from that agent so I can choose?"*

**Answer:**
**Yes!**
Verified directly on host CLIs with zero mocks:
1. **Google Antigravity CLI (`agy`)**:
   Provides `agy models` returning active model IDs and display names:
   - `gemini-3.8-flash-high` (Gemini 3.8 Flash High)
   - `gemini-3.8-flash-medium` (Gemini 3.8 Flash Medium)
   - `gemini-3.8-flash-low` (Gemini 3.8 Flash Low)
   - `claude-sonnet-4-6` (Claude Sonnet 4.6 Thinking)
   - `claude-opus-4-6-thinking` (Claude Opus 4.6 Thinking)
   - `gpt-oss-120b-medium` (GPT-OSS 120B Medium)
   `agy` supports `--model <model_id>` for non-interactive executions.

2. **OpenCode AI Agent (`opencode`)**:
   Provides `opencode models` returning available models:
   - `opencode/beam-free`
   - `opencode/big-pickle`
   - `opencode/deepseek-v4.1-flash-free`
   - `opencode/flint-40b-free`
   - `opencode/glm-5.3-flash-free`, etc.
   Supports `-m <model_id>` in `opencode run` and `GET /models` on HTTP server modes.

3. **Google Gemini (Direct REST API)**:
   Supports `GET https://generativelanguage.googleapis.com/v1beta/models?key={key}` for `generateContent` models (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-1.5-pro`), with graceful fallbacks.

4. **Ollama / Local LLM**:
   Supports `ollama list` discovering local weights (Llama 3, DeepSeek-R1, Mistral, etc.).

---

## 2. Dynamic Model Detection & Selection Architecture

```mermaid
flowchart TD
    subgraph Detection [1. Dynamic Agent & Model Discovery]
        DA[ai.DetectInstalledCodingAgents] --> AGY[agy models]
        DA --> OC[opencode models / GET /models]
        DA --> GEM[Gemini REST /models / Standard List]
        DA --> OLL[ollama list]
    end

    subgraph Domain [2. Domain & Storage State]
        AGY --> MI1[[]domain.ModelInfo]
        OC --> MI2[[]domain.ModelInfo]
        GEM --> MI3[[]domain.ModelInfo]
        OLL --> MI4[[]domain.ModelInfo]
        
        MI1 & MI2 & MI3 & MI4 --> DET[domain.DetectedAgent.AvailableModels]
        SQL[(SQLite app.db settings)] --> SAVED_MODELS[Saved Model per Provider]
    end

    subgraph UI [3. Frontend UI Settings & Execution]
        DET --> CARD[Agent Detection Card with Model Dropdown]
        SAVED_MODELS --> SELECTOR[Provider Config <select> Dropdown]
        SELECTOR -->|User selects model| SAVE_API[ProviderService.ConfigureXXX]
        SAVE_API --> SQL
    end

    subgraph Runtime [4. Subprocess Execution]
        DOC[DocumentService / ConversationService] --> EXEC[ai.Orchestrator.Execute]
        EXEC --> ARGS[agy --model ... / opencode -m ...]
    end
```

---

## 3. Technical Changes

### A. Domain Layer (`internal/domain/models.go`)
1. Add `ModelInfo` struct:
   ```go
   type ModelInfo struct {
       ID          string `json:"id"`
       DisplayName string `json:"display_name"`
       Description string `json:"description,omitempty"`
   }
   ```
2. Extend `DetectedAgent`:
   ```go
   type DetectedAgent struct {
       ID              string      `json:"id"`
       Name            string      `json:"name"`
       Executable      string      `json:"executable"`
       Installed       bool        `json:"installed"`
       Version         string      `json:"version"`
       Path            string      `json:"path"`
       Description     string      `json:"description"`
       AvailableModels []ModelInfo `json:"available_models"`
       SelectedModel   string      `json:"selected_model"`
   }
   ```

### B. AI Engine Layer (`internal/ai/`)
1. **Interface `ModelDiscoverer` (`internal/ai/provider.go`)**:
   ```go
   type ModelDiscoverer interface {
       ListModels(ctx context.Context) ([]domain.ModelInfo, error)
   }
   ```
2. **Antigravity Adapter (`internal/ai/adapters/antigravity/adapter.go`)**:
   - Implement `ListModels(ctx)` executing `agy models` and parsing model IDs and display names.
   - Add `model string` field and `SetConfig(model string)` method.
   - In `Generate()`, apply configured model if `req.Model` is unspecified.
3. **OpenCode Adapter (`internal/ai/adapters/opencode/adapter.go`)**:
   - Implement `ListModels(ctx)` executing `opencode models` or calling `GET /models`.
   - In `generateCLI()`, pass `-m <model>`.
4. **Gemini Adapter (`internal/ai/adapters/gemini/adapter.go`)**:
   - Implement `ListModels(ctx)` calling Google AI Studio REST endpoints with API keys or fallback catalog.
5. **Agent Detector (`internal/ai/detector.go`)**:
   - Populate `AvailableModels` automatically upon host binary detection.

### C. Service Layer (`internal/services/provider_service.go`)
1. Add methods:
   - `GetProviderModels(providerID string) ([]domain.ModelInfo, error)`
   - `ConfigureAntigravity(model string) error`
2. Update `restoreSettings()`:
   - Restore `agy_model` from SQLite to `agyAdapter.SetConfig(agyModel)`.
3. Update `GetProviderStatus()`:
   - Include active models per provider (`agy_model`, `opencode_model`, `gemini_model`).

### D. Frontend UI Layer (`frontend/src/App.tsx`)
1. **Detected Agents Cards (Settings -> Coding Agents & LLM)**:
   - When models are discovered, render `<select>` dropdown inside agent cards.
   - Display model count badge (e.g. `6 models detected`).
2. **Provider Configuration Section**:
   - Dynamic `<select>` dropdowns with "Refresh Models" triggers.
3. **Status Bar & Header**:
   - Surface active model adjacent to provider name (e.g. `Antigravity CLI (gemini-3.8-flash-high)`).

---

## 4. Verification Plan

1. **CLI Output Parsers**:
   - Verify parsing of `agy models` output into 6 structured models.
   - Verify parsing of `opencode models` output into 12 models.
2. **Persistence**:
   - Select model (e.g. `claude-sonnet-4-6`), save, restart, and confirm selection persists.
3. **Subprocess Execution**:
   - Execute prompt; verify `--model claude-sonnet-4-6` is appended to CLI arguments.
4. **Unit & Build Tests**:
   - Go tests: `go test -v ./internal/...`
   - Frontend build: `npm --prefix frontend run build`
