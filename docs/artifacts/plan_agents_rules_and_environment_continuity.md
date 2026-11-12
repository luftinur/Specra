# Implementation Plan: AI Agent Rules (AGENTS.md) & macOS Development Continuity

Membentuk pedoman resmi AI Agent (`AGENTS.md`), merumuskan aturan baku sinkronisasi otomatis *artifacts* dan *context history* ke `docs/`, serta menyiapkan kelanjutan pengembangan di lingkungan macOS.

---

## 1. Goal Description

Berdasarkan audit komprehensif terhadap basis kode saat ini:
1. **Status `Agents.md`**: File `Agents.md` / `AGENTS.md` **belum ada sama sekali** di repositori ini. Di `docs/README.md` baru tercantum penjelasan deskriptif direktori `docs/artifacts/` dan `docs/context_history/` hasil penyalinan manual sesi sebelumnya di Windows, tanpa ada klausul/aturan wajib bagi AI coding agent untuk selalu memperbarui keduanya.
2. **Kelanjutan Pengembangan di macOS**: Proyek ini sebelumnya dibangun dan diverifikasi penuh di Windows (`Go 1.27.3 + Wails v3 + React + Vite`). Sekarang proyek dibuka di lingkungan macOS (`/Users/luftinurfahmi/VibeCoding/dev-agent-assistant`). Untuk melanjutkan pengembangan dengan lancar, dibutuhkan:
   - Standarisasi aturan AI Agent (`AGENTS.md`) yang mewajibkan pembaruan *artifacts* dan *history*.
   - Sinkronisasi artefak perencanaan dan transkrip saat ini ke `docs/artifacts/` dan `docs/context_history/`.
   - Setup ketergantungan lokal macOS (`Go`, `npm install` untuk frontend).

---

## 2. User Review Required & Decisions Made

> [!IMPORTANT]
> **Keputusan User (Disetujui):**
> 1. **Strategi Transcript History**: File riwayat transkrip **dipisah per sesi/lingkungan** agar riwayat tidak tertimpa dan tetap terlacak utuh:
>    - `docs/context_history/transcript_01_windows.jsonl`: Riwayat sesi awal di Windows (1.963 langkah pengembangan Phase 1-6).
>    - `docs/context_history/transcript_02_macos.jsonl`: Riwayat sesi lanjutan di macOS saat ini dan berikutnya.
> 2. **Aturan Wajib Sinkronisasi `docs/artifacts/`:**
>    Setiap AI Agent wajib menyalin artefak perencanaan (`.md`) yang dibuat/diperbarui di brain Antigravity langsung ke `docs/artifacts/<nama_file>.md`.

> [!NOTE]
> **Status "Running Dev di macOS" Saat Ini:**
> Saat ini dev mode **belum bisa langsung berjalan** karena:
> - `go` belum terpasang (`brew install go`).
> - `wails3` CLI belum terpasang (`go install github.com/wailsapp/wails/v3/cmd/wails3@latest`).
> - `frontend/node_modules` belum di-install (`cd frontend && npm install`).
> - Yang **sudah siap**: `Apple Clang 17.0.0` (CGO WebKit/Cocoa), `Node.js`, dan `npm`.

---

## 3. Eksekusi Langkah Persiapan Dev di macOS

Untuk dapat menjalankan `wails3 dev` atau `npm run dev` di Mac, langkah-langkah yang akan dijalankan:
1. **Frontend Install**:
   ```bash
   cd frontend && npm install
   ```
2. **Go & Wails v3 CLI Install**:
   ```bash
   brew install go go-task
   go install github.com/wailsapp/wails/v3/cmd/wails3@latest
   export PATH=$PATH:$(go env GOPATH)/bin
   ```
3. **Verifikasi Build & Dev**:
   ```bash
   wails3 dev
   ```

---

## 4. Proposed Changes

### Documentation & AI Agent Governance

---

#### [NEW] `AGENTS.md`
Membuat file pedoman utama bagi seluruh AI Coding Agent dan pengembang di root proyek, mencakup:
1. **Identitas & Arsitektur Proyek**: Desktop App Wails v3 + React 19 + TypeScript + Go + SQLite + MQ-Studio Token System.
2. **4 Specialist Personas**: Product Analyst, System Analyst, Software Architect, UI/UX Agent.
3. **Mandatory Artifact & History Maintenance Protocol**:
   - Definisi kewajiban sinkronisasi artifact ke `docs/artifacts/`.
   - Definisi kewajiban pencatatan riwayat transkrip ke `docs/context_history/`.
   - Kewajiban pemeliharaan indeks pada `docs/README.md`.
4. **Engineering Standards**:
   - Zero-Mock execution (Pure real AI & fail-fast).
   - Strict TypeScript & no `any`.
   - High-contrast WCAG AA typography standards (14px base, anti-washed out colors).
   - Keamanan credential store (OS keyring / SQLite).

```markdown
# AGENTS.md — AI Agent Development & Project Rules

Dokumen ini adalah **Authoritative Guidelines & Primary Source of Truth** bagi seluruh AI Coding Agent dan developer yang bekerja pada repositori `AI Requirements Studio (dev-agent-assistant)`.

---

## 1. Project Mission & Identity
- **Nama Aplikasi**: AI Requirements Studio
- **Platform**: Desktop Application (Local-first, Chat-first)
- **Teknologi**: Go 1.27+ + Wails v3 + React + TypeScript + Tailwind CSS + SQLite
- **Design System**: MQ-Studio 0.4.2 Ergonomic Tokens (Warm Stone / Obsidian Slate / System)
...
```

---

#### [MODIFY] `docs/README.md`
- Menambahkan tautan dan referensi ke `AGENTS.md`.
- Memperbarui daftar katalog dokumen `docs/artifacts/` dengan file plan baru.
- Menjelaskan protokol sinkronisasi artefak dan context history.

---

#### [NEW] `docs/artifacts/plan_agents_rules_and_environment_continuity.md`
- Menyimpan salinan rencana implementasi ini secara langsung di folder `docs/artifacts/` sesuai aturan baru.

---

## 5. Verification Plan

### Automated Tests
1. Verifikasi integritas file markdown dan struktur direktori:
   ```bash
   test -f AGENTS.md && echo "AGENTS.md exists"
   test -f docs/artifacts/plan_agents_rules_and_environment_continuity.md && echo "Artifact copied"
   ```
2. Verifikasi status git working directory:
   ```bash
   git status
   ```

### Manual Verification
1. Periksa keterbacaan file `AGENTS.md` di root proyek.
2. Pastikan seluruh aturan sinkronisasi artifact dan context history terdokumentasi dengan jelas, tegas, dan mudah dipatuhi oleh agent manapun di masa depan.
