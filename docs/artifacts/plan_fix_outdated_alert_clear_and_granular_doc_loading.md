# Plan: Outdated Status Auto-Clear, Granular Loading States, & Unified Regenerate All Pipeline Action

**UX & Document Lifecycle Target Issues:**
1. **Outdated Alert Persisting**: When a document is marked `Outdated` (e.g. SRS after modifying PRD), the user clicks *Regenerate SRS*, but the yellow/amber alert banner *"SRS Outdated"* fails to clear even though the new version generated successfully.
2. **Global Loading Bleed-Through**: Generating a single document (e.g. PRD) causes action buttons and menus for other specifications (SRS, Architecture, Design System) to spin simultaneously, confusing users as to whether generation is sequential or concurrent.
3. **Dedicated "Regenerate All" Pipeline Action & Project Co-Pilot Sync**: Restoring an accessible full pipeline action (*Regenerate All / Auto Pipeline*) in Project Co-Pilot (Right Sidebar) and Menu Bar, while synchronizing the 5-stage document stepper with Split View and persona auto-switching.

---

## 1. Goal Description

### Clarifying User Questions:
> *"When generating one document like PRD, why do SRS, Architecture, and Design System also show loading spinners? Are they all generating at once or one by one? Also we need a regenerate all button like before for the full pipeline, and the right sidebar Project Co-Pilot should stay in sync..."*

- **Document Execution Truth**: The system **ONLY generates documents individually** per the specific button triggered (`GeneratePRD` generates only the PRD; `GenerateSRS` generates only the SRS). The system never initiates other documents silently.
- **Root Cause of Loading Bleed-Through**: A single global boolean (`isDocLoading`) was shared across `App.tsx` and all `DocumentCanvasPane` instances, causing all buttons to read `true`.
- **Root Cause of Outdated Alert Persistence**:
  - Updating a PRD triggers `ValidationService` to update the SRS document status to `outdated`.
  - Clicking *"Regenerate SRS"* created a new version in `document_versions`, **but neglected to reset `documents.status` from `'outdated'` back to `'draft'`**.
- **Co-Pilot Pipeline Synchronization**:
  - Provide a prominent **"⚡ Regenerate All (Full Pipeline)"** button in **Project Co-Pilot (Tab 3: Document Flow Status)**.
  - While running, the 5-stage stepper reflects real-time stage progress, and clicking any stage opens that document in Split View with persona auto-switching.

---

## 2. User Review Required

> [!IMPORTANT]
> **New Architectural Guarantees**:
> 1. **Two Distinct Execution Paradigms**:
>    - **Per-Document (Granular)**: Click generate on individual canvases (`PRD`, `SRS`, etc.). Only the selected document loads; others remain readable.
>    - **Regenerate All (Full Pipeline)**: One-click action in Project Co-Pilot & Menu Bar executing Discovery ➔ PRD ➔ SRS ➔ Architecture ➔ Design System sequentially with automatic approval gating.
> 2. **Self-Healing Outdated Status**:
>    - Regenerating the SRS restores status to `draft` in SQLite. The Outdated alert banner dismisses instantly without requiring reloads.
> 3. **Interactive Project Co-Pilot Synchronization**:
>    - Clicking stepper stages navigates to the document in `split` view and auto-switches conversational personas (`Product Analyst`, `System Analyst`, `Software Architect`, `UI/UX Agent`).

---

## 3. Proposed Changes

### A. Backend Services (`internal/services/`)

#### [MODIFY] `document_service.go`
- In `GenerateSRS(projectID string)`:
  After persisting new version via `s.docRepo.AddVersion`:
  ```go
  _ = s.docRepo.UpdateDocumentStatus(ctx, srsDoc.ID, domain.DocStatusDraft)
  ```
- In `RegenerateSRSSection(projectID string, sectionNumber int)`:
  Restore status from `outdated` to `domain.DocStatusDraft`.

#### [MODIFY] `validation_service.go`
- In `RunFullValidation` and `CheckChangeImpact`:
  ```go
  if prdVer != nil && srsVer != nil {
      if prdVer.CreatedAt.After(srsVer.CreatedAt) {
          isOutdated = true
          _ = s.docRepo.UpdateDocumentStatus(ctx, srsDoc.ID, domain.DocStatusOutdated)
      } else if srsDoc.Status == domain.DocStatusOutdated {
          _ = s.docRepo.UpdateDocumentStatus(ctx, srsDoc.ID, domain.DocStatusDraft)
      }
  }
  ```

---

### B. Frontend Architecture (`frontend/src/`)

#### [MODIFY] `frontend/src/App.tsx`
1. **Granular Loading State**:
   ```tsx
   export type GeneratingDocType = 'prd' | 'srs' | 'architecture' | 'design' | null;
   const [generatingDoc, setGeneratingDoc] = useState<GeneratingDocType>(null);
   ```
2. **Update Generation Handlers**:
   - `handleGeneratePRD`: `setGeneratingDoc('prd')` -> `finally { setGeneratingDoc(null); }`
   - `handleGenerateSRS`: `setGeneratingDoc('srs')` -> `finally { setGeneratingDoc(null); }`
   - `handleGenerateArchitecture`: `setGeneratingDoc('architecture')` -> `finally { setGeneratingDoc(null); }`
   - `handleGenerateDesign`: `setGeneratingDoc('design')` -> `finally { setGeneratingDoc(null); }`
3. **Project Co-Pilot Stepper Synchronization**:
   - Implement `handlePipelineStepClick(stepId)` switching to Split View and aligning persona.
   - Stage indicators show `<Loader2 size={12} className="animate-spin text-primary" />` when active.
4. **Prominent "Regenerate All (Full Pipeline)" Button**:
   - Positioned in Co-Pilot Tab 3 below the 5-stage stepper.
   - Pulsating progress badge with `Cancel` action during execution.
5. **Left Navigator**:
   - Displays `Generating...` spinner strictly for the active generating document.

#### [MODIFY] `frontend/src/components/DocumentCanvasPane.tsx`
1. **Props Refactor**:
   - Replace `isDocLoading` with `generatingDoc: GeneratingDocType`.
   - Compute `isThisDocLoading` and `isOtherDocLoading`.
2. **Scoped Spinners**:
   - Only spin buttons matching `generatingDoc === docType`.
3. **Loading Overlay Isolation**:
   - Full loading overlay only covers the canvas if `isThisDocLoading === true`.
   - If another document is processing, display a subtle non-intrusive notification: *"Generating PRD in background..."*.
4. **Outdated Banner**:
   - Auto-clears upon completion.

#### [MODIFY] `frontend/src/components/DesktopMenuBar.tsx`
- Add `generatingDoc` prop and scoped loading indicators in dropdown menus.
- Add `⚡ Regenerate All` action to the right toolbar.

---

## 4. Verification Plan

### Automated Tests
1. **Backend Go Test Suite**:
   ```bash
   go test -v ./internal/services/...
   go test -v ./internal/...
   ```
   - Confirms `TestValidationService_TraceabilityAndImpact` verifies healing of outdated statuses.
2. **Frontend Type Check & Production Build**:
   ```bash
   npm --prefix frontend run build
   ```

### Manual Verification
1. **Granular Loading**: Regenerate PRD; verify SRS canvas does not display loading spinners and remains readable.
2. **Outdated Alert Auto-Clear**: Edit PRD to trigger SRS Outdated banner; click *Regenerate SRS*; verify banner clears immediately upon completion.
3. **Regenerate All Action**: Trigger full pipeline from Co-Pilot; observe sequential stage transitions from Discovery to Design System.
