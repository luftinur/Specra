# Plan: Decoupling MQ-Studio, Slash Dropup Auto-Scroll, Export All Docs, Chat Q&A Deduplication, & Adaptive HiDPI Scaling

Dokumen rencana teknis komprehensif untuk mengatasi seluruh masukan dan kebutuhan pengguna:
1. **Pembersihan & Isolasi Konteks AI (Decoupling MQ-Studio)**: Menghilangkan referensi "MQ-Studio" dari penalaran AI, isolasi working directory CLI subproses (`cmd.Dir`) ke folder proyek pengguna, dan direktif isolasi domain produk pengguna.
2. **Perbaikan Auto-Scroll & Navigasi Dropup Slash Commands (`/`)**: Memperbaiki popover slash commands di chat agar ketika menavigasi ke bawah via ArrowDown atau scroll, posisi scroll otomatis mengikuti item aktif (*scrollIntoView*), fokus input terjaga, dan tidak terjadi kebocoran scroll ke chat.
3. **Fitur Export All Documents**: Menambahkan kapabilitas ekspor semua dokumen spesifikasi (PRD, SRS, Architecture, Design) sekaligus ke direktori lokal yang dipilih pengguna, baik dari halaman dokumen maupun langsung dari tampilan Chat.
4. **Pembersihan & Deduplikasi Kartu Konfirmasi Chat**: Di dalam bubble chat, hanya render pertanyaan klarifikasi dan kebutuhan yang **BARU / PENDING** (belum dijawab/dikonfirmasi). Item yang sudah dijawab/dikonfirmasi tidak di-render ulang di chat dan tetap tersimpan rapi di Right Inspector sebagai arsip.
5. **Adaptive HiDPI UI Scaling & Typography**: Mengatasi font yang tampak kecil pada layar beresolusi tinggi (3072×1920 @ 175% scaling) dengan menerapkan skala zoom dokumen adaptif (`document.documentElement.style.zoom`), preset ukuran font di General Settings (`Auto HiDPI`, `14px`, `16px`, `18px`, `20px`), serta pintasan keyboard zoom (`Ctrl +`, `Ctrl -`, `Ctrl 0`).

---

## 1. Analisis Akar Masalah (Root Cause Analysis)

### A. Konteks AI Masih Membawa "MQ Studio"
- **Working Directory Subproses CLI (`cmd.Dir` kosong)**:
  `internal/ai/adapters/opencode/adapter.go` dan `antigravity/adapter.go` mengeksekusi CLI dari direktori kerja proses utama (`E:\dev-agent-assistant`). Akibatnya, agen CLI membaca [AGENTS.md](file:///E:/dev-agent-assistant/AGENTS.md), [design_system.md](file:///E:/dev-agent-assistant/design_system.md), dan folder `_ref_ui/` yang mendokumentasikan adopsi token MQ-Studio untuk shell Specra. Model mengira proyek pengguna adalah MQ-Studio.
- **Ketiadaan Klausa Isolasi Domain**:
  Prompt belum secara eksplisit melarang LLM mengasumsikan kerangka kerja developer lokal ke dalam kebutuhan produk pengguna.

### B. Scroll Dropup Slash Command (`/`) Tidak Mengikuti
- Di [`App.tsx`](file:///E:/dev-agent-assistant/frontend/src/App.tsx), event `onKeyDown` tombol `ArrowDown`/`ArrowUp` hanya memperbarui state `selectedSlashIndex` tanpa memanggil `scrollIntoView` pada elemen item yang dipilih.
- Mengklik item dropup mencabut fokus kursor dari `<input>` utama.
- Kontainer popover belum dilengkapi `overscroll-contain`.

### C. Ekspor Dokumen Terbatas pada Dokumen yang Sedang Dibuka
- Tombol `Export` hanya muncul di tampilan PRD/SRS/Architecture/Design dan hanya mengekspor satu dokumen aktif.
- Belum ada fungsi `ExportAllDocuments` di backend maupun opsi menu "Export All Specifications" di UI.

### D. Chat Bubble Mengulang Pertanyaan yang Sudah Dijawab
- Di baris 1996-2065 [`App.tsx`](file:///E:/dev-agent-assistant/frontend/src/App.tsx), iterasi `.map` merender seluruh klarifikasi termasuk yang berstatus `isAnswered = true`.
- Prompt `BuildDiscoveryPrompt` belum menginstruksikan AI untuk tidak mengulang pertanyaan yang sudah dijawab.

### E. Font Terlihat Kecil pada Layar HiDPI (3072×1920 @ 175%)
- Pada layar resolusi tinggi, font berukuran `12px`–`14px` dan elemen antarmuka yang didefinisikan dengan nilai piksel statis (`text-[10.5px]`, `text-[11px]`) tampak sangat kecil.
- `--app-base-font-size` hanya mengatur font dasar, tetapi tidak memengaruhi kelas-kelas Tailwind dengan ukuran piksel statis atau padding layout.
- Perlu adopsi mekanisme **UI Document Zoom** (`document.documentElement.style.zoom`), yang secara native didukung WebView2 Windows dan WebKit macOS untuk memperbesar seluruh antarmuka secara proporsional dan tajam.

---

## 2. Rencana Perubahan Arsitektur & Kode

### Komponen 1: Sandboxing CLI & Decoupling Konteks AI (Backend Go)
1. **Tambahkan `WorkDir` ke `ai.GenerateRequest`**:
   - `internal/ai/provider.go`: tambahkan field `WorkDir string`.
   - `internal/services/conversation_service.go` & `internal/services/document_service.go`: teruskan direktori proyek `s.workspace.ProjectDir(projectID)`.
2. **Set `cmd.Dir = req.WorkDir` pada CLI Adapters**:
   - `internal/ai/adapters/antigravity/adapter.go` & `internal/ai/adapters/opencode/adapter.go`: jika `req.WorkDir != ""`, set `cmd.Dir = req.WorkDir`.
3. **Klausa Isolasi Domain pada Prompt**:
   - `internal/ai/discovery.go`:
     - Tambahkan direktif: *“CRITICAL DOMAIN ISOLATION: Analyze exclusively the USER's specific product from their input. Do NOT inject Specra, MQ-Studio, or internal dev tools. Do NOT repeat answered questions.”*
   - `internal/ai/document_gen.go`:
     - Tambahkan *ISOLATION DIRECTIVE* pada generator PRD, SRS, Architecture, dan Design System.
4. **Pembaruan Deskripsi Skill & Dokumentasi Aturan**:
   - `internal/ai/agent_registry.go`: buat deskripsi skill `semantic-design-tokens` agnostik.
   - `AGENTS.md` & `design_system.md`: tambahkan penegasan bahwa MQ-Studio hanyalah referensi styling shell masa lalu.

---

### Komponen 2: Dropup Slash Command Buttery Smooth & Auto-Scroll (Frontend)
1. **Pusatkan Filter dengan `useMemo`**:
   - `filteredSlashCommands` dihitung secara terpusat dan indeks otomatis di-clamp ke 0 jika filter berubah.
2. **Auto-Scroll dengan `useRef` Array & `useEffect`**:
   - Setiap tombol perintah slash memiliki ref: `slashItemRefs.current[idx] = el`.
   - `useEffect` memicu `scrollIntoView({ block: 'nearest', behavior: 'smooth' })` saat `selectedSlashIndex` berubah.
3. **Cegah Hilang Fokus (`onMouseDown`)**:
   - Pasang `onMouseDown={(e) => e.preventDefault()}` pada dropup agar interaksi mouse tidak mencabut fokus dari `<input>`.
4. **Isolasi Scroll**:
   - Tambahkan `overscroll-contain` dan scrollbar styling agar tidak menggerakkan chat di belakangnya.

---

### Komponen 3: Fitur Export All Documents (Backend & Frontend)
1. **Backend Go (`internal/services/document_service.go`)**:
   - Tambahkan method `ExportAllDocuments(projectID string, targetDir string) (map[string]string, error)`.
   - Mengekspor seluruh dokumen yang tersedia (`PRD.md`, `SRS.md`, `architecture.md`, `design.md`) ke dalam `targetDir`.
2. **Frontend UI (`frontend/src/App.tsx`)**:
   - Tambahkan tombol/dropdown `Export` di Top Header Bar yang selalu tersedia (baik di Chat maupun Document View):
     - *Export Current Document* (jika sedang di tab dokumen).
     - *Export All Documents (.md)*: Meminta lokasi folder target dan mengekspor seluruh spesifikasi sekaligus.

---

### Komponen 4: Deduplikasi & Pembersihan Kartu Chat (Hanya Render yang Baru)
1. **Filter Kartu Klarifikasi di Chat**:
   - Ubah logika render chat:
     `const pendingClarifications = clarifications.filter(c => c.status !== 'answered' && !c.answer);`
   - Hanya tampilkan kartu interaktif jika `pendingClarifications.length > 0`.
   - Item yang sudah dijawab otomatis hilang dari chat bubble agar chat tetap bersih dan fokus pada diskusi baru.
2. **Arsip Lengkap di Right Inspector**:
   - Seluruh daftar klarifikasi (baik yang pending maupun yang sudah dijawab) tetap dapat diakses di Right Inspector tab Clarifications.

---

### Komponen 5: Adaptive HiDPI UI Scaling & Typography Engine (Frontend)
1. **Mekanisme Dokumen Zoom Adaptif**:
   - Terapkan tangga skala font & zoom:
     `FONT_SIZES = [12, 13, 14, 15, 16, 18, 20]` dengan base `13px`.
   - Fungsi `autoFontSize(width, height)`:
     Menghitung rasio layar dan memilih ukuran font optimal secara otomatis (pada layar 3072×1920, otomatis memilih 16px atau 18px dengan rasio zoom ~1.23–1.38).
   - Terapkan ke root:
     `document.documentElement.style.zoom = String(scale);`
     `document.documentElement.style.setProperty('--app-base-font-size', size + 'px');`
2. **Pembaruan General Settings Modal**:
   - Opsi UI Font Scaling:
     - `Auto (Adaptive HiDPI)` (Rekomendasi untuk layar resolusi tinggi).
     - `Compact (13px)`
     - `Standard (14px)`
     - `Large (16px)`
     - `Extra Large (18px)`
     - `Comfort (20px)`
3. **Pintasan Keyboard Zoom**:
   - Tambahkan event listener global:
     - `Ctrl +` / `Ctrl =`: Zoom In satu tingkat.
     - `Ctrl -`: Zoom Out satu tingkat.
     - `Ctrl 0`: Reset ke Auto / Standar.

---

## 3. Rencana Verifikasi & Pengujian

| Pengujian | Langkah Pengujian | Kriteria Keberhasilan |
|---|---|---|
| **Backend Go Unit Tests** | Jalankan `go test -v ./internal/...` | Semua suite test (termasuk `ExportAllDocuments`) lulus 100%. |
| **Verifikasi Isolasi Sandbox `cmd.Dir`** | Uji panggil CLI dengan `WorkDir` terpasang | Subproses berjalan di folder proyek tanpa membaca `AGENTS.md` atau `_ref_ui/`. |
| **Verifikasi Prompt Decoupling** | Periksa prompt `BuildDiscoveryPrompt` dan generator dokumen | Tidak ada istilah internal / MQ-Studio yang bocor ke respon AI. |
| **Verifikasi Dropup Slash Scroll** | Ketik `/` di chat, tekan panah bawah hingga item 10 | Item aktif otomatis ter-scroll ke tengah viewport (*auto scroll-into-view*). |
| **Verifikasi Export All Documents** | Klik "Export All" dari Chat atau Document View | Keempat file (`PRD.md`, `SRS.md`, `architecture.md`, `design.md`) tersimpan di folder tujuan. |
| **Verifikasi Chat Q&A Deduplication** | Submit jawaban klarifikasi di chat | Kartu yang dijawab langsung hilang dari bubble chat dan tersimpan di tab Clarifications sidebar kanan. |
| **Verifikasi HiDPI Scaling** | Buka pada layar 3072×1920 atau ubah preset ke `Auto (Adaptive HiDPI)` / `Large (16px)` | Seluruh font, badge, dan kontrol membesar proporsional, tajam, dan mudah dibaca setara app native Windows. |
| **Verifikasi Frontend Build** | Jalankan `npm run build` di folder `frontend` | Kompilasi TypeScript strict mode berhasil tanpa error (0 errors). |

---

## 4. Konfirmasi & Langkah Lanjutan
Dokumen rencana ini telah disinkronkan ke [docs/artifacts/plan_decouple_mq_studio_and_fix_slash_scroll.md](file:///E:/dev-agent-assistant/docs/artifacts/plan_decouple_mq_studio_and_fix_slash_scroll.md) dan dicatat di [docs/README.md](file:///E:/dev-agent-assistant/docs/README.md).

Silakan berikan konfirmasi **"proceed"** untuk mulai mengimplementasikan seluruh perbaikan ini.
