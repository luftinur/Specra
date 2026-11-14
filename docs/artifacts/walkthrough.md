# Walkthrough: Interactive Assumptions UX, Project Co-Pilot, & Multi-Agent Flow Synchronization

## 1. Executive Summary
Based on critical user evaluations regarding:
1. *"In the right sidebar there's assumptions, how do I answer them? It needs answers right...":* The absence of an interactive interface for users to confirm or correct AI assumptions other than passively rejecting them.
2. *"This right sidebar confuses users—are inspector viewers, pipeline, workflow, and chat discovery all connected? What is your UX recommendation?":* Fragmentation in the right sidebar ("Inspector") which previously concealed 5 sub-views behind a tiny 3-dot dropdown menu.
3. *"For chat discovery too, shouldn't it be connected? For instance if I go to PRD and click generate, does chat discovery understand the current status? Is the persona discovery dropdown and interaction mode dropdown actually useful?":* Lack of bi-directional synchronization between canvas actions and chat timeline, as well as ambiguity surrounding persona and interaction mode controls.

All identified issues have been resolved and implemented end-to-end across the backend (Go, SQLite, domain service layer) and frontend (React 19, TypeScript strict mode, Tailwind CSS).

---

## 2. Implemented Features & Architecture Enhancements

### A. Interactive Project Assumptions (Confirm, Correct, Reject)
1. **SQLite Correction Persistence (`internal/storage/conversation_repo.go`)**:
   - Added query `UpdateAssumption(ctx, id, description, status)` to persist user-corrected facts and mark status as `confirmed`.
2. **Backend Service (`internal/services/requirement_service.go`)**:
   - Added `CorrectAssumption(id string, correctedText string) error`.
3. **Interactive Assumption Cards in UI (`frontend/src/App.tsx`)**:
   - Each assumption card now provides 3 clear action buttons:
     - **`✓ Correct`**: Confirms the AI assumption as-is into an authoritative project fact (`confirmed`).
     - **`✎ Edit`**: Opens an inline textarea directly inside the card: *"Enter the correct fact or preference (e.g. 'Not Stripe, we use Midtrans QRIS')..."* with **Save Correction** and **Cancel** buttons.
     - **`✕ Reject`**: Rejects irrelevant assumptions (`rejected`).
   - Confirmed/corrected assumptions display a green `✓ Confirmed` badge with an option to edit again if project requirements evolve later.

### B. Right Sidebar Transformation: "Project Co-Pilot" with 3 Open Tabs
1. **Re-branding as "Project Co-Pilot"**:
   - Replaced technical terminology *Inspector* with a proactive assistant that accompanies the user's workflow.
   - Removed the 3-dot dropdown menu (`MoreVertical`) that previously hid navigation.
2. **3 Permanent Segmented Tabs**:
   - **Tab 1: `Requirements`**: Displays requirements backlog (FR-xxx/NFR-xxx), MoSCoW priority filters, Approve/Reject buttons, and AI extraction triggers.
   - **Tab 2: `Questions & Assumptions` (Action Center)**:
     - Unifies **AI Clarification Questions** and **System Assumptions** in a single centralized action center.
     - Features a pulsing yellow **Badge Counter** indicator whenever unanswered clarification questions or unconfirmed assumptions remain.
   - **Tab 3: `Pipeline & Audit`**:
     - Visual 5-stage document stepper (Discovery ➔ PRD ➔ SRS ➔ Architecture ➔ Design System) with direct click-to-open document navigation.
     - Validation findings and conflict summary with "Re-audit" button.
     - PRD ➔ SRS Traceability Matrix.
3. **Smart Auto-Focusing**:
   - When the pipeline pauses due to mandatory clarification questions, the system automatically redirects sidebar focus to the **Questions & Assumptions** tab.

### C. Bi-Directional Canvas-to-Chat Synchronization
1. **System Milestone Event Logging (`internal/services/conversation_service.go`)**:
   - Added method `PostSystemEvent(conversationID, projectID, title, message string) (*domain.Message, error)` recording formal document milestones in the conversation database.
2. **Auto-Post Milestone Notifications to Chat Timeline**:
   - Triggered when users execute canvas actions:
     - **Generate PRD**: Posts milestone *"PRD Draft v1 Generated (20 Sections)"* with requirement and assumption summary.
     - **Approve PRD**: Posts announcement *"PRD Officially Approved"* unlocking downstream SRS generation.
     - **Generate / Approve SRS**: Posts updates for SRS IEEE 830 specifications (22 sections).
     - **Generate / Approve Architecture**: Posts updates for Architecture documentation (16 sections, C4 diagrams, API contracts).
     - **Generate / Approve Design System**: Posts completion notice for Design System (16 sections, MQ-Studio tokens & screen flows).
   - When switching back to Chat, the conversation timeline remains completely in sync with document progress.

### D. Specialist Persona & Interaction Mode Alignment
1. **Context-Aware Persona Auto-Switching**:
   - Navigating to **PRD** ➔ Chat persona automatically switches to **Product Analyst**.
   - Navigating to **SRS** ➔ Chat persona automatically switches to **System Analyst**.
   - Navigating to **Architecture** ➔ Chat persona automatically switches to **Software Architect**.
   - Navigating to **Design System** ➔ Chat persona automatically switches to **UI/UX Agent**.
2. **Segmented Interaction Mode Toggle Pill**:
   - Replaced hidden dropdowns with a **1-Click Toggle Pill** above the chat input bar:
     - **`🔍 Exploration (Q&A)`**: AI proactively searches for ambiguities, poses clarification questions, and extracts assumptions from raw briefs.
     - **`⚡ Execution (Spec)`**: AI directly authors structured specification drafts and document artifacts without conversational friction.

---

## 3. Verification Results & Quality Assurance

1. **Go Unit & Integration Test Suites**:
   ```powershell
   go test -v ./internal/...
   ```
   **Results:**
   - `ai-requirements-studio/internal`: **PASS** (Scenario A-D e2e)
   - `ai-requirements-studio/internal/ai`: **PASS** (Orchestrator, Discovery, TOON, Validation Engine)
   - `ai-requirements-studio/internal/security`: **PASS** (Sensitive Data Redaction)
   - `ai-requirements-studio/internal/services`: **PASS** (RequirementService CorrectAssumption, ConversationService PostSystemEvent, 90 goroutines stress test)
   - `ai-requirements-studio/internal/storage`: **PASS** (Workspace path traversal guard, DocumentRepo atomic transactions)

2. **Frontend TypeScript & Vite Production Build**:
   ```powershell
   npm --prefix frontend run build
   ```
   **Results:**
   - `tsc` (TypeScript Strict Mode): **0 errors**.
   - Vite client bundle: Built successfully in **3.35s**.
