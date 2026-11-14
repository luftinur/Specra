# Implementation Plan: AI Agent Rules (AGENTS.md) & macOS Development Continuity

Formalizing the official AI Agent guidelines (`AGENTS.md`), standardizing automatic synchronization of *artifacts* and *context history* to `docs/`, and preparing development continuity across macOS environments.

---

## 1. Goal Description

Based on comprehensive repository audits:
1. **Status of `AGENTS.md`**: Formal authoritative agent rules were previously uncommitted, requiring strict documentation protocol codification for AI agents.
2. **macOS Development Continuity**: The project was originally engineered and tested on Windows (`Go 1.27.3 + Wails v3 + React + Vite`). Migrating development to macOS requires:
   - Codifying `AGENTS.md` enforcing artifact and history synchronization.
   - Synchronizing planning artifacts and active transcripts to `docs/artifacts/` and `docs/context_history/`.
   - Configuring local dependencies on macOS (`Go`, `npm install` for frontend).

---

## 2. User Review Required & Decisions Made

> [!IMPORTANT]
> **Approved Decisions:**
> 1. **Transcript History Strategy**: Transcript history is **serialized by session and environment** to prevent overwrites and preserve trajectory integrity:
>    - `docs/context_history/transcript_01_windows.jsonl`: Windows initial session logs (Phases 1–6, 1,963 steps).
>    - `docs/context_history/transcript_02_macos.jsonl`: macOS migration and setup session logs.
> 2. **Mandatory Synchronization to `docs/artifacts/`:**
>    Every AI Agent must immediately mirror all planning and walkthrough files from internal agent memory to `docs/artifacts/<filename>.md`.

---

## 3. macOS Development Setup Workflow

To run `wails3 dev` or `npm run dev` on macOS:
1. **Frontend Install**:
   ```bash
   cd frontend && npm install
   ```
2. **Go & Wails v3 CLI Install**:
   ```bash
   brew install go go-task
   go install github.com/wailsapp/wails/v3/cmd/wails3@latest
   export PATH=$PATH:$(go env GOPATH)/bin
   ```
3. **Build & Dev Verification**:
   ```bash
   wails3 dev
   ```

---

## 4. Proposed Changes

### Documentation & AI Agent Governance

#### [NEW] `AGENTS.md`
Creates the authoritative guidelines for all AI Coding Agents and developers in the repository root:
1. **Mission & Identity**: Desktop App Wails v3 + React 19 + TypeScript + Go + SQLite + MQ-Studio Token System.
2. **4 Specialist Personas**: Product Analyst, System Analyst, Software Architect, UI/UX Agent.
3. **Mandatory Artifact & History Protocol**:
   - Enforce artifact mirroring to `docs/artifacts/`.
   - Enforce transcript history recording in `docs/context_history/`.
   - Maintain master index in `docs/README.md`.
4. **Engineering Standards**:
   - Zero-Mock execution (Pure real AI & fail-fast).
   - Strict TypeScript & no `any`.
   - High-contrast WCAG AA typography standards (14px base, anti-washed out colors).
   - Credential store security (OS keyring / SQLite).

---

#### [MODIFY] `docs/README.md`
- Link and reference `AGENTS.md`.
- Catalog all `docs/artifacts/` entries with clear technical summaries.
- Detail artifact and transcript synchronization protocols.

---

#### [NEW] `docs/artifacts/plan_agents_rules_and_environment_continuity.md`
- Persist this implementation plan directly to `docs/artifacts/`.

---

## 5. Verification Plan

### Automated Tests
1. Verify file existence and directory layout:
   ```bash
   test -f AGENTS.md && echo "AGENTS.md exists"
   test -f docs/artifacts/plan_agents_rules_and_environment_continuity.md && echo "Artifact copied"
   ```
2. Check git working directory status:
   ```bash
   git status
   ```

### Manual Verification
1. Inspect `AGENTS.md` in repository root for clarity and completeness.
2. Confirm documentation protocols are clear, unambiguous, and easily followed by future agents.
