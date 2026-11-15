# Implementation Plan: Adaptive 4-Edge Viewport, Chat Text Selection, and OpenCode Response Normalization

## 1. Goal Description

This plan resolves three primary user requirements:
1. **Adaptive 4-Edge Viewport Containment & HiDPI Scaling Fix**:
   - Eliminate off-screen shifting during zoom by removing viewport units `w-screen` (`100vw`) and `h-screen` (`100vh`).
   - Lock the application shell (`#root`, `body`, `.m3`) with `position: fixed; inset: 0; width: 100%; height: 100%;` ensuring all 4 edges (*top, bottom, left, right*) precisely adhere to the native desktop window boundaries.
   - Lock document scroll coordinates to `(0, 0)` consistently.
2. **Chat Text Selection**:
   - Remove global `select-none` from the `.m3` root element.
   - Restrict `select-none` strictly to window chrome controls (TitleBar, Sidebar items, Tabs).
   - Explicitly apply `select-text` (`user-select: text`) to chat bubbles (user messages, AI assistant responses, and Markdown viewers), enabling effortless mouse selection and copying.
3. **OpenCode CLI Response Normalization**:
   - OpenCode CLI (`opencode run --format json`) outputs newline-delimited JSON (NDJSON) or nested event objects (`{"type":"text","part":{"text":"..."}}`).
   - The parser previously fell back to dumping raw JSON into the chat bubble on multi-event streams.
   - Refactor the OpenCode adapter parser to extract clean conversation text and reinforce `ParseDiscoveryOutput` to separate conversational replies from requirements/clarifications entities.

---

## 2. User Review Required

> [!IMPORTANT]
> **Layout & Interaction Guarantees**:
> - **Text Selection**: All text inside chat bubbles and document specifications is freely selectable and copyable via mouse cursor.
> - **4-Edge Viewport Integrity**: Titlebar, sidebar, right inspector, and chat prompt bar will never shift off-screen across any zoom level (Auto HiDPI, 90%–125%, `Ctrl +`, `Ctrl -`).
> - **OpenCode Responses**: Responses from `opencode` render as natural Markdown chat messages, never as raw JSON blocks.

---

## 3. Proposed Changes

### A. Frontend Stylesheet & Root Shell ([`frontend/src/index.css`](file:///E:/dev-agent-assistant/frontend/src/index.css) & [`frontend/src/App.tsx`](file:///E:/dev-agent-assistant/frontend/src/App.tsx))

#### [MODIFY] `frontend/src/index.css`
- Replace `height: 100vh; width: 100%;` with `position: fixed; inset: 0; width: 100%; height: 100%; max-width: 100%; max-height: 100%; overflow: hidden;`.
- Add explicit text selection utility:
```css
.select-text, .select-text * {
  user-select: text !important;
  -webkit-user-select: text !important;
}
```

#### [MODIFY] `frontend/src/App.tsx`
- **Line 1513**:
  Replace:
  `<div className="m3 flex flex-col h-screen w-screen overflow-hidden text-fg select-none">`
  With:
  `<div className="m3 flex flex-col w-full h-full overflow-hidden text-fg">` (removing `select-none`, `w-screen`, and `h-screen`).
- **Lines 2095–2117 (Chat Bubbles)**:
  Add `select-text` class to user and assistant bubbles:
  ```tsx
  <div className="max-w-[75%] rounded-[8px] px-3.5 py-2.5 bg-fill text-fg border border-border/60 leading-relaxed whitespace-pre-wrap shadow-2xs text-[13px] select-text">
    {m.content}
  </div>
  ...
  <div className="leading-relaxed text-fg-2 text-[13px] select-text">
    <MarkdownViewer content={m.content} isDark={isCurrentDark} />
  </div>
  ```
- **Lock Scroll Coordinates to (0, 0)**:
  Add scroll reset logic across `applyFontScale`, window `resize`, and global `scroll` handlers:
  ```ts
  window.scrollTo(0, 0);
  document.documentElement.scrollLeft = 0;
  document.documentElement.scrollTop = 0;
  document.body.scrollLeft = 0;
  document.body.scrollTop = 0;
  ```

---

### B. HiDPI Scaling Two-Axis Fit ([`frontend/src/lib/uiScale.ts`](file:///E:/dev-agent-assistant/frontend/src/lib/uiScale.ts))

#### [MODIFY] `frontend/src/lib/uiScale.ts`
- Implement Two-Axis Fit calculation:
  ```ts
  const DESIGN_WIDTH = 1200;
  const DESIGN_HEIGHT = 800;

  export function getAdaptiveZoomFactor(width: number, height: number): number {
    const fit = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    if (fit >= 1.25) return 1.15;
    if (fit >= 1.10) return 1.08;
    if (fit >= 1.00) return 1.00;
    return Math.max(0.90, Number(fit.toFixed(2)));
  }
  ```

---

### C. OpenCode CLI Output Extraction ([`internal/ai/adapters/opencode/adapter.go`](file:///E:/dev-agent-assistant/internal/ai/adapters/opencode/adapter.go))

#### [MODIFY] `internal/ai/adapters/opencode/adapter.go`
- Enhance `generateCLI` to parse multi-line NDJSON and nested parts:
  ```go
  lines := strings.Split(content, "\n")
  var accumulated strings.Builder
  for _, line := range lines {
      line = strings.TrimSpace(line)
      if line == "" {
          continue
      }
      var ev struct {
          Type string `json:"type"`
          Text string `json:"text"`
          Part struct {
              Text string `json:"text"`
          } `json:"part"`
          Content string `json:"content"`
          Message string `json:"message"`
      }
      if err := json.Unmarshal([]byte(line), &ev); err == nil {
          if ev.Part.Text != "" {
              accumulated.WriteString(ev.Part.Text)
          } else if ev.Text != "" {
              accumulated.WriteString(ev.Text)
          } else if ev.Content != "" {
              accumulated.WriteString(ev.Content)
          } else if ev.Message != "" {
              accumulated.WriteString(ev.Message)
          }
      }
  }
  if accumulated.Len() > 0 {
      content = accumulated.String()
  }
  ```

---

### D. Chat Discovery Parsing Robustness ([`internal/ai/discovery.go`](file:///E:/dev-agent-assistant/internal/ai/discovery.go))

#### [MODIFY] `internal/ai/discovery.go`
- Extend `ParseDiscoveryOutput` to handle standard LLM response shapes:
  ```go
  var genericMap map[string]any
  if err := json.Unmarshal([]byte(jsonCandidate), &genericMap); err == nil {
      if reply, ok := genericMap["reply"].(string); ok && reply != "" {
          braceRes.Reply = reply
      } else if msg, ok := genericMap["message"].(string); ok && msg != "" {
          braceRes.Reply = msg
      } else if text, ok := genericMap["content"].(string); ok && text != "" {
          braceRes.Reply = text
      }
  }
  ```

---

## 4. Verification Plan

### Automated Tests
1. **Backend Unit & Parser Tests**:
   ```bash
   go test -v ./internal/ai/...
   go test -v ./internal/services/...
   ```
   *Expectation: 100% PASS for NDJSON parsing, TOON tokenization, and Discovery parsers.*
2. **Frontend Build Verification**:
   ```bash
   cd frontend && npm run build
   ```
   *Expectation: 0 TypeScript errors.*

### Manual Verification
1. **Text Selection**: Select and copy text from chat bubbles and assistant responses.
2. **Adaptive 4 Edges**: Adjust zoom scale to `Auto (Adaptive HiDPI)`, `115%`, `125%`; confirm window controls, sidebar, and input bar remain locked inside window boundaries.
3. **OpenCode CLI**: Send message with OpenCode provider active; verify natural Markdown reply renders without raw JSON wrappers.
