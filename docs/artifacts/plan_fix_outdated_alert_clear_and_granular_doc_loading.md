# Plan: Siklus Status Outdated Auto-Clear, Granular Loading States, & Tombol Regenerate All Pipeline Terpadu

**Target Isu UX & Siklus Status Dokumen:**
1. **Outdated Alert Persisting**: Saat dokumen ditandai `Outdated` (misal SRS setelah PRD dimodifikasi), pengguna melakukan *Regenerate SRS*, namun alert banner kuning/merah *"SRS Outdated"* tidak hilang meskipun dokumen baru telah selesai disusun.
2. **Global Loading Bleed-Through**: Saat meng-generate satu dokumen (misal PRD), tombol-tombol dan menu dokumen lain (SRS, Architecture, Design System) ikut menampilkan spinner berputar, memunculkan keraguan apakah AI sedang meng-generate semua dokumen sekaligus atau satu per satu.
3. **Penyediaan Tombol "Regenerate All" Pipeline & Sinkronisasi Project Co-Pilot**: Menyediakan kembali tombol eksekusi pipeline beruntun (*Regenerate All / Auto Pipeline*) yang mudah diakses di Project Co-Pilot (Sidebar Kanan) dan Menu Bar, serta menyinkronkan 5 tahap alur dokumen (*Pipeline Stepper*) dengan interaksi split view dan persona auto-switching secara real-time.

---

## 1. Goal Description

### Klarifikasi Pertanyaan Pengguna:
> *"saat mengenerate salah satu dokumen misal prd itu gw liat menu2 lain srs & architecture serta design system ikut loading apakah itu mengenerate semua atau satu per satu ? sama perlu ada button regenerate all lagi seperti di awal secara pipeline daripada keseluruhan satu persatu di sidebar kanan project copilot juga harus tersinkronisasi dengan baik, coba pelajari lagi ya plannya dan adjust"*

- **Fakta Eksekusi Dokumen**: Sistem **HANYA meng-generate dokumen satu per satu** sesuai tombol yang diklik pengguna (`GeneratePRD` hanya menyusun PRD; `GenerateSRS` hanya menyusun SRS). Sistem tidak pernah menjalankan dokumen lain secara diam-diam.
- **Akar Masalah (*Root Cause*) Tampilan Loading Masal**: Di frontend sebelumnya hanya ada **1 boolean global** (`isDocLoading`). Karena boolean ini dibagikan ke seluruh menu dan komponen `DocumentCanvasPane`, tombol generate pada SRS, Architecture, dan Design System ikut membaca nilai `true`, sehingga seolah-olah semuanya ikut diproses. Jika pengguna membuka tab SRS saat PRD sedang berjalan, kanvas SRS bahkan menampilkan layar pemuatan penuh (*full-screen loader*).
- **Akar Masalah Alert Outdated Tidak Hilang**:
  - Ketika PRD diperbarui, `ValidationService` mendeteksi bahwa timestamp `PRD > SRS`, lalu memperbarui status SRS di database menjadi `outdated`.
  - Ketika pengguna mengklik *"Regenerate SRS"*, `DocumentService.GenerateSRS` berhasil membuat versi dokumen baru (`document_versions`). **Namun**, status dokumen induk pada tabel `documents.status` di database **tidak pernah di-reset kembali ke `'draft'`**.
  - Akibatnya, saat frontend me-refresh detail dokumen, `srsDetails.document.status` tetap bernilai `'outdated'`, dan banner peringatan tetap menempel di antarmuka.
- **Kebutuhan Regenerate All & Sinkronisasi Co-Pilot**:
  - Setelah top stepper bar lama dihapus, pemicu Auto Pipeline hanya tersisa di dalam submenu MenuBar.
  - Pengguna membutuhkan tombol aksi cepat **"⚡ Regenerate All (Full Pipeline)"** yang tampak jelas, terutama di panel **Project Co-Pilot (Tab 3: Status Alur Dokumen)**.
  - Ketika pipeline atau dokumen individu sedang berjalan, stepper 5-tahap di Co-Pilot harus menampilkan status aktif (*spinning loader* / *pulsing stage*), dan setiap tahap dapat diklik untuk membuka Split View dan persona AI terkait secara otomatis.

---

## 2. User Review Required

> [!IMPORTANT]
> **Keputusan Arsitektur & Interaksi Baru**:
> 1. **Dua Mode Eksekusi Terpisah**:
>    - **Per Dokumen (Granular)**: Klik tombol generate di masing-masing kanvas dokumen (`PRD`, `SRS`, dsb.). Hanya dokumen yang dipilih yang akan loading dan di-generate. Dokumen lain tidak ikut loading dan tetap dapat diinspeksi.
>    - **Regenerate All (Full Pipeline)**: Tombol satu klik di Project Co-Pilot & MenuBar yang mengeksekusi Discovery ➔ PRD ➔ SRS ➔ Architecture ➔ Design System secara berurutan dan otomatis menyetujui setiap gerbang dokumen.
> 2. **Siklus Status Outdated Otomatis Sembuh**:
>    - Begitu SRS di-regenerate via `GenerateSRS`, statusnya di database otomatis dipulihkan menjadi `draft`. Banner peringatan Outdated langsung hilang seketika tanpa perlu restart/reload.
> 3. **Sinkronisasi Interaktif Project Co-Pilot**:
>    - Klik tahap pada stepper Co-Pilot akan otomatis membuka dokumen dalam mode `split` dan mengalihkan persona chat AI ke spesialis yang tepat (`Product Analyst`, `System Analyst`, `Software Architect`, `UI/UX Agent`).

---

## 3. Open Questions

Tidak ada pertanyaan memblokir. Alur kerja telah teruji pada backend dan siap diimplementasikan ke frontend.

---

## 4. Proposed Changes

### A. Backend Services (`internal/services/`)

#### [MODIFY] `document_service.go`
- Di dalam `GenerateSRS(projectID string)`:
  Setelah versi baru berhasil disimpan via `s.docRepo.AddVersion`:
  ```go
  _ = s.docRepo.UpdateDocumentStatus(ctx, srsDoc.ID, domain.DocStatusDraft)
  ```
- Di dalam `RegenerateSRSSection(projectID string, sectionNumber int)`:
  Jika status SRS sebelumnya adalah `outdated`, pulihkan status menjadi `domain.DocStatusDraft`.

#### [MODIFY] `validation_service.go`
- Di dalam `RunFullValidation` dan `CheckChangeImpact`:
  Saat membandingkan `prdVer.CreatedAt` dan `srsVer.CreatedAt`:
  ```go
  if prdVer != nil && srsVer != nil {
      if prdVer.CreatedAt.After(srsVer.CreatedAt) {
          isOutdated = true
          _ = s.docRepo.UpdateDocumentStatus(ctx, srsDoc.ID, domain.DocStatusOutdated)
          // append finding 'outdated_srs'
      } else if srsDoc.Status == domain.DocStatusOutdated {
          // SRS sudah memiliki versi yang lebih baru dari PRD, pulihkan status ke draft!
          _ = s.docRepo.UpdateDocumentStatus(ctx, srsDoc.ID, domain.DocStatusDraft)
      }
  }
  ```

---

### B. Frontend Architecture (`frontend/src/`)

#### [MODIFY] `frontend/src/App.tsx`
1. **Ganti State Global Loading**:
   - Dari: `const [isDocLoading, setIsDocLoading] = useState(false);`
   - Menjadi:
     ```tsx
     export type GeneratingDocType = 'prd' | 'srs' | 'architecture' | 'design' | null;
     const [generatingDoc, setGeneratingDoc] = useState<GeneratingDocType>(null);
     ```
2. **Perbarui Operasi Dokumen**:
   - `handleGeneratePRD`: `setGeneratingDoc('prd')` -> `finally { setGeneratingDoc(null); }`
   - `handleGenerateSRS`: `setGeneratingDoc('srs')` -> `finally { setGeneratingDoc(null); }`
   - `handleGenerateArchitecture`: `setGeneratingDoc('architecture')` -> `finally { setGeneratingDoc(null); }`
   - `handleGenerateDesign`: `setGeneratingDoc('design')` -> `finally { setGeneratingDoc(null); }`
3. **Sinkronisasi Stepper Project Co-Pilot (Tab 3: Status Alur Dokumen)**:
   - Tambahkan fungsi handler `handlePipelineStepClick(stepId: 'chat' | 'prd' | 'srs' | 'architecture' | 'design')`:
     - Jika `stepId === 'chat'`: Buka mode `chat`, persona Product Analyst.
     - Jika `stepId` dokumen: Panggil `handleOpenDocument(stepId)` (Split View + Persona sync).
   - Di setiap item tahap stepper:
     - Jika `generatingDoc === step.id` atau `(autoPipelineRunning && autoPipelineStage?.includes(step.name))`: Tampilkan `<Loader2 size={12} className="animate-spin text-primary" />` dan label `Diproses...`.
     - Tahap aktif ditandai highlight border primary.
4. **Tombol Prominen "Regenerate All (Full Pipeline)" di Co-Pilot**:
   - Tepat di bawah stepper 5-tahap, sediakan:
     - Saat diam: Tombol aksentuasi `⚡ Regenerate All (Full Pipeline)` dengan tooltip deskriptif.
     - Saat berjalan: Kartu animasi berdenyut `Loader2 + Stage Name (misal: 3/5: Menyusun SRS...)` beserta tombol `Batal`.
5. **Navigator Sidebar (Kiri)**:
   - Tampilkan spinner animasi dan badge `Generating...` **hanya** pada item dokumen yang cocok dengan `generatingDoc`.
   - Dokumen lain tetap menampilkan badge status aslinya.

#### [MODIFY] `frontend/src/components/DocumentCanvasPane.tsx`
1. **Perbarui Props**:
   - Ganti `isDocLoading: boolean` menjadi `generatingDoc: GeneratingDocType`.
   - Hitung: `const isThisDocLoading = generatingDoc === docType;`
   - Hitung: `const isOtherDocLoading = generatingDoc !== null && generatingDoc !== docType;`
2. **Koreksi Tombol Generate & Banner**:
   - Tombol generate PRD hanya memutar spinner jika `generatingDoc === 'prd'`.
   - Tombol generate SRS hanya memutar spinner jika `generatingDoc === 'srs'`.
   - Tombol generate Arch hanya memutar spinner jika `generatingDoc === 'architecture'`.
   - Tombol generate Design hanya memutar spinner jika `generatingDoc === 'design'`.
3. **Isolasi Kanvas Pemuatan**:
   - Layar pemuatan penuh (*full-screen loader*) hanya muncul jika `isThisDocLoading` bernilai `true`.
   - Jika pengguna membuka SRS saat PRD sedang digenerate (`isOtherDocLoading`), kanvas SRS **tidak** memblokir layar dengan loader, melainkan menampilkan notifikasi halus di header: *"Product Analyst sedang menyusun PRD di latar belakang..."*, sementara konten SRS tetap dapat dibaca/diinspeksi.
4. **Outdated Banner Action**:
   - Tombol `Regenerate SRS` otomatis memanggil `onGenerateSRS`, dan setelah selesai banner otomatis hilang.

#### [MODIFY] `frontend/src/components/DesktopMenuBar.tsx`
- Tambahkan properti `generatingDoc?: GeneratingDocType` pada menu dropdown `Documents`.
- Berikan tombol pintas cepat **`⚡ Regenerate All`** di sisi kanan menubar (berdampingan dengan tombol pemilih mode `💬 Chat`, `◫ Split`, `📄 Doc`).

---

## 5. Verification Plan

### Automated Tests
1. **Backend Go Test Suite**:
   ```bash
   go test -v ./internal/services/...
   go test -v ./internal/...
   ```
   - Verifikasi `TestValidationService_TraceabilityAndImpact` mencakup pengujian regenerasi SRS yang memulihkan status dari `outdated` kembali ke `draft`.
   - Verifikasi seluruh 13 test suite PASS.

2. **Frontend Type Check & Production Build**:
   ```bash
   npm --prefix frontend run build
   ```
   - Verifikasi 0 TypeScript errors pada strict mode.

### Manual Verification
1. **Verifikasi Granular Loading**:
   - Buka dokumen PRD, klik *Regenerate PRD*.
   - Buka dokumen SRS di Split View: Pastikan tombol generate SRS **tidak** ikut berputar dan kanvas SRS tetap menampilkan teks SRS (bukan layar loading penuh).
   - Pastikan di Navigator Kiri hanya PRD yang berlabel *Generating...*.
2. **Verifikasi Auto-Clear Alert Outdated**:
   - Edit PRD manual sehingga SRS menjadi Outdated (banner kuning muncul).
   - Klik *Regenerate SRS*.
   - Begitu dokumen selesai dibuat, pastikan banner kuning Outdated **langsung hilang seketika**.
3. **Verifikasi Tombol Regenerate All di Co-Pilot**:
   - Buka tab `Pipeline & Audit` di sidebar kanan Project Co-Pilot.
   - Klik tombol **"Regenerate All (Full Pipeline)"**.
   - Perhatikan stepper 5-tahap berdenyut dan menampilkan loader berurutan dari Discovery ➔ PRD ➔ SRS ➔ Architecture ➔ Design System.
   - Klik salah satu tahap pada stepper (misal SRS), pastikan split view langsung beralih ke SRS dan persona berpindah ke System Analyst.
