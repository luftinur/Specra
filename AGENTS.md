# AGENTS.md — Mandatory Guidelines for AI Agents & Developers

Dokumen ini adalah **Authoritative Guidelines & Primary Source of Truth** bagi seluruh AI Coding Agent dan pengembang yang bekerja pada repositori **AI Requirements Studio (`dev-agent-assistant`)**. Setiap agen wajib membaca, mematuhi, dan menerapkan seluruh aturan di bawah ini sebelum dan selama melakukan perubahan pada basis kode.

---

## 1. Project Mission & Identity

- **Nama Aplikasi**: AI Requirements Studio
- **Tipe Aplikasi**: Desktop Application (Local-first, Chat-first)
- **Tujuan Utama**: Personal requirements engineering workspace yang mentransformasikan ide/brief pengguna menjadi spesifikasi sistem terstruktur: PRD (20 sections), SRS (22 sections), Architecture (16 sections), dan Design System (16 sections).
- **Core Technology Stack**:
  - **Backend Core**: Go 1.24+ / 1.27+ (Modular domain services, SQLite WAL mode, OS keyring credential storage)
  - **Desktop Shell**: Wails v3 (Native WebKit/Cocoa di macOS, WebView2 di Windows)
  - **Frontend UI**: React 19, TypeScript (Strict Mode), Tailwind CSS v3/v4
  - **Design System Tokens**: MQ-Studio 0.4.2 Token Scale (`src/design/tokens.css`, Warm Stone / Obsidian Slate / System Auto)
  - **AI Provider Integrations**: Pure Real AI execution (Antigravity CLI `agy`, OpenCode CLI `opencode`, Google Gemini 1.5/2.5 REST API) — **Zero-Mock Policy**.

---

## 2. Mandatory Artifact & Context History Synchronization Protocol

Setiap AI Agent yang menjalankan instruksi, perbaikan bug, atau penambahan fitur **WAJIB** mematuhi protokol dokumentasi berikut:

### A. Sinkronisasi Artefak Perencanaan (`docs/artifacts/`)
1. Setiap kali membuat atau memperbarui file perencanaan (`/plan`, arsitektur, audit PRD/SRS, rencana UI, atau walkthrough) di direktori internal Antigravity (`~/.gemini/antigravity-cli/brain/<conversation-id>/`), salinannya **WAJIB langsung disinkronkan / disalin** ke:
   ```text
   docs/artifacts/<nama_file>.md
   ```
2. Dilarang meninggalkan dokumen perencanaan hanya di folder temporary internal tanpa menyimpannya ke `docs/artifacts/`.

### B. Pemisahan Riwayat Transkrip Percakapan (`docs/context_history/`)
1. **Dilarang menimpa (*never overwrite*)** file transkrip sebelumnya.
2. Riwayat transkrip disimpan berseri berdasarkan sesi dan lingkungan pengembangan:
   - `transcript_01_windows.jsonl`: Sesi awal (Phase 1-6 pengembangan desktop di Windows, 1.963 langkah).
   - `transcript_02_macos.jsonl`: Sesi lanjutan di macOS (pembentukan `AGENTS.md` dan setup lingkungan Mac).
   - `transcript_03_<topik>.jsonl`: Sesi-sesi berikutnya bernomor urut sesuai milestone fitur.
3. Di akhir sesi atau milestone, salin file transkrip aktif dari:
   `~/.gemini/antigravity-cli/brain/<conversation-id>/.system_generated/logs/transcript.jsonl`
   ke file nomor urut berikutnya di `docs/context_history/`.

### C. Pemeliharaan Katalog `docs/README.md`
Setiap ada penambahan file di `docs/artifacts/` atau `docs/context_history/`, agen wajib memperbarui daftar tautan dokumen di [`docs/README.md`](file:///Users/luftinurfahmi/VibeCoding/dev-agent-assistant/docs/README.md).

---

## 3. Specialist Personas & Interconnected Pipeline

Sistem memiliki 4 Persona Spesialis dengan alur kerja berjenjang (*upstream-to-downstream context inheritance*):

1. **Product Analyst Agent (`product-analyst`)**:
   - Memimpin fase Discovery awal dari project brief.
   - Bertanggung jawab atas pembuatan dan regenerasi **`PRD.md` (20 Sections)**.
   - Menetapkan persona pengguna, use case, dan MoSCoW prioritization.
2. **System Analyst Agent (`system-analyst`)**:
   - Mewarisi konteks dari PRD yang telah disetujui (*Approved PRD*).
   - Bertanggung jawab atas **`SRS.md` (22 Sections)** berstandar IEEE 830.
   - Memodelkan kebutuhan fungsional (FR-xxx), non-fungsional, data schema, dan *Traceability Matrix*.
3. **Software Architect Agent (`software-architect`)**:
   - Mewarisi konteks dari PRD dan SRS.
   - Bertanggung jawab atas **`architecture.md` (16 Sections)**.
   - Menghasilkan diagram C4 (Mermaid), kontrak API (REST/gRPC), strategi skalabilitas, dan analisis keamanan STRIDE.
4. **UI/UX Agent (`ui-ux-agent`)**:
   - Mewarisi konteks dari PRD (persona), SRS (flows), dan Architecture.
   - Bertanggung jawab atas **`design.md` (16 Sections)**.
   - Menghasilkan Semantic Design Tokens, screen flows (Mermaid), komponen atomik, dan kepatuhan WCAG 2.2 AA.

### Approval Gating Rules:
- Dokumen turunan (SRS, Architecture, Design) **terkunci / terproteksi** sampai dokumen hulu (PRD) berstatus `Approved`.
- Jika PRD mengalami revisi besar setelah disetujui, dokumen turunan wajib ditandai `Outdated` dan di-regenerate sesuai konteks terbaru.

---

## 4. Coding & Architecture Rules

1. **Zero-Mock Policy & Real Fail-Fast**:
   - Dilarang membuat respons AI palsu / mock sintetis pada layer produksi atau fallback silent.
   - Jika CLI AI (`agy`, `opencode`) atau REST API gagal, sistem harus melempar error riil langsung ke UI agar transparan dan dapat segera diperbaiki oleh pengguna.
2. **Strict TypeScript & No `any`**:
   - Semua binding Wails di `frontend/bindings/` dan komponen React harus bertipe ketat.
   - Dilarang menggunakan tipe `any` tanpa alasan teknis yang kuat.
3. **High-Contrast Typography & Design System**:
   - Mengikuti token `tokens.css` MQ-Studio: font dasar **`14px/1.55`**, tidak menggunakan font mikro (`text-[10px]` dilarang, minimal `12px`).
   - Warna teks wajib memiliki kontras tinggi yang lolos WCAG AA (Light: `--c-fg: #171513`, Dark: `--c-fg: #f7f5f3`).
   - Selalu dukung 3 tema: Light Warm Stone, Dark Obsidian Slate, dan System Auto.
4. **Local-First & Path Traversal Security**:
   - Semua project data tersimpan di `workspaces/projects/{id}/` secara lokal.
   - Operasi file attachment dan dokumen wajib divalidasi dari celah path traversal (`filepath.Clean` & proteksi direktori).
5. **Credential Security**:
   - Kunci API (Gemini/OpenAI) disimpan aman menggunakan OS Keyring (Credential Manager / Keychain) atau SQLite terenkripsi. Dilarang mencetak API key di file log biasa.

---

## 5. Development & Testing Commands

### Di Lingkungan macOS:
```bash
# Frontend
cd frontend && npm install
npm run build

# Backend Tests
go test -v ./internal/...

# Dev Mode (Wails v3)
wails3 dev -config ./build/config.yml -port 9245

# Native Build
wails3 task build
```
