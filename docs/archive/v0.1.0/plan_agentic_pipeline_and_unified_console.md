# Implementation Plan: Unified Agentic Console, Pipeline Stepper & Interactive Q&A Loop

Comprehensive implementation plan (Phase 12) unifying requirements engineering into a cohesive, ergonomic **Agentic AI Workspace**.

---

## 1. Goal Description
Transforming the desktop workspace into an interconnected system across document navigation, multi-agent canvas, and requirements persistence:
1. **Unified Prompt Console**:
   - Eliminate redundant persona tab bars from the top of the canvas, liberating vertical screen real estate.
   - Relocate **Persona Selector** and **Interaction Mode Selector** controls directly into the **Elevated Prompt Console** at the bottom (alongside paperclip attachments, prompt input, and send actions).
2. **Slash Commands Autocomplete System (`/`)**:
   - Autocomplete command popover triggered by typing `/` in the prompt input (`/plan`, `/discovery`, `/exec`, `/prd`, `/srs`, `/arch`, `/design`, `/validate`, `/clear`).
3. **Interactive Clarification Cards in Chat Bubble (The Q&A Loop)**:
   - Render AI clarification questions directly inside assistant bubbles as interactive forms. Users answer inline, turning cards green (`Confirmed Answer`) and persisting data to SQLite.
4. **Project Pipeline Stepper (Visual Lifecycle Progress)**:
   - Slim horizontal progress bar across the top of the canvas:
     `[1. Discovery] ➔ [2. PRD] ➔ [3. SRS] ➔ [4. Architecture] ➔ [5. Design System]`
     reflecting authentic document states (*Draft*, *Approved*, *Locked/Gated*, *Outdated*).
5. **AI Pipeline Readiness Recommender (Next-Best-Action)**:
   - When discovery accumulates sufficient confirmed requirements (>= 3 items), AI renders a recommendation card in chat: *"Baseline requirements established. Ready to generate PRD?"* with a 1-click `[Generate PRD Now]` action.
6. **Web Reference Harnessing for UI/UX Agent**:
   - Detect external reference URLs (e.g. `https://linear.app`, `https://stripe.com`) in UI/UX prompts to extract color tokens, typography scales, and component aesthetics into `design.md`.

---

## 2. Component Architecture & UI Layout

```
+----------------------------------------------------------------------------------------------------+
|  [Logo] Requirements Studio   |  [Project Tab: E-Commerce X]  [+]              v1.5.5  [Panels] [⚙️]  |
+-------------------+----------------------------------------------------+---------------------------+
| WORKSPACE         | [1. Discovery ✓] ➔ [2. PRD ● Active] ➔ [3. SRS 🔒]...| REQUIREMENTS (6)      [x] |
|                   +----------------------------------------------------+---------------------------+
|  Chat Discovery   |                                                    |                           |
|  PRD Document     |  [Chat Feed]                                       |  +---------------------+  |
|  SRS Doc     [🔒] |  Bot: "I analyzed your checkout brief..."          |  | REQ-001 [Must Have] |  |
|  Arch        [🔒] |  +----------------------------------------------+  |  | Multi-channel Pay   |  |
|  Design Sys  [🔒] |  | ❓ Clarification Needed (Q&A Loop)           |  |  | [Approve] [Reject]  |  |
|                   |  | Q: What is the auto-cancel timeout window?   |  |  +---------------------+  |
| ----------------- |  | [ Input: 15 minutes__________ ] [Submit]     |  |                           |
| ACTIVE PROJECT    |  +----------------------------------------------+  |  Validation: 0 Issues     |
| E-Commerce App    |                                                    |  Traceability: 100%       |
|                   |  +----------------------------------------------+  |                           |
|                   |  | 💡 AI Pipeline Recommendation:               |  |                           |
|                   |  | "5 requirements confirmed. Ready for PRD!"   |  |                           |
|                   |  | [ 📄 Generate Draft PRD (20 Sections) ]      |  |                           |
|                   |  +----------------------------------------------+  |                           |
|                   +----------------------------------------------------+                           |
|                   | (Unified Prompt Console)                           |                           |
|                   | [👤 Product Analyst ▾]  [🔍 Discovery ▾]  [💡 /]   |                           |
|                   | +------------------------------------------------+ |                           |
|                   | | [📎] Type instructions or / for commands...    | |                           |
|                   | +------------------------------------------------+ |                           |
+-------------------+----------------------------------------------------+---------------------------+
```

---

## 3. Proposed Changes

### Component 1: Unified Prompt Console & Slash Commands (`frontend/src/App.tsx`)
#### [MODIFY] `frontend/src/App.tsx`
1. **Remove Persona Tab Bar from Canvas Header**.
2. **Embed Persona & Mode Controls in Prompt Console**:
   - Above the text input field, render a compact toolbar:
     - Persona Selector Pill: `[👤 Product Analyst ▾]` with popover menu for 4 specialists.
     - Mode Selector Pill: `[🔍 Discovery Mode ▾]` / `[⚡ Execution Mode]`.
     - Shortcut hint: *"Type / for quick actions"*.
3. **Slash Commands Autocomplete Popover**:
   - Detect input starting with `/`.
   - Render floating popover with 10 actions:
     - `/discovery`, `/exec`, `/plan`, `/clarify`, `/prd`, `/srs`, `/arch`, `/design`, `/validate`, `/clear`.
   - Support keyboard navigation (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`).

---

### Component 2: Interactive Clarification Cards in Chat Bubble (`frontend/src/App.tsx`)
#### [MODIFY] `frontend/src/App.tsx`
1. Inside assistant bubble rendering:
   - Link open clarification items belonging to the project/message.
   - Render interactive card:
     - Badge: `Clarification Needed (Q&A Loop)` (amber).
     - Question text.
     - Inline text input + `Submit Answer` button.
   - Upon submission:
     - Card updates to green theme: `Confirmed Answer`.
     - Displays confirmed answer.
     - Invokes `RequirementService.AnswerClarification` in SQLite and refreshes project context.

---

### Component 3: Project Pipeline Stepper & AI Readiness Recommender (`frontend/src/App.tsx`)
#### [MODIFY] `frontend/src/App.tsx`
1. **Pipeline Stepper Bar**:
   - Slim horizontal bar across the canvas header:
     - Step 1: `Discovery` (Completed when requirements >= 3).
     - Step 2: `PRD` (`Draft` / `Approved`).
     - Step 3: `SRS` (`Locked` if PRD unapproved; `Approved` when verified).
     - Step 4: `Architecture` (`Locked` if PRD unapproved).
     - Step 5: `Design System` (`Locked` if PRD unapproved).
   - Clicking unlocked steps navigates directly to the corresponding document.
2. **AI Pipeline Readiness Card**:
   - In chat feed, if `requirements.length >= 3` and no PRD exists:
     - Render recommendation card:
       *"Baseline requirements established. We recommend generating the PRD."*
     - 1-click button: `[📄 Generate Draft PRD (20 Sections)]` calling `handleGeneratePRD()`.

---

### Component 4: Web Reference Prompt Enrichment (`internal/ai/discovery.go`)
#### [MODIFY] `internal/ai/discovery.go`
- In `BuildDiscoveryPrompt`, inject guidance when user messages include URLs (`http://` or `https://`):
  > *"When user provides external web references or URLs, extract visual patterns, color tokens, layout aesthetics, and component hierarchy to be harnessed into the Design System."*

---

## 4. Verification Plan

### Automated Tests
1. **Frontend Compilation**:
   ```bash
   cd frontend && npm run build
   ```
   *Expectation: 0 TypeScript errors, clean Vite build.*
2. **Go Backend Unit Tests**:
   ```bash
   go test -v ./internal/...
   ```
   *Expectation: All 13 unit test suites pass (100% PASS).*
3. **Desktop Native Compilation**:
   ```bash
   wails3 task build
   ```

### Manual Verification
1. **Unified Prompt Console**:
   - Verify top of canvas is clean.
   - Toggle persona pills (Product Analyst, System Analyst, Software Architect, UI/UX Agent).
   - Toggle interaction modes (Discovery vs Execution).
2. **Slash Commands**:
   - Type `/` to confirm popover appears with 10 commands.
   - Press Enter on `/prd` to initiate generation.
3. **Interactive Clarification Loop**:
   - Submit brief in chat; verify question card renders inside bubble.
   - Submit inline answer; verify card turns green as Confirmed.
4. **Pipeline Stepper & AI Recommendation**:
   - Observe pipeline stepper reflect project state.
   - Confirm PRD readiness card appears once requirements threshold is met.
