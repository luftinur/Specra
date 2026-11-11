# Plan: Fix TypeScript Binding Error & Full Verification

Dokumen rencana perbaikan untuk mengatasi error kompilasi TypeScript pada `wails3 task dev`:
```text
src/App.tsx:43:3 - error TS2305: Module '"../bindings/ai-requirements-studio/internal/domain/models"' has no exported member 'Document'.
```

---

## 1. Goal Description & Root Cause Analysis

### Masalah:
Saat menjalankan `wails3 task dev` (yang mengeksekusi `npm run build:dev` dengan `tsc && vite build --minify false --mode development`), TypeScript melaporkan error:
`Module '"../bindings/ai-requirements-studio/internal/domain/models"' has no exported member 'Document'`.

### Analisis Akar Masalah:
1. Generator binding Wails v3 (`wails3 generate bindings`) bekerja dengan memindai *signature* method dari Go struct yang didaftarkan ke `application.NewService(...)`.
2. Generator hanya membuat interface TypeScript untuk tipe struct Go yang secara eksplisit menjadi parameter atau *return value* langsung dari suatu service method.
3. Pada [`internal/services/document_service.go`](file:///E:/dev-agent-assistant/internal/services/document_service.go), method `GetDocumentDetails` mengembalikan `map[string]any` generik dan method lain mengembalikan `*domain.DocumentVersion`. Karena `*domain.Document` tidak pernah menjadi return value bertipe eksplisit pada method publik service mana pun, generator Wails v3 tidak memancarkan `export interface Document` ke dalam `models.ts`.

---

## 2. User Review Required

> [!NOTE]
> Perbaikan ini murni pada pengetikan (*type signatures*) Go service dan TypeScript frontend, tanpa mengubah logika penyimpanan database SQLite maupun fungsionalitas PRD/SRS yang sudah selesai.

---

## 3. Proposed Changes

### Component 1: Go Application Core ([`internal/services/document_service.go`](file:///E:/dev-agent-assistant/internal/services/document_service.go))
#### [MODIFY] `internal/services/document_service.go`
- Tambahkan method publik bertipe eksplisit:
  ```go
  func (s *DocumentService) GetDocument(projectID string, docType string) (*domain.Document, error) {
      ctx := context.Background()
      return s.docRepo.GetOrCreate(ctx, projectID, domain.DocumentType(docType))
  }
  ```
  Dengan adanya method ini, generator Wails v3 otomatis mendeteksi `*domain.Document` dan menghasilkan interface `export interface Document` di `frontend/bindings/ai-requirements-studio/internal/domain/models.ts`.

---

### Component 2: Frontend Desktop Shell ([`frontend/src/App.tsx`](file:///E:/dev-agent-assistant/frontend/src/App.tsx))
#### [MODIFY] `frontend/src/App.tsx`
- Pastikan interface `Document` di-import dengan aman atau didefinisikan secara lokal jika terjadi regenerasi berkala.
- Pastikan tidak ada dependensi yang tidak terpakai sehingga lolos `tsc` strict checking baik pada `build:dev` maupun `build:production`.

---

### Component 3: Bindings Regeneration & Build Task
- Eksekusi `wails3 generate bindings` untuk memperbarui `models.ts` dengan interface `Document`.
- Uji coba `npm run build:dev` (perintah yang dipanggil oleh `wails3 task dev`).
- Uji coba `npm run build` (production build).
- Uji coba `wails3 task build` atau `go build -v .`.

---

## 4. Verification Plan

### Automated Tests
1. **Frontend Dev Build Verification:**
   ```powershell
   cd frontend
   npm run build:dev
   ```
   *Ekspektasi:* Lolos tanpa error TypeScript `TS2305`.

2. **Frontend Production Build:**
   ```powershell
   cd frontend
   npm run build
   ```
   *Ekspektasi:* Lolos 100%.

3. **Backend Unit & Integration Tests:**
   ```powershell
   go test -v ./...
   ```
   *Ekspektasi:* Seluruh 11 test suites PASS.

4. **Wails v3 Build:**
   ```powershell
   go build -v -ldflags="-w -s" -o "bin/ai-requirements-studio.exe" .
   ```
   *Ekspektasi:* Kompilasi sukses menjadi binary desktop.
