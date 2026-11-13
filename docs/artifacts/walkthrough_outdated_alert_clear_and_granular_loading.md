# Walkthrough: Siklus Status Outdated Auto-Clear, Granular Loading States, & Tombol Regenerate All Pipeline

**Laporan Hasil Verifikasi & Implementasi Siklus Dokumen & UX Co-Pilot**  
*Tanggal: 13 November 2026*  
*Repositori: `dev-agent-assistant`*  
*Branch: `main`*

---

## 1. Ringkasan Eksekutif & Solusi Masalah

Sesi ini menyelesaikan dua isu penting pada siklus dokumen dan antarmuka pemuatan dokumen yang dilaporkan pengguna, serta menambahkan tombol eksekusi pipeline lengkap yang tersinkronisasi:

1. **Pemulihan Status Dokumen Outdated (Auto-Clear Banner Alert)**:
   - **Isu**: Ketika PRD diperbarui, dokumen turunan (SRS) otomatis ditandai `outdated`. Pengguna lalu mengklik *"Regenerate SRS"*, versi baru berhasil terbentuk, namun alert banner kuning/merah *"SRS Outdated"* tidak pernah hilang.
   - **Penyebab**: Fungsi `GenerateSRS` dan `RegenerateSRSSection` membuat versi baru di tabel `document_versions`, namun tidak pernah memperbarui `documents.status` di database dari `'outdated'` kembali ke `'draft'`.
   - **Solusi**: Di backend Go (`document_service.go` dan `validation_service.go`), status SRS di database kini otomatis dipulihkan menjadi `domain.DocStatusDraft` setelah regenerasi selesai dan timestamp SRS lebih baru daripada PRD. Temuan audit `outdated_srs` dibersihkan, sehingga banner Outdated langsung hilang seketika di frontend tanpa reload.

2. **Isolasi Granular Loading State (Zero Loading Bleed-Through)**:
   - **Isu**: Meng-generate satu dokumen (misal PRD) membuat tombol dan kanvas SRS, Architecture, dan Design System ikut berputar seolah-olah semuanya sedang di-generate.
   - **Penyebab**: Penggunaan single global boolean `isDocLoading` di `App.tsx` yang dibagikan ke seluruh komponen.
   - **Solusi**: Digantikan dengan **Granular Loading State** (`generatingDoc: 'prd' | 'srs' | 'architecture' | 'design' | null`). Hanya dokumen yang sedang diproses yang menampilkan spinner dan status `Generating...`. Dokumen lainnya tetap menampilkan status aslinya (`Approved`, `Draft`, `Locked`) dan kontennya tetap dapat dibaca tanpa dihalangi layar pemuatan.

3. **Tombol Prominen "⚡ Regenerate All (Full Pipeline)" di Project Co-Pilot & MenuBar**:
   - Disediakan tombol aksi satu-klik yang jelas di **Sidebar Kanan (Project Co-Pilot - Tab 3: Status Alur Dokumen)** tepat di bawah stepper 5-tahap.
   - Saat pipeline berjalan, tombol berubah menjadi progress bar berdenyut `Loader2 + Stage Name` dengan tombol `Batal`.
   - Disediakan juga tombol akses cepat `⚡ Regenerate All` di Menu Bar atas.
   - Stepper 5-tahap di Co-Pilot kini tersinkronisasi penuh: mengklik tahap dokumen akan membuka dokumen tersebut di **Split View** dan mengalihkan persona chat AI secara kontekstual (`Product Analyst`, `System Analyst`, `Software Architect`, `UI/UX Agent`).

---

## 2. Rincian Perubahan Kode

### A. Backend Go Services
1. **`internal/services/document_service.go`**:
   - Di `GenerateSRS`: Memanggil `s.docRepo.UpdateDocumentStatus(ctx, srsDoc.ID, domain.DocStatusDraft)` pasca versi baru dibuat.
   - Di `RegenerateSRSSection`, `RegeneratePRDSection`, `RegenerateArchitectureSection`, `RegenerateDesignSection`: Memulihkan status dari `outdated` ke `draft`.
2. **`internal/services/validation_service.go`**:
   - Di `RunFullValidation` dan `CheckChangeImpact`: Jika `srsDoc.Status == domain.DocStatusOutdated` namun `!prdVer.CreatedAt.After(srsVer.CreatedAt)` (SRS sudah up-to-date), status otomatis dipulihkan ke `draft` dan finding `outdated_srs` tidak ditambahkan.
3. **`internal/services/validation_service_test.go`**:
   - Menambahkan pengujian Step 4 pada `TestValidationService_TraceabilityAndImpact` untuk membuktikan bahwa pembuatan versi SRS baru menghapus status outdated dan mengembalikan `srs_outdated: false`.

### B. Frontend Architecture & Components
1. **`frontend/src/App.tsx`**:
   - Mengganti `isDocLoading: boolean` dengan `generatingDoc: 'prd' | 'srs' | 'architecture' | 'design' | null`.
   - Menambahkan `handlePipelineStepClick` yang menyinkronkan klik tahap stepper dengan Split View dan persona auto-switching.
   - Menambahkan tombol prominen **"⚡ Regenerate All (Full Pipeline)"** di Project Co-Pilot Tab 3 dengan kartu animasi berdenyut dan tombol batal.
   - Memperbarui badge pada Navigator Kiri (Sidebar) agar hanya dokumen aktif yang menampilkan `<Loader2 size={10} className="animate-spin" /> Generating...`.
2. **`frontend/src/components/DocumentCanvasPane.tsx`**:
   - Mengganti prop `isDocLoading` menjadi `generatingDoc`.
   - Tombol generate masing-masing dokumen terisolasi: hanya memutar spinner jika `generatingDoc === docType`.
   - Layar pemuatan penuh hanya muncul jika dokumen yang sedang dibuka adalah dokumen yang sedang di-generate (`isThisDocLoading`).
   - Jika dokumen lain sedang berjalan di latar belakang (`isOtherDocLoading`), kanvas menampilkan banner informatif non-intrusif dan dokumen aktif tetap bisa dibaca.
   - Tombol `Regenerate SRS` pada banner Outdated otomatis dinonaktifkan saat proses sedang berjalan dan banner langsung hilang saat hasil keluar.
3. **`frontend/src/components/DesktopMenuBar.tsx`**:
   - Menambahkan prop `generatingDoc` dan menampilkan badge spinner pada dropdown menu Documents hanya untuk dokumen yang aktif.
   - Menambahkan tombol pintas `⚡ Regenerate All` di sisi kanan menubar.

---

## 3. Hasil Pengujian & Verifikasi

### A. Backend Go Test Suite
```bash
go test -v ./internal/services/...
go test -v ./internal/...
```
- **Hasil**: 13/13 test suites PASS (100% lolos):
  - `TestValidationService_TraceabilityAndImpact`: PASS (termasuk verifikasi healing status outdated ke draft).
  - `TestDocumentService_PRD_SRS_ApprovalGating`: PASS
  - `TestArchitectureDocumentLifecycle`: PASS
  - `TestDesignDocumentLifecycle`: PASS
  - `TestEndToEndScenarios`: PASS (Scenario A-D)

### B. Frontend TypeScript & Production Build
```bash
npm --prefix frontend run build
```
- **Hasil**: Berhasil 100% tanpa error (`tsc` lolos dengan `strict: true`, Vite memproduksi bundel produksi dalam 3.47 detik).

---

## 4. Kesimpulan

Dengan pembaruan ini:
- Pengguna mendapatkan kejelasan mutlak: dokumen di-generate satu per satu saat tombol individu ditekan, atau di-generate berurutan dari awal sampai akhir saat tombol **"Regenerate All (Full Pipeline)"** ditekan.
- Alert *Outdated* di SRS kini memiliki siklus hidup yang benar: muncul saat PRD berubah dan **otomatis lenyap seketika** begitu SRS selesai di-regenerate.
- Project Co-Pilot di sidebar kanan kini menjadi pusat kontrol pipeline yang responsif, terpadu, dan tersinkronisasi penuh dengan kanvas dokumen.
