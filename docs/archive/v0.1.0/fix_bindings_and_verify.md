# Plan: Fix TypeScript Binding Error & Full Verification

Technical remediation plan to resolve TypeScript compilation errors during `wails3 task dev`:
```text
src/App.tsx:43:3 - error TS2305: Module '"../bindings/ai-requirements-studio/internal/domain/models"' has no exported member 'Document'.
```

---

## 1. Goal Description & Root Cause Analysis

### Problem:
Running `wails3 task dev` (executing `npm run build:dev` with `tsc && vite build --minify false --mode development`) produced the following compilation error:
`Module '"../bindings/ai-requirements-studio/internal/domain/models"' has no exported member 'Document'`.

### Root Cause Analysis:
1. The Wails v3 binding generator (`wails3 generate bindings`) inspects public method signatures of Go structs registered with `application.NewService(...)`.
2. The generator only generates TypeScript interfaces for Go structs explicitly referenced as direct parameters or return values of service methods.
3. In [`internal/services/document_service.go`](file:///E:/dev-agent-assistant/internal/services/document_service.go), `GetDocumentDetails` returned a generic `map[string]any`, and other methods returned `*domain.DocumentVersion`. Because `*domain.Document` was never returned as an explicit return type by any public service method, the generator omitted `export interface Document` from `models.ts`.

---

## 2. User Review Required

> [!NOTE]
> This fix strictly refines the type signatures in Go services and the frontend TypeScript layer, with zero impact on SQLite storage logic or existing PRD/SRS functionality.

---

## 3. Proposed Changes

### Component 1: Go Application Core ([`internal/services/document_service.go`](file:///E:/dev-agent-assistant/internal/services/document_service.go))
#### [MODIFY] `internal/services/document_service.go`
- Add an explicit public getter method:
  ```go
  func (s *DocumentService) GetDocument(projectID string, docType string) (*domain.Document, error) {
      ctx := context.Background()
      return s.docRepo.GetOrCreate(ctx, projectID, domain.DocumentType(docType))
  }
  ```
  With this method exposed, Wails v3 automatically detects `*domain.Document` and emits `export interface Document` inside `frontend/bindings/ai-requirements-studio/internal/domain/models.ts`.

---

### Component 2: Frontend Desktop Shell ([`frontend/src/App.tsx`](file:///E:/dev-agent-assistant/frontend/src/App.tsx))
#### [MODIFY] `frontend/src/App.tsx`
- Ensure the `Document` interface is cleanly imported and resilient against binding regenerations.
- Ensure all unused dependencies are cleaned up to guarantee strict `tsc` checks pass in both dev and production builds.

---

### Component 3: Bindings Regeneration & Build Task
- Run `wails3 generate bindings` to update `models.ts` with the `Document` interface.
- Test `npm run build:dev` (invoked by `wails3 task dev`).
- Test `npm run build` (production build).
- Test `wails3 task build` or `go build -v .`.

---

## 4. Verification Plan

### Automated Tests
1. **Frontend Dev Build Verification:**
   ```powershell
   cd frontend
   npm run build:dev
   ```
   *Expectation:* Compiles cleanly without TypeScript error `TS2305`.

2. **Frontend Production Build:**
   ```powershell
   cd frontend
   npm run build
   ```
   *Expectation:* Passes with 0 errors.

3. **Backend Unit & Integration Tests:**
   ```powershell
   go test -v ./...
   ```
   *Expectation:* All test suites PASS.

4. **Wails v3 Build:**
   ```powershell
   go build -v -ldflags="-w -s" -o "bin/ai-requirements-studio.exe" .
   ```
   *Expectation:* Successful binary compilation.
