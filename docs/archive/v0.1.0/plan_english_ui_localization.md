# Implementation Plan: Comprehensive English UI Localization for Specra

## 1. Executive Summary & Objective

The user requested:
> **"semua bahasa di UI appnya, menggunakan bahasa inggris ya."**  
> *(Translate all user interface languages across the app into English).*

Specra (`AI Requirements Studio`) was originally built with Indonesian labels, tooltips, dialogs, placeholder texts, and feedback messages. This plan outlines a comprehensive, end-to-end English localization across all frontend components, modals, menus, canvases, toasts, and backend validation finding descriptions, transforming Specra into a world-class, professional desktop requirements engineering studio comparable to Linear, Cursor, Raycast, and Obsidian.

---

## 2. Localization Scope & Inventory

Every user-facing string across 10 key files will be translated into clean, concise, modern technical English:

| Component / File | Current Indonesian Strings | Proposed English Translation |
|---|---|---|
| **1. `frontend/src/lib/uiScale.ts`** | `desc: 'Otomatis menyesuaikan skala optimal...'`, `'Teks besar dan anti-lelah...'` | `desc: 'Automatically adjusts optimal scale based on window dimensions'`<br>`desc: 'Crisp readability for standard laptops and displays'`<br>`desc: 'Spacious high-legibility layout for comfortable reading'` |
| **2. `frontend/src/components/ConfirmModal.tsx`** | `cancelLabel = 'Batal'` | `cancelLabel = 'Cancel'` |
| **3. `frontend/src/components/ErrorBoundary.tsx`** | `Terjadi kesalahan aplikasi`, `Muat Ulang Studio` | `An unexpected application error occurred`<br>`Reload Studio` |
| **4. `frontend/src/components/MarkdownViewer.tsx`** | `Salin kode`, `Tersalin!` | `Copy code`<br>`Copied!` |
| **5. `frontend/src/components/MermaidBlock.tsx`** | `Gagal merender diagram Mermaid`, `Salin kode diagram Mermaid` | `Failed to render Mermaid diagram`<br>`Copy Mermaid diagram source` |
| **6. `frontend/src/components/ExportModal.tsx`** | `Ekspor Dokumen Proyek`, `Cakupan Dokumen`, `Semua Dokumen (PRD, SRS, Arsitektur, Design)`, `Dokumen Aktif Saja`, `Pilih Folder Tujuan`, `Ekspor Sekarang` | `Export Project Documents`<br>`Document Scope`<br>`All Documents (PRD, SRS, Architecture, Design System)`<br>`Active Document Only`<br>`Select Destination Folder`<br>`Export Documents` |
| **7. `frontend/src/components/DesktopMenuBar.tsx`** | `Berkas`, `Sunting`, `Tampilan`, `Dokumen`, `Agen AI`, `Bantuan`, `Proyek Baru...`, `Buka Proyek...`, `Buka Kanvas Dokumen Penuh`, `Tutup Kanvas Dokumen` | `File`, `Edit`, `View`, `Documents`, `AI Agent`, `Help`<br>`New Project...`, `Open Project...`, `Full Document Canvas`, `Close Document Canvas` |
| **8. `frontend/src/components/DocumentCanvasPane.tsx`** | `Dokumen Outdated`, `Regenerasi SRS Sekarang`, `Sedang Menulis...`, `Salin Markdown`, `Pratinjau Visual`, `Setujui & Kunci PRD`, `Belum ada dokumen yang dihasilkan` | `Document Outdated`, `Regenerate SRS Now`, `Generating Content...`, `Copy Markdown`, `Visual Preview`, `Approve & Lock PRD`, `No document has been generated yet` |
| **9. `frontend/src/App.tsx`** | `Pilih Proyek`, `Kelola Proyek`, `Mulai Discovery`, `Pertanyaan Klarifikasi`, `Kirim ke AI...`, `Regenerasi Semua (Full Pipeline)`, `Ringkasan Requirements`, `Audit Kepatuhan & Dampak Perubahan`, `Asumsi & Keputusan Kunci` | `Select Project`, `Manage Projects`, `Start Discovery`, `Clarification Questions`, `Ask AI assistant...`, `Regenerate All (Full Pipeline)`, `Requirements Summary`, `Compliance & Impact Audit`, `Key Assumptions & Decisions` |
| **10. `internal/services/validation_service.go`** | `Orphan Requirement: ... belum dipetakan ke SRS...`, `Change Impact Alert: PRD telah diperbarui...` | `Orphan Requirement: ... has not been mapped to SRS yet...`<br>`Change Impact Alert: PRD has been updated since SRS was generated...` |

---

## 3. Detailed Component Translation Breakdown

### 3.1. `DesktopMenuBar.tsx`
- **File Menu**:
  - `Berkas` ➔ `File`
  - `Proyek Baru...` ➔ `New Project...`
  - `Buka Proyek...` ➔ `Open Project...`
  - `Simpan (Auto-saved)` ➔ `Save (Auto-saved)`
  - `Ekspor Dokumen...` ➔ `Export Documents...`
  - `Pengaturan Studio...` ➔ `Studio Settings...`
  - `Tutup Aplikasi` ➔ `Exit Application`
- **Edit Menu**:
  - `Sunting` ➔ `Edit`
  - `Urungkan` ➔ `Undo`
  - `Ulangi` ➔ `Redo`
  - `Salin Konten Dokumen` ➔ `Copy Document Content`
  - `Fokus Chat Input` ➔ `Focus Chat Input`
- **View Menu**:
  - `Tampilan` ➔ `View`
  - `Buka Chat Discovery Saja` ➔ `Discovery Chat Only`
  - `Buka Split View (Chat + Dokumen)` ➔ `Split View (Chat + Documents)`
  - `Buka Kanvas Dokumen Penuh` ➔ `Full Document Canvas`
  - `Buka / Tutup Co-Pilot (Sidebar Kanan)` ➔ `Toggle Project Co-Pilot`
  - `Buka / Tutup Navigator Proyek (Sidebar Kiri)` ➔ `Toggle Project Navigator`
  - `Zoom In / Out / Reset Skala Tampilan` ➔ `Zoom In / Out / Reset Display Scale`
- **Documents Menu**:
  - `Dokumen` ➔ `Documents`
  - `PRD (Product Requirements Document)`
  - `SRS (Software Requirements Specification)`
  - `Architecture (System Architecture)`
  - `Design System (UI/UX Specification)`
  - `Regenerasi Semua Dokumen (Full Pipeline)` ➔ `Regenerate All Documents (Full Pipeline)`
- **AI Agent Menu**:
  - `Agen AI` ➔ `AI Agent`
  - `Mode Interaksi (Autonomous Pipeline, Interactive Discovery, Clarification Q&A, Execution)`
  - `Pilih Persona (Product Analyst, System Analyst, Software Architect, UI/UX Agent)`
- **Help Menu**:
  - `Bantuan` ➔ `Help`
  - `Dokumentasi Specra` ➔ `Specra Documentation`
  - `Daftar Pintasan Keyboard` ➔ `Keyboard Shortcuts`
  - `Periksa Pembaruan...` ➔ `Check for Updates...`
  - `Tentang Specra` ➔ `About Specra`
- **Layout Switcher Pill & Indicators**:
  - `Chat Saja` ➔ `Chat Only`
  - `Split View` ➔ `Split View`
  - `Kanvas Penuh` ➔ `Full Canvas`
  - Tooltips: `Buka Chat Discovery saja`, `Buka Split View berdampingan`, `Buka Kanvas Dokumen penuh` ➔ `Open Discovery Chat only`, `Open side-by-side Split View`, `Open full Document Canvas`
  - Granular loading tooltip: `Sedang memproses...` ➔ `Processing...`

### 3.2. `DocumentCanvasPane.tsx`
- **Header Badges & Action Buttons**:
  - `Outdated` ➔ `Outdated`
  - `Draft` ➔ `Draft`
  - `Approved` ➔ `Approved`
  - `Outdated: PRD telah diperbarui... Regenerasi SRS Sekarang` ➔ `Outdated: PRD was updated after this document was created. Regenerate SRS Now`
  - `Sedang Menulis...` / `Sedang Mengenerasi...` ➔ `Generating Content...` / `Generating...`
  - `Pratinjau Visual` ➔ `Visual Preview`
  - `Sumber Markdown` ➔ `Markdown Source`
  - `Salin Markdown` ➔ `Copy Markdown`
  - `Setujui & Kunci PRD` ➔ `Approve & Lock PRD`
  - `Setujui & Kunci Dokumen` ➔ `Approve & Lock Document`
  - `Terbuka untuk SRS & Pipeline Otomatis` ➔ `Unlocks SRS & Auto Pipeline`
  - `Regenerasi Bagian...` ➔ `Regenerate Section...`
  - `Sedang meregenerasi dokumen ini di latar belakang...` ➔ `Regenerating document in the background...`
- **Empty Canvas State**:
  - `Belum ada dokumen yang dihasilkan` ➔ `No document generated yet`
  - `Mulai percakapan di sebelah kiri untuk menghasilkan dokumen ini.` ➔ `Start a conversation in Discovery Chat to generate this document.`
  - `Generate Sekarang` ➔ `Generate Now`

### 3.3. `ExportModal.tsx`
- Header: `Ekspor Dokumen Proyek` ➔ `Export Project Documents`
- Scope:
  - `Cakupan Dokumen` ➔ `Document Scope`
  - `Semua Dokumen (PRD, SRS, Arsitektur, Design)` ➔ `All Documents (PRD, SRS, Architecture, Design System)`
  - `Dokumen Aktif Saja ({docName})` ➔ `Active Document Only ({docName})`
- Format:
  - `Format File` ➔ `File Format`
  - `Markdown (.md) - Standar & Kompatibel` ➔ `Markdown (.md) - Standard & Portable`
  - `HTML (.html) - Standalone dengan Styling` ➔ `HTML (.html) - Standalone with Styles`
  - `JSON (.json) - Data Terstruktur AST` ➔ `JSON (.json) - Structured AST Data`
- Directory:
  - `Folder Tujuan Ekspor` ➔ `Destination Folder`
  - `Pilih Folder...` ➔ `Browse Folder...`
  - `Belum ada folder yang dipilih` ➔ `No destination folder selected`
- Actions:
  - `Batal` ➔ `Cancel`
  - `Mengekspor...` ➔ `Exporting...`
  - `Ekspor Dokumen` ➔ `Export Documents`
  - Toast: `Berhasil mengekspor {count} dokumen ke {path}` ➔ `Successfully exported {count} document(s) to {path}`

### 3.4. `ConfirmModal.tsx`, `ErrorBoundary.tsx`, `MarkdownViewer.tsx`, `MermaidBlock.tsx`, `uiScale.ts`
- `ConfirmModal`: default `cancelLabel = 'Cancel'`.
- `ErrorBoundary`: `Terjadi kesalahan aplikasi` ➔ `An unexpected application error occurred`, `Muat Ulang Studio` ➔ `Reload Studio`.
- `MarkdownViewer`: `Salin kode` ➔ `Copy code`, `Tersalin!` ➔ `Copied!`.
- `MermaidBlock`: `Gagal merender diagram Mermaid:` ➔ `Failed to render Mermaid diagram:`, `Salin kode diagram Mermaid` ➔ `Copy Mermaid diagram source`.
- `uiScale`: translate scale descriptions to English.

### 3.5. `App.tsx` (Major Translations)
- **Left Navigator & Projects**:
  - `Pilih Proyek` ➔ `Select Project`
  - `Kelola Proyek` ➔ `Manage Projects`
  - `Proyek Baru` ➔ `New Project`
  - `Buat Proyek Baru` ➔ `Create New Project`
  - `Nama Proyek` ➔ `Project Name`
  - `Deskripsi Proyek` ➔ `Project Description`
  - `Batal` ➔ `Cancel`
  - `Buat Proyek` ➔ `Create Project`
  - `Hapus Proyek` ➔ `Delete Project`
  - `Konfirmasi Hapus: Apakah Anda yakin ingin menghapus proyek ini?` ➔ `Confirm Delete: Are you sure you want to delete this project?`
- **Discovery Chat Header & Persona Selector**:
  - `Discovery Chat` ➔ `Discovery Chat`
  - `Mulai Discovery Baru` ➔ `Start New Discovery`
  - `Persona Aktif` ➔ `Active Persona`
  - `Pilih Persona` ➔ `Select Persona`
  - `Pilih Mode Interaksi` ➔ `Select Interaction Mode`
  - `Autonomous Pipeline` ➔ `Autonomous Pipeline`
  - `Interactive Discovery` ➔ `Interactive Discovery`
  - `Clarification Q&A` ➔ `Clarification Q&A`
  - `Execution Mode` ➔ `Execution Mode`
- **Chat Discovery Empty State**:
  - `Selamat Datang di Specra` ➔ `Welcome to Specra`
  - `Mulai dengan mendeskripsikan ide produk atau aplikasi Anda di bawah...` ➔ `Describe your product idea or requirements below to kick off the AI specification pipeline.`
  - `Contoh Prompt Discovery:` ➔ `Example Discovery Prompts:`
- **Chat Reasoning Collapsible**:
  - `Lihat Alur Berpikir AI ({seconds}d)` ➔ `View AI Reasoning Process ({seconds}s)`
  - `Sembunyikan Berpikir AI` ➔ `Hide Reasoning Process`
- **Interactive Clarification Q&A Cards**:
  - `Pertanyaan Klarifikasi ({count})` ➔ `Clarification Questions ({count})`
  - `Jawab pertanyaan berikut untuk mempertajam spesifikasi:` ➔ `Answer the questions below to refine system specifications:`
  - `Kirim Jawaban Klarifikasi` ➔ `Submit Clarification Answers`
  - `Jawaban telah dikirim ke AI` ➔ `Answers submitted to AI`
- **Chat Input Bar & Slash Commands**:
  - `Tulis ide, instruksi, atau gunakan / untuk perintah...` ➔ `Type an idea, instruction, or use / for commands...`
  - `Kirim (Enter)` ➔ `Send (Enter)`
  - Slash command dropup items:
    - `/discovery - Mulai discovery produk komprehensif` ➔ `/discovery - Start comprehensive product discovery`
    - `/plan - Buat rencana implementasi teknis` ➔ `/plan - Create structured implementation plan`
    - `/prd - Generate atau regenerasi Product Requirements Document` ➔ `/prd - Generate or regenerate PRD`
    - `/srs - Generate atau regenerasi Software Requirements Specification` ➔ `/srs - Generate or regenerate SRS`
    - `/arch - Generate atau regenerasi System Architecture` ➔ `/arch - Generate or regenerate Architecture`
    - `/design - Generate atau regenerasi UI/UX Design System` ➔ `/design - Generate or regenerate Design System`
    - `/exec - Eksekusi pipeline spesifikasi menyeluruh` ➔ `/exec - Execute end-to-end specification pipeline`
- **Right Inspector (Project Co-Pilot)**:
  - Tab 1: `Requirements` ➔ `Requirements`
  - Tab 2: `Audit & Kepatuhan` ➔ `Audit & Compliance`
  - Tab 3: `Pipeline & Asumsi` ➔ `Pipeline & Assumptions`
  - Section Headers:
    - `Ringkasan Requirements ({count})` ➔ `Requirements Summary ({count})`
    - `Audit Kepatuhan & Dampak Perubahan` ➔ `Compliance & Impact Audit`
    - `Semua dokumen tersinkronisasi sempurna` ➔ `All documents are perfectly synchronized`
    - `Pipeline Otomatis Spesifikasi` ➔ `Automated Specification Pipeline`
    - `Regenerasi Semua (Full Pipeline)` ➔ `Regenerate All (Full Pipeline)`
    - `Membatalkan Pipeline...` ➔ `Canceling Pipeline...`
    - `Batal Pipeline` ➔ `Cancel Pipeline`
    - `Asumsi Kunci & Keputusan Arsitektur` ➔ `Key Assumptions & Architectural Decisions`
    - `Koreksi Asumsi` ➔ `Correct Assumption`
- **Settings Modal Two-Pane**:
  - `Pengaturan Studio` ➔ `Studio Settings`
  - `Umum & Tampilan` ➔ `General & Display`
  - `Penyedia AI & Model` ➔ `AI Providers & Models`
  - `Skills & Persona` ➔ `Skills & Personas`
  - `MCP Servers` ➔ `MCP Servers`
  - `Tema Tampilan` ➔ `Color Theme`
  - `Skala UI` ➔ `UI Scale`
  - `Status Integrasi AI` ➔ `AI Integration Status`
  - `Simpan Pengaturan` ➔ `Save Settings`
  - `Tutup` ➔ `Close`
- **Toasts & Notifications**:
  - `Proyek berhasil dibuat` ➔ `Project created successfully`
  - `Pengaturan berhasil disimpan` ➔ `Settings saved successfully`
  - `Pipeline regenerasi selesai` ➔ `Pipeline regeneration completed`
  - `Markdown berhasil disalin ke clipboard` ➔ `Markdown copied to clipboard`

### 3.6. `internal/services/validation_service.go`
- Audit finding descriptions:
  - `Orphan Requirement: ... belum dipetakan ke SRS...` ➔ `Orphan Requirement: [FR-xxx] is defined in PRD but not yet mapped to SRS requirements.`
  - `Change Impact Alert: PRD telah diperbarui sejak SRS digenerate...` ➔ `Change Impact Alert: PRD has been updated since SRS was generated. Review and regenerate SRS to resolve outdated state.`

---

## 4. Quality & Verification Strategy

1. **TypeScript Verification**:
   - Run `npm --prefix frontend run build` to verify 0 type errors, clean imports, and strict type compliance.
2. **Go Test Suite**:
   - Run `go test -v ./internal/...` to verify all 13 Go test suites pass with the English audit strings.
3. **UI Visual Check**:
   - Inspect all menus, dialogs, buttons, tooltips, and badges to ensure no truncated strings, broken layouts, or leftover Indonesian text.
4. **Documentation & Git**:
   - Update `docs/artifacts/` and `docs/README.md`.
   - Commit and push to `origin/main` (`https://github.com/luftinur/Specra.git`).

---

## 5. User Feedback & Next Steps

This plan covers a full localization pass to 100% English across the entire Specra codebase.  
Please review the plan. Once you confirm by replying **`proceed`** or **`lanjut`**, execution will start immediately.
