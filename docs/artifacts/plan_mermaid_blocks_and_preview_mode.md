# Implementation Plan: Mermaid Blocks, Auto-Detect Coding Agents & Adaptive Dropdowns

Comprehensive implementation plan covering:
1. **Interactive Mermaid Diagram Blocks & Rich Markdown Preview** across Document Workspaces (PRD, SRS, Architecture, Design System) and Chat Discovery.
2. **Default Auto-Detection of Coding Agents** in Settings Modal with instantaneous 1-click Primary Agent activation.
3. **Adaptive Upward Dropdowns** for the Persona Selector (`Product Analyst`) and Interaction Mode (`Discovery Mode`) in the bottom Unified Prompt Console to prevent bottom-edge clipping.

---

## 1. Goal Description

### A. Mermaid Diagram Blocks & Document Preview Mode
- Previously, AI-generated documents rendered as plain raw text inside `<div className="whitespace-pre-wrap">`.
- Target Capabilities:
  - **Visual Preview Mode**: Render Mermaid diagrams (C4 architecture, sequence diagrams, flowcharts) as sharp interactive SVGs.
  - **Code View Toggle**: Toggle between visual diagrams (`[👁️ Visual Diagram]`) and raw syntax (`[< > Mermaid Code]`).
  - **One-Click Copy**: `[📋 Copy Mermaid]` action copying diagram source.
  - **Zoom & Pan Controls**: Controls for zooming and resetting complex architectural diagrams.
  - **Document-Level View Mode**: Switcher `[👁️ Formatted Preview]` vs `[📝 Source Markdown]` and a `[📋 Copy Full Doc]` action.

### B. Auto-Detect Coding Agents by Default
- Automatically invoke agent discovery upon initial app load so installed coding agents (`agy`, `opencode`, Claude, Ollama) appear immediately in Settings without manual clicks.
- Support 1-click `Set as Primary` with instantaneous persistence.

### C. Adaptive Upward Dropdown Positioning
- Relocate popover rendering from `top-full mt-1` to `bottom-full mb-2` so popovers float comfortably above the bottom prompt console without clipping.

---

## 2. Proposed Changes

### A. New Frontend Modular Components

#### [NEW] `frontend/src/components/MermaidBlock.tsx`
Isolated component rendering Mermaid blocks:
- **Diagram Type Detection**: Automatically parses diagram type (`Flowchart`, `C4 Architecture`, `Sequence Diagram`, `State Diagram`, `ER Diagram`, etc.).
- **Segmented Control**: `[👁️ Visual Diagram]` / `[< > Mermaid Code]`.
- **Copy Action**: `[📋 Copy Mermaid]` with `Copied!` feedback.
- **Zoom & Pan**: `Zoom In (+)`, `Zoom Out (-)`, `Reset`.
- **Theme Awareness**: Adapts themes dynamically (*Warm Stone Light* vs *Obsidian Slate Dark*).
- **Graceful Fallback**: Catches syntax errors and displays raw syntax warning boxes without breaking UI rendering.

#### [NEW] `frontend/src/components/MarkdownViewer.tsx`
Full-featured Markdown renderer:
- Powered by `react-markdown` and `remark-gfm`.
- Connects `mermaid` code fences to `<MermaidBlock />`.
- General code blocks with language indicators and copy actions.
- Styled headings (H1-H4), tables, lists, task checkboxes, blockquotes, and links adhering to tokens.

---

### B. Modifications to `frontend/src/App.tsx`

#### 1. Adaptive Upward Dropdown Positioning
Adjust dropdown rendering positions:
```tsx
// Persona Dropdown: bottom-full mb-2
<div className="absolute bottom-full left-0 mb-2 w-64 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 divide-y divide-border/50 animate-in fade-in slide-in-from-bottom-2">
  ...
</div>

// Mode Dropdown: bottom-full mb-2
<div className="absolute bottom-full left-0 mb-2 w-64 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 divide-y divide-border/50 animate-in fade-in slide-in-from-bottom-2">
  ...
</div>
```

#### 2. Auto-Detect Coding Agents by Default
- Trigger `handleDetectAgents()` during initial boot in `loadProviderStatus()`.
- Add `handleSelectPrimaryAgent(agentId: string)` bound to `Set as Primary` buttons on agent cards.

#### 3. Document Workspace Markdown & Mermaid Integration
- Add `docDisplayMode: 'preview' | 'source'` (default `'preview'`).
- In Document Controls: Add `[👁️ Preview]` / `[📝 Source]` toggle and `[📋 Copy Full Doc]` action.
- In Document Content: Replace `whitespace-pre-wrap` with `<MarkdownViewer content={activeDocDetails.current_version.content} isDark={isCurrentDark} />`.
- In Chat Messages: Render assistant messages via `<MarkdownViewer />` for in-chat diagram rendering.

---

## 3. Verification Plan

### Automated Tests
1. **Frontend Compilation**:
   ```bash
   cd frontend && npm run build
   ```
   *Expectation*: 0 TypeScript errors.
2. **Backend Regression Tests**:
   ```bash
   go test -v ./internal/...
   ```
   *Expectation*: All 13 test suites pass 100%.

### Manual Verification
1. **Adaptive Dropdown Positioning**:
   - Open Chat Discovery; click `[👤 Product Analyst ▾]` and `[🔍 Discovery Mode ▾]`; verify popovers render upwards above the console.
2. **Auto-Detect Coding Agents**:
   - Open Settings > AI Providers; verify host agents display automatically with active primary indicators.
3. **Mermaid Blocks & Document Preview**:
   - Open PRD, SRS, or Architecture documents containing Mermaid code blocks.
   - Verify SVG diagrams render sharply with zoom and code toggle functionality.
   - Switch themes; verify Mermaid diagram styling updates smoothly.
