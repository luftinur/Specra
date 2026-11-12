# Implementation Plan: Unified Agentic Console, Pipeline Stepper & Interactive Q&A Loop

Dokumen rencana kerja ini merumuskan langkah eksekusi komprehensif (Fase 12) untuk menyatukan seluruh alur requirements engineering menjadi pengalaman **Agentic AI Workspace** yang utuh dan ergonomis.

---

## 1. Goal Description
Transformasi antarmuka kerja desktop menjadi sistem yang saling terhubung erat antara navigasi dokumen, kanvas interaksi agen, dan database kebutuhan:
1. **Unified Prompt Console**:
   - Menghapus deretan tab persona yang memadati bagian atas kanvas, membebaskan ruang pandang vertikal.
   - Memindahkan kontrol **Persona Selector** dan **Interaction Mode Selector** langsung ke dalam **Elevated Prompt Console** di bagian bawah kanvas (bersanding dengan paperclip, prompt input, dan tombol kirim).
2. **Slash Commands Autocomplete System (`/`)**:
   - Menghadirkan command menu popover saat mengetik `/` di prompt bar (`/plan`, `/discovery`, `/exec`, `/prd`, `/srs`, `/arch`, `/design`, `/validate`, `/clear`).
3. **Interactive Clarification Cards di Chat Bubble (The Q&A Loop)**:
   - Merender pertanyaan klarifikasi AI langsung di dalam chat bubble asisten dalam bentuk kartu form interaktif. Pengguna bisa langsung mengetik jawaban di dalam bubble; jawaban otomatis mengubah kartu menjadi hijau (`Confirmed Answer`) dan tersimpan ke SQLite.
4. **Project Pipeline Stepper (Visual Lifecycle Progress)**:
   - Menampilkan bar status progres horizontal ramping di atas kanvas:
     `[1. Discovery] ➔ [2. PRD] ➔ [3. SRS] ➔ [4. Architecture] ➔ [5. Design System]`
     yang merefleksikan status riil dokumen (*Draft*, *Approved*, *Locked/Gated*, *Outdated*).
5. **AI Pipeline Readiness Recommender (Next-Best-Action)**:
   - Saat discovery telah mengumpulkan requirement yang cukup (>= 3 confirmed items), AI memunculkan kartu rekomendasi di chat: *"Requirements dasar telah matang. Siap beralih ke PRD?"* lengkap dengan tombol aksi 1-klik `[Generate PRD Sekarang]`.
6. **Web Reference Harnessing untuk UI/UX Agent**:
   - Mendukung deteksi URL web referensi (misal `https://linear.app`, `https://stripe.com`) di prompt UI/UX Agent untuk memandu ekstraksi token warna, tipografi, dan gaya komponen ke dalam `design.md`.

---

## 2. Arsitektur Komponen & UI Layout

```
+----------------------------------------------------------------------------------------------------+
|  [Logo] Requirements Studio   |  [Project Tab: E-Commerce X]  [+]              v1.5.5  [Panels] [⚙️]  |
+-------------------+----------------------------------------------------+---------------------------+
| WORKSPACE         | [1. Discovery ✓] ➔ [2. PRD ● Active] ➔ [3. SRS 🔒]...| REQUIREMENTS (6)      [x] |
|                   +----------------------------------------------------+---------------------------+
|  Chat Discovery   |                                                    |                           |
|  PRD Document     |  [Chat Feed]                                       |  +---------------------+  |
|  SRS Doc     [🔒] |  Bot: "Saya telah menganalisis brief checkout..."  |  | REQ-001 [Must Have] |  |
|  Arch        [🔒] |  +----------------------------------------------+  |  | Multi-channel Pay   |  |
|  Design Sys  [🔒] |  | ❓ Clarification Needed (Q&A Loop)           |  |  | [Approve] [Reject]  |  |
|                   |  | Q: Berapa batas waktu timeout auto-cancel?   |  |  +---------------------+  |
| ----------------- |  | [ Input: 15 menit___________ ] [Kirim Jwb]   |  |                           |
| ACTIVE PROJECT    |  +----------------------------------------------+  |  Validation: 0 Issues     |
| E-Commerce App    |                                                    |  Traceability: 100%       |
|                   |  +----------------------------------------------+  |                           |
|                   |  | 💡 AI Pipeline Recommendation:               |  |                           |
|                   |  | "5 requirements terkonfirmasi. Siap ke PRD!" |  |                           |
|                   |  | [ 📄 Generate Draft PRD (20 Sections) ]      |  |                           |
|                   |  +----------------------------------------------+  |                           |
|                   +----------------------------------------------------+                           |
|                   | (Unified Prompt Console)                           |                           |
|                   | [👤 Product Analyst ▾]  [🔍 Discovery ▾]  [💡 /]   |                           |
|                   | +------------------------------------------------+ |                           |
|                   | | [📎] Ketik instruksi atau / untuk perintah...  | |                           |
|                   | +------------------------------------------------+ |                           |
+-------------------+----------------------------------------------------+---------------------------+
```

---

## 3. Proposed Changes

### Component 1: Unified Prompt Console & Slash Commands (`frontend/src/App.tsx`)
#### [MODIFY] `frontend/src/App.tsx`
1. **Hapus Bar Tab Persona di Atas Kanvas** (baris 1607–1636).
2. **Pindahkan Kontrol Persona & Mode ke dalam Prompt Console**:
   - Di atas input textfield, sediakan toolbar mini:
     - Pill Persona Selector: `[👤 Product Analyst ▾]` dengan popover untuk beralih antara 4 spesialis.
     - Pill Mode Selector: `[🔍 Discovery Mode ▾]` / `[⚡ Execution Mode]` untuk beralih interaksi.
     - Hint pintas: *"Ketik / untuk command cepat"*.
3. **Slash Commands Autocomplete Popover**:
   - Deteksi input yang diawali `/`.
   - Render menu popover mengambang di atas prompt bar dengan 10 perintah cepat:
     - `/discovery`, `/exec`, `/plan`, `/clarify`, `/prd`, `/srs`, `/arch`, `/design`, `/validate`, `/clear`.
   - Dukung navigasi tombol keyboard (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`).

---

### Component 2: Interactive Clarification Cards di Chat Bubble (`frontend/src/App.tsx`)
#### [MODIFY] `frontend/src/App.tsx`
1. Pada setiap bubble asisten (saat merender `messages.map`):
   - Hubungkan dengan daftar `clarifications` proyek yang berstatus `open` atau yang baru saja diajukan.
   - Render kartu interaktif di dalam bubble:
     - Badge: `Clarification Needed (Q&A Loop)` (amber).
     - Pertanyaan teks yang diajukan AI.
     - Input field inline + tombol `Kirim Jawaban`.
   - Begitu dijawab:
     - Kartu otomatis berganti tema hijau: `Confirmed Answer`.
     - Menampilkan teks jawaban pengguna.
     - Memanggil `RequirementService.AnswerClarification` ke SQLite dan me-refresh context proyek.

---

### Component 3: Project Pipeline Stepper & AI Readiness Recommender (`frontend/src/App.tsx`)
#### [MODIFY] `frontend/src/App.tsx`
1. **Pipeline Stepper Bar**:
   - Tempatkan bar horizontal ramping di bagian atas kanvas:
     - Step 1: `Discovery` (Status: Selesai jika requirements >= 3).
     - Step 2: `PRD` (Status: `Draft` / `Approved`).
     - Step 3: `SRS` (Status: `Locked` jika PRD belum approved, `Approved` jika selesai).
     - Step 4: `Architecture` (Status: `Locked` jika PRD belum approved).
     - Step 5: `Design System` (Status: `Locked` jika PRD belum approved).
   - Mengklik step yang tidak terkunci langsung berpindah ke dokumen tersebut di sidebar.
2. **AI Pipeline Readiness Card**:
   - Di bagian bawah chat feed, jika `requirements.length >= 3` dan belum ada PRD:
     - Render kartu rekomendasi cerdas AI:
       *"Requirements dasar telah matang. Kami merekomendasikan untuk beralih ke pembuatan PRD."*
     - Tombol 1-klik: `[📄 Generate Draft PRD (20 Sections)]` yang memanggil `handleGeneratePRD()`.

---

### Component 4: Web Reference Prompt Enrichment (`internal/ai/discovery.go`)
#### [MODIFY] `internal/ai/discovery.go`
- Di `BuildDiscoveryPrompt`, tambahkan instruksi khusus jika pesan pengguna mengandung URL web (`http://` atau `https://`):
  > *"When user provides external web references or URLs, extract visual patterns, color tokens, layout aesthetics, and component hierarchy to be harnessed into the Design System."*

---

## 4. Verification Plan

### Automated Tests
1. **Frontend Compilation**:
   ```bash
   cd frontend && npm run build
   ```
   *Ekspektasi: 0 TypeScript errors, Vite build sukses.*
2. **Go Backend Unit Tests**:
   ```bash
   export PATH=$PATH:/opt/homebrew/bin:~/go/bin; go test -v ./internal/...
   ```
   *Ekspektasi: Seluruh 13 unit test suites lulus (100% PASS).*
3. **Native macOS Compilation**:
   ```bash
   export PATH=$PATH:/opt/homebrew/bin:~/go/bin; wails3 task darwin:build:native
   ```

### Manual Verification
1. **Unified Prompt Console**:
   - Pastikan bagian atas kanvas bersih dari tab berulang.
   - Klik pill persona di bawah: ganti antara Product Analyst, System Analyst, Architect, dan UI/UX.
   - Klik pill mode di bawah: ganti antara Discovery dan Execution Mode.
2. **Slash Commands**:
   - Ketik `/` di prompt: popover 10 command muncul.
   - Pilih `/prd` via keyboard Enter: generasi PRD langsung berjalan.
3. **Interactive Clarification Loop**:
   - Masukkan brief di chat.
   - Kartu pertanyaan muncul di bubble asisten. Ketik jawaban langsung pada kartu dan kirim.
   - Kartu berubah menjadi hijau bertanda Confirmed.
4. **Pipeline Stepper & AI Recommendation**:
   - Amati stepper bar di atas kanvas menunjukkan progres alur project.
   - Saat requirement cukup, kartu rekomendasi generasi PRD muncul di chat.

---

## User Review Required
> [!IMPORTANT]
> **Keputusan Final**:
> Apakah Anda menyetujui seluruh rencana eksekusi terpadu di atas?
> Jika disetujui, silakan konfirmasi atau ketik **Proceed** untuk memulai implementasi.
