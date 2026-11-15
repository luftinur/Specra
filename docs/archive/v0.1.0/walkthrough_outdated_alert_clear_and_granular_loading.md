# Walkthrough: Outdated Alert Auto-Clear, Granular Loading States, & Regenerate All Pipeline Button

**Verification & Implementation Report: Document Lifecycle & Co-Pilot UX**  
*Date: November 13, 2026*  
*Repository: `dev-agent-assistant`*  
*Branch: `main`*

---

## 1. Executive Summary & Problem Resolution

This session resolved two critical issues in the document lifecycle and loading state interface reported by the user, alongside delivering a synchronized full-pipeline regeneration action:

1. **Auto-Clearing Outdated Document Alerts**:
   - **Issue**: When a PRD was updated, downstream documents (e.g. SRS) were automatically marked `outdated`. After clicking *"Regenerate SRS"*, a new version was successfully generated, but the yellow/amber alert banner *"SRS Outdated"* remained visible.
   - **Root Cause**: `GenerateSRS` and `RegenerateSRSSection` appended new versions to `document_versions` table but neglected to update `documents.status` from `'outdated'` back to `'draft'`.
   - **Solution**: In the Go backend (`document_service.go` and `validation_service.go`), SRS status is now automatically restored to `domain.DocStatusDraft` once regeneration completes and the SRS timestamp is newer than the PRD. The `outdated_srs` audit finding is cleared immediately on the frontend without a reload.

2. **Granular Loading State Isolation (Zero Loading Bleed-Through)**:
   - **Issue**: Generating a single document (e.g. PRD) caused buttons and canvases for SRS, Architecture, and Design System to display loading spinners simultaneously.
   - **Root Cause**: Global boolean `isDocLoading` in `App.tsx` was shared across all components.
   - **Solution**: Replaced with **Granular Loading State** (`generatingDoc: 'prd' | 'srs' | 'architecture' | 'design' | null`). Only the specific document currently being processed displays a spinner and `Generating...` state. Other documents maintain their authentic statuses (`Approved`, `Draft`, `Locked`) and remain readable without being blocked.

3. **Prominent "⚡ Regenerate All (Full Pipeline)" Button in Co-Pilot & MenuBar**:
   - Added a clear one-click action in the **Right Sidebar (Project Co-Pilot - Tab 3: Document Flow Status)** directly below the 5-stage stepper.
   - When the pipeline executes, the button transforms into an active pulsating progress indicator (`Loader2 + Stage Name`) with a `Cancel` option.
   - Added a synchronized shortcut button `⚡ Regenerate All` in the top Desktop Menu Bar.
   - The 5-stage stepper in Co-Pilot is fully synchronized: clicking any document stage opens it in **Split View** and auto-switches the conversational persona (`Product Analyst`, `System Analyst`, `Software Architect`, `UI/UX Agent`).

---

## 2. Code Changes

### A. Backend Go Services
1. **`internal/services/document_service.go`**:
   - In `GenerateSRS`: Calls `s.docRepo.UpdateDocumentStatus(ctx, srsDoc.ID, domain.DocStatusDraft)` after creating a new version.
   - In `RegenerateSRSSection`, `RegeneratePRDSection`, `RegenerateArchitectureSection`, `RegenerateDesignSection`: Restores status from `outdated` to `draft`.
2. **`internal/services/validation_service.go`**:
   - In `RunFullValidation` and `CheckChangeImpact`: If `srsDoc.Status == domain.DocStatusOutdated` and `!prdVer.CreatedAt.After(srsVer.CreatedAt)` (SRS is up-to-date), status automatically heals to `draft` and `outdated_srs` is omitted.
3. **`internal/services/validation_service_test.go`**:
   - Added Step 4 in `TestValidationService_TraceabilityAndImpact` confirming that creating a newer SRS version clears outdated status and sets `srs_outdated: false`.

### B. Frontend Architecture & Components
1. **`frontend/src/App.tsx`**:
   - Replaced `isDocLoading: boolean` with `generatingDoc: 'prd' | 'srs' | 'architecture' | 'design' | null`.
   - Added `handlePipelineStepClick` synchronizing stepper navigation with Split View and persona auto-switching.
   - Added prominent **"⚡ Regenerate All (Full Pipeline)"** button in Co-Pilot Tab 3.
   - Updated Left Navigator badges so only the active generating document shows the spinning loader.
2. **`frontend/src/components/DocumentCanvasPane.tsx`**:
   - Replaced `isDocLoading` prop with `generatingDoc`.
   - Isolated generation buttons: only displays spinner if `generatingDoc === docType`.
   - Full loading overlay only covers the canvas if the open document is the one currently generating (`isThisDocLoading`).
   - If another document is processing in the background (`isOtherDocLoading`), the canvas displays a non-intrusive notification banner and remains readable.
   - The `Regenerate SRS` button on the Outdated banner is disabled during generation and clears automatically when generation completes.
3. **`frontend/src/components/DesktopMenuBar.tsx`**:
   - Added `generatingDoc` prop and scoped loading indicators in the Documents dropdown menu.
   - Added `⚡ Regenerate All` shortcut button on the menu bar.

---

## 3. Testing & Verification Results

### A. Backend Go Test Suite
```bash
go test -v ./internal/services/...
go test -v ./internal/...
```
- **Result**: 13/13 test suites passed (`PASS` 100%):
  - `TestValidationService_TraceabilityAndImpact`: PASS (including outdated-to-draft self-healing verification).
  - `TestDocumentService_PRD_SRS_ApprovalGating`: PASS
  - `TestArchitectureDocumentLifecycle`: PASS
  - `TestDesignDocumentLifecycle`: PASS
  - `TestEndToEndScenarios`: PASS (Scenario A-D)

### B. Frontend TypeScript & Production Build
```bash
npm --prefix frontend run build
```
- **Result**: 100% passed without errors (`tsc` with `strict: true` passed; Vite built production bundle in 3.47 seconds).

---

## 4. Conclusion

With this update:
- Users gain absolute clarity: documents generate individually when clicking single actions, or sequentially in an automated workflow via **"Regenerate All (Full Pipeline)"**.
- Outdated document alerts follow an authentic, self-healing lifecycle: appearing upon PRD changes and **instantly auto-clearing** once regenerated.
- Project Co-Pilot in the right sidebar serves as a unified, synchronized pipeline control center.
