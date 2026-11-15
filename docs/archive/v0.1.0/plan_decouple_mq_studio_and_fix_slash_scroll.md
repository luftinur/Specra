# Plan: Decoupling MQ-Studio, Slash Dropup Auto-Scroll, Export All Docs, Chat Q&A Deduplication, & Adaptive HiDPI Scaling

Technical planning document addressing:
1. **AI Context Isolation (Decoupling MQ-Studio)**: Purge "MQ-Studio" references from AI reasoning, isolate CLI subprocess working directories (`cmd.Dir`) to user project workspaces, and enforce strict domain boundaries.
2. **Slash Commands (`/`) Auto-Scroll & Navigation**: Fix popover keyboard navigation (`ArrowDown`/`ArrowUp`) so the active item auto-scrolls into view (`scrollIntoView`), input focus remains intact, and scroll events do not leak into the background chat.
3. **Export All Documents**: Add batch export functionality for all specification artifacts (PRD, SRS, Architecture, Design) directly from Document Canvas or Chat View.
4. **Chat Card Deduplication**: In chat bubbles, render only **NEW / PENDING** clarification questions. Answered items clear from chat bubbles and archive into the Right Inspector.
5. **Adaptive HiDPI UI Scaling & Typography**: Resolve micro-fonts on high-resolution displays (e.g. 3072×1920 @ 175% scaling) via adaptive document zoom (`document.documentElement.style.zoom`), preset options in General Settings (`Auto HiDPI`, `14px`, `16px`, `18px`, `20px`), and zoom shortcuts (`Ctrl +`, `Ctrl -`, `Ctrl 0`).

---

## 1. Root Cause Analysis

### A. AI Context Leaking "MQ Studio"
- **Empty CLI Working Directory (`cmd.Dir`)**:
  `opencode` and `antigravity` adapters previously executed in the repo root (`E:\dev-agent-assistant`). Consequently, CLI agents ingested `AGENTS.md`, `design_system.md`, and `_ref_ui/` files describing internal developer tools, mistakenly treating MQ-Studio as the user's project subject.
- **Absence of Domain Isolation Directives**:
  Prompts lacked explicit instructions prohibiting the AI from incorporating host developer tools into user specifications.

### B. Slash Command Popover Scrolling Issues
- In `App.tsx`, `onKeyDown` handlers updated `selectedSlashIndex` without invoking `scrollIntoView` on selected items.
- Clicking popover items stole focus from the main `<input>`.
- Missing `overscroll-contain` allowed scroll chaining into background chat feeds.

### C. Export Limited to Active Document
- Export actions were previously confined to individual active document views without a batch export option.

### D. Chat Bubbles Repeating Answered Questions
- In `App.tsx`, chat render routines iterated over all clarifications, including `isAnswered = true`.

### E. Micro-Fonts on HiDPI Displays (3072×1920 @ 175%)
- Hardcoded pixel classes (`text-[10.5px]`, `text-[11px]`) rendered too small on high-density displays.
- Document-level zoom scaling (`document.documentElement.style.zoom`) was required to scale all controls proportionally.

---

## 2. Architecture & Code Changes

### Component 1: CLI Sandboxing & Context Decoupling (Go Backend)
1. **Add `WorkDir` to `ai.GenerateRequest`**:
   - `internal/ai/provider.go`: Add `WorkDir string`.
   - `internal/services/conversation_service.go` & `document_service.go`: Pass `s.workspace.ProjectDir(projectID)`.
2. **Assign `cmd.Dir = req.WorkDir` on CLI Adapters**:
   - `antigravity` & `opencode` adapters: Set `cmd.Dir = req.WorkDir` when present.
3. **Domain Isolation Prompt Directives**:
   - `internal/ai/discovery.go`:
     - Add directive: *"CRITICAL DOMAIN ISOLATION: Analyze exclusively the USER's specific product from their input. Do NOT inject Specra, MQ-Studio, or internal dev tools. Do NOT repeat answered questions."*
   - `internal/ai/document_gen.go`:
     - Inject domain isolation directives across PRD, SRS, Architecture, and Design generators.
4. **Agnostic Skill Descriptions**:
   - `internal/ai/agent_registry.go`: Ensure `semantic-design-tokens` skill is domain-agnostic.
   - `AGENTS.md` & `design_system.md`: Reaffirm MQ-Studio is purely a historical UI shell reference.

---

### Component 2: Smooth Slash Command Popover & Auto-Scroll (Frontend)
1. **Centralized Filtering via `useMemo`**:
   - Memoize `filteredSlashCommands` and clamp selection index on filter shifts.
2. **Auto-Scroll via `useRef` & `useEffect`**:
   - Bind refs to slash options and trigger `scrollIntoView({ block: 'nearest', behavior: 'smooth' })`.
3. **Prevent Focus Loss (`onMouseDown`)**:
   - Attach `onMouseDown={(e) => e.preventDefault()}` on popover options to keep cursor inside `<input>`.
4. **Scroll Isolation**:
   - Add `overscroll-contain` to popover containers.

---

### Component 3: Export All Documents Feature (Backend & Frontend)
1. **Backend Go (`internal/services/document_service.go`)**:
   - Add `ExportAllDocuments(projectID string, targetDir string) (map[string]string, error)`.
   - Exports all generated specifications (`PRD.md`, `SRS.md`, `architecture.md`, `design.md`) into `targetDir`.
2. **Frontend UI (`frontend/src/App.tsx`)**:
   - Add top-level `Export` action accessible from Chat and Document views.

---

### Component 4: Chat Q&A Deduplication
1. **Filter Pending Clarifications in Chat Feed**:
   - Filter out answered items:
     `const pendingClarifications = clarifications.filter(c => c.status !== 'answered' && !c.answer);`
   - Answered items clear from chat bubbles to maintain discussion focus.
2. **Complete History Preserved in Right Inspector**:
   - Full question histories remain inspectable under the Clarifications tab.

---

### Component 5: Adaptive HiDPI UI Scaling & Typography Engine (Frontend)
1. **Adaptive Document Zoom**:
   - Font scale ladder: `FONT_SIZES = [12, 13, 14, 15, 16, 18, 20]` with base `13px`.
   - `autoFontSize(width, height)`: Calculates aspect ratio and sets optimal zoom (~1.23–1.38 on 3072×1920 displays).
   - Apply to document root:
     `document.documentElement.style.zoom = String(scale);`
     `document.documentElement.style.setProperty('--app-base-font-size', size + 'px');`
2. **General Settings Modal Options**:
   - `Auto (Adaptive HiDPI)`
   - `Compact (13px)`
   - `Standard (14px)`
   - `Large (16px)`
   - `Extra Large (18px)`
   - `Comfort (20px)`
3. **Zoom Keyboard Shortcuts**:
   - `Ctrl +` / `Ctrl =`: Zoom In.
   - `Ctrl -`: Zoom Out.
   - `Ctrl 0`: Reset zoom.

---

## 3. Testing & Verification

| Test | Procedure | Success Criteria |
|---|---|---|
| **Backend Go Unit Tests** | Run `go test -v ./internal/...` | All suites (including `ExportAllDocuments`) pass 100%. |
| **CLI Sandbox Verification** | Execute CLI with `WorkDir` set | Subprocess runs inside project directory without reading repo root `AGENTS.md`. |
| **Prompt Decoupling Verification** | Inspect prompt outputs | Zero MQ-Studio or internal tool leakage into AI specifications. |
| **Slash Dropup Scroll** | Type `/` and press `ArrowDown` to item 10 | Active item scrolls smoothly into view. |
| **Export All Documents** | Trigger "Export All" | All 4 files (`PRD.md`, `SRS.md`, `architecture.md`, `design.md`) written to destination. |
| **Chat Deduplication** | Submit clarification answer | Card clears from chat bubble and appears under Right Inspector. |
| **HiDPI Scaling** | Test on 3072×1920 display or switch to `Large (16px)` | All controls scale up sharply and legibly. |
| **Frontend Production Build** | Run `npm run build` | Strict TypeScript compilation completes with 0 errors. |
