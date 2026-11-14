# Implementation Plan: Fix Windows CLI Command-Line Length Limit & Autonomous Pipeline Orchestrator

## 1. Goal Description

This implementation resolves two pressing requirements:
1. **Fatal Windows CLI Error Resolution (`The filename or extension is too long`)**:
   - **Root Cause**: When generating downstream specifications (SRS, Architecture, Design System), upstream specifications (PRD 20 Sections and complete JSON schemas) were passed as CLI arguments (`-p "<prompt>"` and `--json-schema "<schema>"`).
   - On Windows OS, kernel `CreateProcess` imposes a strict **32,767 character limit**. Exceeding this boundary triggers kernel error 206: `The filename or extension is too long`.
   - **Solution**: Refactor `antigravity` and `opencode` adapters to stream prompts via **`cmd.Stdin = strings.NewReader(req.Prompt)`** and persist verbose schemas to temporary files (`temp-schema-*.json`). Command line arguments shrink to ~50 characters, permanently resolving Windows limits.

2. **Autonomous Requirements Pipeline Orchestrator ("Auto Pipeline")**:
   - **Prior UX Friction**: Generating all four specifications required repetitive manual tab switching, individual approvals, and sequential button clicks.
   - **Solution**: Introduce the **Auto Pipeline Orchestrator** executable via a single action (`[ ⚡ Auto Pipeline ]`):
     - **Phase 1 (Discovery & Requirements Extraction)**: AI extracts MoSCoW requirements, clarifications, and assumptions from raw briefs.
     - **Clarification Gating**: If pending clarification questions exist, the pipeline **automatically pauses** and highlights the question cards. Once answered, the pipeline resumes.
     - **Phase 2 (PRD Generation & Auto-Approve)**: Authors 20-section PRD.
     - **Phase 3 (SRS Generation & Auto-Approve)**: Authors 22-section IEEE 830 SRS.
     - **Phase 4 (Architecture Generation & Auto-Approve)**: Authors 16-section C4 Architecture.
     - **Phase 5 (Design System Generation & Auto-Approve)**: Authors 16-section Semantic Design System.
     - **Completion**: Displays unified success status with a direct `[ 📥 Export All (.md) ]` action.

---

## 2. User Review Required

> [!IMPORTANT]
> **Clarification Gating Behavior**:
> During Auto Pipeline execution, if critical ambiguities emerge, the pipeline **pauses and directs focus to the question card** in chat.
> Once the user answers and clicks `[ ➔ Resume Pipeline ]`, the orchestrator completes the pipeline through to the Design System.

---

## 3. Proposed Changes

### A. AI Adapters: Stdin Piping & Schema Temp Files ([`internal/ai/adapters/antigravity/adapter.go`](file:///E:/dev-agent-assistant/internal/ai/adapters/antigravity/adapter.go) & [`internal/ai/adapters/opencode/adapter.go`](file:///E:/dev-agent-assistant/internal/ai/adapters/opencode/adapter.go))

#### [MODIFY] `internal/ai/adapters/antigravity/adapter.go`
- Omit `-p` flag. Stream `req.Prompt` via `cmd.Stdin = strings.NewReader(req.Prompt)`.
- If `req.JSONSchema` is long, persist to a temp file and pass via `--json-schema <filepath>`, followed by `defer os.Remove(...)`.
```go
func (a *Adapter) Generate(ctx context.Context, req ai.GenerateRequest) (*ai.GenerateResponse, error) {
	args := []string{
		"--output-format", "json",
		"--disable-slash-commands",
	}

	if req.Model != "" {
		args = append(args, "--model", req.Model)
	}

	var tempSchemaFile string
	if req.JSONSchema != "" {
		tmpFile, err := os.CreateTemp("", "agy-schema-*.json")
		if err == nil {
			_, _ = tmpFile.WriteString(req.JSONSchema)
			_ = tmpFile.Close()
			tempSchemaFile = tmpFile.Name()
			args = append(args, "--json-schema", tempSchemaFile)
			defer os.Remove(tempSchemaFile)
		} else {
			args = append(args, "--json-schema", req.JSONSchema)
		}
	}

	cmd := exec.CommandContext(ctx, a.executablePath, args...)
	if req.WorkDir != "" {
		cmd.Dir = req.WorkDir
	}
	cmd.Stdin = strings.NewReader(req.Prompt)
    ...
```

#### [MODIFY] `internal/ai/adapters/opencode/adapter.go`
- Stream prompt via `cmd.Stdin = strings.NewReader(fullPrompt)` with `run --format default`.

---

### B. Frontend Auto Pipeline Orchestrator ([`frontend/src/App.tsx`](file:///E:/dev-agent-assistant/frontend/src/App.tsx))

#### [MODIFY] `frontend/src/App.tsx`
1. **Pipeline State**:
   ```ts
   const [autoPipelineRunning, setAutoPipelineRunning] = useState(false);
   const [autoPipelineStage, setAutoPipelineStage] = useState<string | null>(null);
   const [pipelinePausedReason, setPipelinePausedReason] = useState<string | null>(null);
   ```
2. **`runAutoPipeline()` Execution Routine**:
   ```ts
   const runAutoPipeline = async () => {
     setAutoPipelineRunning(true);
     setPipelinePausedReason(null);
     
     // 1. Extract requirements if empty
     if (requirements.length === 0) {
       setAutoPipelineStage('Extracting Initial Requirements (Discovery)...');
       await handleExtractRequirements();
     }

     // Gating Check: Clarification Questions
     const openClar = clarifications.filter(c => c.status !== 'answered' && !c.answer);
     if (openClar.length > 0) {
       setAutoPipelineRunning(false);
       setPipelinePausedReason(`Pipeline Paused: Please answer ${openClar.length} clarification question(s).`);
       setCurrentView('chat');
       return;
     }

     // 2. Generate & Approve PRD
     setAutoPipelineStage('Generating PRD (20 Sections)...');
     await handleGeneratePRD();
     await DocumentService.ApproveDocument(activeProject.id, 'prd');

     // 3. Generate & Approve SRS
     setAutoPipelineStage('Generating SRS IEEE 830 (22 Sections)...');
     await handleGenerateSRS();
     await DocumentService.ApproveDocument(activeProject.id, 'srs');

     // 4. Generate & Approve Architecture
     setAutoPipelineStage('Generating Architecture C4 (16 Sections)...');
     await handleGenerateArchitecture();
     await DocumentService.ApproveDocument(activeProject.id, 'architecture');

     // 5. Generate & Approve Design System
     setAutoPipelineStage('Generating Design System (16 Sections)...');
     await handleGenerateDesign();
     await DocumentService.ApproveDocument(activeProject.id, 'design');

     setAutoPipelineStage(null);
     setAutoPipelineRunning(false);
   };
   ```
3. **UI Integration**:
   - Quick action **`[ ⚡ Auto Pipeline ]`** in Stepper Bar and Co-Pilot.
   - Stage status updates with loader animations.
   - Notification banners for completion and paused clarification states.

---

## 4. Verification Plan

### Automated Tests
1. **Go Unit & Adapter Tests**:
   ```bash
   go test -v ./internal/...
   ```
   *Expectation: All 13 test suites pass 100%.*
2. **Frontend Compilation**:
   ```bash
   npm --prefix frontend run build
   ```
   *Expectation: 0 TypeScript errors.*

### Manual Verification
1. **Windows CLI Length Fix (SRS Generation)**:
   - Generate SRS on a project with a long PRD; verify `agy.exe` succeeds without error `The filename or extension is too long`.
2. **Auto Pipeline Workflow**:
   - Trigger Auto Pipeline on a fresh project.
   - Verify pipeline pauses cleanly on pending clarification questions.
   - Submit answers; verify pipeline resumes and generates PRD ➔ SRS ➔ Architecture ➔ Design System.
