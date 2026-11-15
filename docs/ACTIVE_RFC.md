# Active RFC: Relocate Pipeline to Left Sidebar & Accordion Co-Pilot Inspector

## 1. Goal Description & Problem Statement
User feedback & request:
> *"untuk generate pipeline kenapa ga di taro di sebelah kiri aja sih di sidebar utama, daripada di tab pipeline & audit, oya sidebar kanan daripada tab kenapa ga accordion aja sih, tiap satu dibuka yang satu nutup, dan masing2 bisa di scroll"*

### Key Problems with Current Layout:
1. **Pipeline Actions Hidden in Sub-Tab**:
   - To trigger full pipeline generation or inspect pipeline progression, users currently have to open the right-hand panel (Project Co-Pilot) and switch to the `Pipeline & Audit` tab.
   - However, the **Left Sidebar (Sidebar Utama)** already serves as the main navigation hub for the project's specifications (PRD, SRS, Architecture, Design).
   - Moving the **Pipeline Controls & Stepper Actions** to the Left Sidebar aligns document navigation directly with pipeline execution (e.g. *"Generate Full Pipeline"* / stage progress).
2. **Right Sidebar Tab Switching Friction**:
   - The Right Sidebar currently uses 3 static horizontal tabs (`Requirements`, `Q&A & Assumptions`, `Pipeline & Audit`).
   - Tabs completely hide other context. Switching tabs requires clicking back and forth.
   - An **Accordion (Single-Expanded / Mutually Exclusive)** architecture allows users to see all co-pilot categories stacked neatly with live status badges.
   - Expanding one automatically collapses the others ("tiap satu dibuka yang satu nutup"), and the active panel expands to fill the viewport with its own independent scroll container ("dan masing2 bisa di scroll").

---

## 2. Technical Architecture & UI Redesign

### Track A: Pipeline Controls in Left Sidebar (Sidebar Utama)
1. **Enhanced "Specifications & Pipeline" Section**:
   - Group Header: `Specifications & Pipeline` with a live progress pill (e.g., `2/4 Approved` or `Ready`).
   - **Prominent Pipeline Trigger Card**:
     - When idle: `[⚡ Run Full Pipeline]` (One-click autonomous generation: Discovery ➔ PRD ➔ SRS ➔ Architecture ➔ Design).
     - When generating: Animated pulse banner showing current running stage (e.g., `⚡ Generating SRS... [Cancel]`).
     - When paused on clarification: Warning badge prompting user to resolve questions.
   - **Document Tree with Integrated Pipeline Status**:
     - `💬 Chat Co-Pilot` (Discovery entry)
     - `1. PRD Document` (Status: Approved / Draft / None)
     - `2. SRS Document` (Status: Approved / Draft / Locked / Outdated)
     - `3. Architecture` (Status: Approved / Draft / Locked)
     - `4. Design System` (Status: Approved / Draft / Locked)

---

### Track B: Project Co-Pilot Accordion (Right Sidebar)
1. **Mutually Exclusive Accordion State**:
   - `openSection: 'requirements' | 'clarifications' | 'assumptions' | 'audit' | null`
   - Default: `'requirements'` (or `'clarifications'` if there are pending unanswered questions).
   - Interaction rule: Clicking an unopened accordion header expands it and collapses the currently open one. Clicking an open accordion header collapses it (or toggles).
2. **Independent Scroll Containers**:
   - The outer Co-Pilot panel is `flex flex-col h-full overflow-hidden`.
   - Collapsed accordion items render as compact header strips (`h-10` or `py-2.5 px-3`) with:
     - Left: Category Icon + Title (`Requirements Backlog`, `Questions & Clarifications`, `Assumptions & Constraints`, `Integrity & Audit`).
     - Right: Badge counter (e.g. `12 Reqs`, `2 Pending`, `4 Assumptions`, `0 Conflicts`) + Chevron indicator (`ChevronDown` / `ChevronRight`).
   - The expanded accordion item takes `flex-1 min-h-0 flex flex-col`:
     - Quick action toolbar (e.g. `+ Ekstrak AI` for requirements, `Re-Audit` for validation).
     - Body: Dedicated internal scrollable view (`overflow-y-auto no-scrollbar` or custom scroll) taking full available height.

---

## 3. Proposed File Changes

| Component | Target File | Description |
|-----------|-------------|-------------|
| UI Layout & State | `frontend/src/App.tsx` | 1) Move `runAutoPipeline` trigger and pipeline status card to Left Sidebar under Specifications.<br>2) Refactor Right Sidebar tabs into a 4-item single-open accordion with independent scrolling. |
| Living Docs | `docs/ARCHITECTURE.md` | Update Frontend Architecture section with new Left Sidebar Pipeline and Accordion Co-Pilot specs. |
| Ledger | `docs/CHANGELOG.md` | Add entry for Left Sidebar Pipeline and Accordion Inspector. |

---

## 4. Verification Plan

1. **Frontend Strict Typecheck & Build**:
   - `cd frontend && npm run build` (Ensure zero TypeScript errors).
2. **Backend Integrity Tests**:
   - `go test -v ./internal/...` (Ensure no regressions).
3. **Manual Interaction Verification**:
   - Left Sidebar: Verify `Run Full Pipeline` button triggers pipeline correctly and displays active stage.
   - Right Sidebar Accordion:
     - Click `Questions & Clarifications`: verify it opens and `Requirements` closes.
     - Scroll inside requirements or Q&A: verify independent scrolling works smoothly.
     - Verify counter badges remain visible on collapsed headers.
