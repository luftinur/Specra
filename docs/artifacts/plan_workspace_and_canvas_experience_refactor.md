# Implementation Plan: Workspace & Main Canvas Experience Refactor

Reconstructing the core desktop experience of **Specra (AI Requirements Studio)** based on UX/UI design audits:
1. **Unified Hero Empty State & Dual Action Elimination** when no active project is open.
2. **Layered Elevation 3-Pane Workspace** (Left Sidebar `bg-panel/75`, Center Stage `bg-surface rounded-xl shadow-xs`, Right Inspector `bg-panel/60`).
3. **Segmented Pill Tabs for Specialist Agents** (High-contrast pills with concise badges: `PRD`, `SRS`, `Arch`, `Design`).
4. **Gated Status Redesign** (Replacing loud amber `GATED` text with minimalist `Lock` icons).
5. **Unified Elevated Chat Input Card** (Floating prompt container with integrated attachments and send actions).
6. **Illustrated Empty State for Requirements Panel** (Visual guides for requirement discovery).
7. **Titlebar Spacing & Visual Balance** (Consistent margins across window controls and tabs).

---

## 1. Goal Description

### Core UX Issues Identified:
1. **Competing Dual Primary Actions on Empty State**: Conflicting `+ Open Project` buttons in sidebar and canvas.
2. **Flat 3-Pane Depth**: Identical plain backgrounds lacked visual hierarchy across columns.
3. **Crowded Specialist Chips**: Agent tabs lacked clear typographic hierarchy and contrast.
4. **Loud Gated Warnings**: Bright orange `GATED` labels gave the appearance of system errors rather than phased approval milestones.
5. **Isolated Chat Input**: Detached textfield design.
6. **Sparse Requirements Empty State**: Plain empty states without actionable cues.

---

## 2. Reconstructed Visual Architecture

1. **Hero Empty State in Center Canvas**:
   - Illustrated container with icon (`FolderKanban` / `Layers`).
   - Title: `"Welcome to Specra"`.
   - Subtitle: *"Select an existing project or create a new workspace to start AI-driven requirements engineering."*
   - Two balanced actions: Primary `Open Project Manager` & Secondary `+ Create New Project`.
   - **Recent Projects Quick Grid**: 2–3 recent project cards for 1-click access.
   - Left Sidebar: Clean contextual instruction when idle without competing buttons.
2. **Segmented Pill Tabs for Specialist Switcher**:
   - Active state: `bg-primary-soft text-primary font-semibold border border-primary/30 shadow-2xs`.
   - Concise role badges: `PRD` (Product), `SRS` (System), `Arch` (Architect), `Design` (UI/UX).
3. **Sidebar Gated Status -> Minimalist Lock Icon 🔒**:
   - Subtle `Lock` icon (`text-muted-2`) conveying phased gating calmly.
4. **Unified Elevated Chat Input Card**:
   - Floating card: `bg-surface border border-border rounded-2xl shadow-sm p-2 flex items-center gap-2`.
5. **Requirements Illustrated Empty State**:
   - Helpful guide with skeleton card previews.

---

## 3. Proposed Changes

### Frontend UI (`frontend/src/App.tsx`)

#### [MODIFY] `frontend/src/App.tsx`

1. **TitleBar Header Spacing**:
   - Balanced `mx-2.5` margins between window controls, project tabs, and branding.
2. **Sidebar Navigation Gated Status**:
   - Replace loud `Gated` labels with clean `<Lock size={12} />` icons.
3. **Center Canvas Hero Empty State**:
   - Unified Hero box with primary actions and recent project cards.
4. **Specialist Agent Switcher Pill Tabs**:
   - High-contrast segmented pill controls with concise role badges (`PRD`, `SRS`, `Arch`, `Design`).
5. **Unified Elevated Chat Input Card**:
   - Encapsulate paperclip attachment, input field, and send buttons into an elevated card.
6. **Requirements Panel Illustrated Empty State**:
   - Guidance cards and placeholder dashed frames.
7. **3-Pane Layered Background Depth**:
   - Outer shell: `bg-chrome`.
   - Center Canvas: `bg-surface rounded-[12px] border border-border shadow-xs`.
   - Right Inspector: `bg-panel/60 border border-border rounded-[10px]`.

---

## 4. Verification Plan

### Automated Tests
1. TypeScript check: `npm --prefix frontend run build` (0 errors).
2. Go tests: `go test ./internal/...` (100% PASS).

### Manual Verification
1. Test **Empty State** with no open projects: Confirm Hero box, recent project cards, and unified navigation.
2. Open active workspace:
   - Confirm 3-pane visual depth between sidebar, canvas, and inspector.
   - Confirm agent switcher pills and minimalist lock icons on gated documents.
   - Confirm elevated chat prompt container and illustrated empty state in right inspector.
