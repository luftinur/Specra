# AGENTS.md — Mandatory Guidelines for AI Agents & Developers

This document serves as the **Authoritative Guidelines & Primary Source of Truth** for all AI Coding Agents and developers contributing to the **Specra (`Specra` / `dev-agent-assistant`)** repository. Every agent must read, strictly adhere to, and enforce all rules outlined below prior to and during any codebase modifications.

---

## 1. Project Mission & Identity

- **Application Name**: Specra (AI Requirements Studio)
- **Application Type**: Desktop Application (Local-first, Chat-first)
- **Primary Objective**: A personal requirements engineering workspace that transforms user ideas and project briefs into structured, production-ready system specifications: PRD (20 sections), SRS (22 sections), System Architecture (16 sections), and Design System (16 sections).
- **Core Technology Stack**:
  - **Backend Core**: Go 1.24+ / 1.27+ (Modular domain services, SQLite WAL mode, OS keyring credential storage)
  - **Desktop Shell**: Wails v3 (Native WebKit/Cocoa on macOS, WebView2 on Windows)
  - **Frontend UI**: React 19, TypeScript (Strict Mode), Tailwind CSS v3/v4
  - **Design System Tokens**: MQ-Studio 0.4.2 Token Scale (`src/design/tokens.css`, Warm Stone / Obsidian Slate / System Auto). *(Policy Note: MQ-Studio is purely a technical styling reference for the application shell during early development; it is NOT the subject, benchmark, or domain of user project specifications).*
  - **AI Provider Integrations**: Pure Real AI execution (Antigravity CLI `agy`, OpenCode CLI `opencode`, Google Gemini 1.5/2.5 REST API) — **Zero-Mock Policy**.
  - **Strict Domain Isolation**: All AI prompts and subprocess executions must run in isolated sandboxes (`cmd.Dir` in the user project directory). Leaking internal developer context (MQ-Studio / Specra dev tools) into user specification documents is strictly prohibited.

---

## 2. Mandatory Artifact & Context History Synchronization Protocol

Every AI Agent executing instructions, bug fixes, or feature additions **MUST** strictly follow this documentation protocol:

### A. Planning Artifact Synchronization (`docs/artifacts/`)
1. Whenever creating or updating planning files (`/plan`, architecture designs, PRD/SRS audits, UI refactors, or walkthroughs) within Antigravity's internal directory (`~/.gemini/antigravity-cli/brain/<conversation-id>/`), an exact copy **MUST be immediately synchronized** to:
   ```text
   docs/artifacts/<filename>.md
   ```
2. Leaving planning documents only in temporary internal scratch folders without persisting them to `docs/artifacts/` is strictly prohibited.

### B. Conversation Transcript Serialization (`docs/context_history/`)
1. **Never overwrite** previous session transcript files.
2. Transcript history is serialized by development session and environment:
   - `transcript_01_windows.jsonl`: Initial desktop development session on Windows (Phases 1–6, 1,963 steps).
   - `transcript_02_macos.jsonl`: Migration session on macOS (formalization of `AGENTS.md` and Mac dev environment setup).
   - `transcript_03_<topic>.jsonl`: Subsequent sessions sequentially numbered according to feature milestones.
3. At the end of a session or milestone, copy the active transcript file from:
   `~/.gemini/antigravity-cli/brain/<conversation-id>/.system_generated/logs/transcript.jsonl`
   to the next sequential file in `docs/context_history/`.

### C. Master Catalog Maintenance (`docs/README.md`)
Whenever any file is added to `docs/artifacts/` or `docs/context_history/`, the agent must update the document catalog in [`docs/README.md`](./docs/README.md).

---

## 3. Specialist Personas & Interconnected Pipeline

The system features 4 Specialist Personas organized in a cascading, upstream-to-downstream context inheritance pipeline:

1. **Product Analyst Agent (`product-analyst`)**:
   - Leads the initial Discovery phase from user briefs and raw ideas.
   - Responsible for generating and revising the **`PRD.md` (20 Sections)**.
   - Defines target personas, user journeys, and MoSCoW prioritization.
2. **System Analyst Agent (`system-analyst`)**:
   - Inherits full context from the approved PRD (*Approved PRD*).
   - Responsible for generating the **`SRS.md` (22 Sections)** complying with IEEE 830 standards.
   - Models functional requirements (FR-xxx), non-functional requirements, data schemas, and the *Traceability Matrix*.
3. **Software Architect Agent (`software-architect`)**:
   - Inherits full context from both PRD and SRS.
   - Responsible for generating the **`architecture.md` (16 Sections)**.
   - Produces C4 Mermaid diagrams, API contracts (REST/gRPC), scalability strategies, and STRIDE threat modeling.
4. **UI/UX Agent (`ui-ux-agent`)**:
   - Inherits context from PRD (personas), SRS (flows), and Architecture.
   - Responsible for generating the **`design.md` (16 Sections)**.
   - Establishes Semantic Design Tokens, screen flow diagrams (Mermaid), atomic component specs, and WCAG 2.2 AA compliance.

### Approval Gating Rules:
- Downstream documents (SRS, Architecture, Design) are **locked and protected** until upstream documents (PRD) are marked as `Approved`.
- If a major revision occurs on an approved PRD, downstream documents are automatically marked as `Outdated` and must be regenerated to reflect the latest context.

---

## 4. Coding & Architecture Rules

1. **Zero-Mock Policy & Real Fail-Fast**:
   - Producing synthetic/mock AI responses in production code or silent fallbacks is strictly forbidden.
   - If AI CLIs (`agy`, `opencode`) or REST APIs encounter an error, the system must surface the real error immediately to the UI so it is transparent and actionable for the user.
2. **Strict TypeScript & No `any`**:
   - All Wails bindings in `frontend/bindings/` and React components must be strictly typed.
   - Using the `any` type without compelling technical justification is prohibited.
3. **High-Contrast Typography & Design System**:
   - Follow the MQ-Studio `tokens.css` token scale: base typography **`14px/1.55`**, no micro-fonts (prohibit `text-[10px]`, minimum `12px`).
   - Text colors must maintain high contrast passing WCAG AA standards (Light: `--c-fg: #171513`, Dark: `--c-fg: #f7f5f3`).
   - Always support 3 themes: Light Warm Stone, Dark Obsidian Slate, and System Auto.
4. **Local-First & Path Traversal Security**:
   - All project data is stored locally under `workspaces/projects/{id}/`.
   - File attachment and document operations must prevent path traversal attacks (`filepath.Clean` and sandboxed directory enforcement).
5. **Credential Security**:
   - API keys (Gemini/OpenAI) must be stored securely using OS Keyring (Windows Credential Manager / macOS Keychain) or encrypted SQLite. Never log or leak API keys in plain text.

---

## 5. Development & Testing Commands

### On macOS / Linux:
```bash
# Frontend
cd frontend && npm install
npm run build

# Backend Tests
go test -v ./internal/...

# Dev Mode (Wails v3)
wails3 dev -config ./build/config.yml -port 9245

# Native Build
wails3 task build
```

### On Windows (PowerShell):
```powershell
# Frontend
cd frontend; npm install; npm run build

# Backend Tests
go test -v ./internal/...

# Dev Mode (Wails v3)
wails3 dev -config ./build/config.yml -port 9245
```
