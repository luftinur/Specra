# Walkthrough: Fase 13 — Mermaid Blocks, Document Preview Mode, Auto-Detect Agents & Adaptive Dropdowns

Fase 13 telah selesai diimplementasikan penuh untuk menghadirkan pengalaman visual kelas studio bagi diagram arsitektur dan alur spesifikasi sistem, auto-deteksi biner coding agent lokal, dan penyempurnaan interaksi konsol.

---

## 1. Fitur Baru yang Diimplementasikan

### A. Interactive Mermaid Diagram Blocks (`<MermaidBlock />`)
- **Visual Preview Mode**:
  - Merender diagram Mermaid menjadi visual SVG interaktif beresolusi tinggi menggunakan pustaka `mermaid`.
  - Otomatis menyesuaikan tema aplikasi (*Warm Stone Light* vs *Obsidian Slate Dark*) melalui injeksi token warna CSS dinamis.
- **Deteksi Tipe Diagram Otomatis**:
  - Otomatis mendeteksi header diagram: `Flowchart`, `C4 Architecture`, `Sequence Diagram`, `Class Diagram`, `State Diagram`, `Entity-Relationship`, `Gantt Chart`, `Pie Chart`, `Mindmap`, `Git Graph`.
  - Ditampilkan dalam badge pill modern pada header diagram.
- **Segmented View Mode Switcher**:
  - `[👁️ Visual]`: Menampilkan visual diagram SVG yang bersih.
  - `[< > Code]`: Menampilkan sintaks kode mentah Mermaid di dalam dark card dengan font monospace.
- **One-Click Copy Button**:
  - Tombol `[📋 Copy Mermaid]` di setiap diagram.
  - Klik langsung menyalin kode Mermaid ke clipboard sistem dan memberikan indikator `[✓ Copied!]` selama 2 detik.
- **Zoom & Pan Controls**:
  - Tombol `Zoom In (+)` dan `Zoom Out (-)` dengan rentang skala 40% – 250% dan indikator persentase zoom.
  - Tombol `Reset Zoom` untuk mengembalikan ke skala 100%.
- **Graceful Error Fallback**:
  - Jika LLM menghasilkan sintaks Mermaid yang sedikit kurang tepat, komponen tidak mengalami crash melainkan menampilkan banner peringatan informatif dan otomatis menyajikan tampilan kode sumber agar pengguna tetap dapat menyalin atau memperbaikinya.

### B. Rich Markdown Viewer (`<MarkdownViewer />`)
- Merender teks spesifikasi terstruktur dengan tipografi MQ-Studio:
  - Headings (H1, H2, H3, H4) dengan pembatas garis elegan.
  - Tabel responsif bergaris bersih dengan header berlatar panel dan sel zebra hover.
  - Bullet lists, numbered lists, blockquotes berciri aksen primer, dan link interaktif.
  - Blok kode non-mermaid dilengkapi badge bahasa dan tombol copy kode mandiri.
- Terintegrasi di:
  1. **Document Workspace**: PRD (20 Sections), SRS (22 Sections), Architecture (16 Sections), dan Design System (16 Sections).
  2. **Chat Discovery**: Bubble pesan asisten AI kini otomatis merender diagram Mermaid dan format Markdown secara interaktif!

### C. Document Workspace Controls
- **Segmented View Switcher**: Pilihan `[👁️ Preview Mode]` vs `[< > Raw Markdown]` di banner kontrol dokumen.
- **One-Click Full Doc Copy**: Tombol `[📋 Copy Doc]` di toolbar atas untuk menyalin seluruh isi dokumen markdown dengan satu klik.
- **Pelebaran Kontainer**: Ukuran panggung dokumen diperluas dari `max-w-prose` (sempit) ke `max-w-5xl mx-auto w-full px-4` agar diagram lebar C4 dan tabel arsitektur tidak terhimpit.

### D. Auto-Detect Installed Coding Agents by Default
- Saat aplikasi dimuat atau saat membuka Settings Modal, fungsi `handleDetectAgents(true)` berjalan otomatis di latar belakang.
- Daftar coding agent yang terpasang di komputer lokal (`Antigravity CLI`, `OpenCode`, dll.) langsung muncul pada tab AI Providers tanpa perlu menekan tombol deteksi secara manual.
- Tombol `Set as Primary` langsung mengonfigurasi dan menyimpan provider aktif ke backend SQLite secara instan dengan indikator `Primary Active ✓`.

### E. Adaptive Upward Dropdowns
- Orientasi pembukaan dropdown menu Persona Selector (`Product Analyst`) dan Interaction Mode (`Discovery Mode`) di bottom Unified Prompt Console telah diubah dari `top-full mt-1` (ke bawah) menjadi **`bottom-full mb-2`** (ke atas).
- Menghilangkan masalah dropdown terpotong batas bawah layar (*clipped*), sehingga menu melayang lega di atas console bar.

### F. Pure Vector Wordmark & Squircle App Icon Refinement (`specra`)
- **Wordmark Geometris Murni (All-Lowercase `specra`):**
  - Mengonversi implementasi wordmark dari tag `<text>` menjadi **Pure SVG Vector Paths (`<path d="...">`)**.
  - Huruf **`a`**: *Single-story geometric pure* (lingkaran mangkuk penuh dengan tiang vertikal tegak lurus di kanan), serasi konsisten dengan mangkuk `p`, `e`, dan `c`.
  - Huruf **`s`**: Kurva simetris dengan potongan terminal 90° horizontal presisi.
  - Huruf **`p`**: Stem vertikal turun stabil ke bawah baseline dengan circular counter sempurna.
  - Huruf **`e` & `c`**: Mangkuk lingkaran terbuka dengan horizontal crossbar pada `e` sejajar garis tengah.
  - Huruf **`r`**: Lengkungan terminal arch terpotong bersih.
  - Bebas dependensi font sistem dan 100% konsisten di semua platform.
- **SVG App Icon 512×512 Squircle:**
  - Palet Deep Slate / Dark Charcoal (`#12151A` ➔ `#0F1115` ➔ `#0A0B0E`) dengan kontras rasio WCAG AAA.
  - Ambient top specular glow, stroke inner border 3.5px, monogram `s` tebal (*weight 800*, stroke 54px) ber-depth drop shadow, dan engineering spectrum accent node dot (`#6366F1` ➔ `#38BDF8`).
- **Integrasi UI & Perbaikan TypeScript:**
  - `SpecraWordmark` kini terintegrasi di Settings Modal Header Bar (`<SpecraIcon size={20} /> <SpecraWordmark height={16} />`) dan TitleBar.
  - Menyelesaikan warning/error `TS6133` unused import sehingga `npm run build` 100% clean.

---

## 2. Hasil Verifikasi & Pengujian

1. **Frontend Compilation (TypeScript Strict Mode)**:
   ```bash
   cd frontend && npm run build
   # Output: ✓ built in 2.70s (0 TypeScript errors)
   ```
2. **Backend Unit & End-to-End Tests**:
   ```bash
   go test -v ./internal/...
   # Output: PASS (13 test suites, 100% pass)
   ```
3. **Native Windows Desktop Binary**:
   ```bash
   wails3 task build
   # Output: bin/ai-requirements-studio.exe (22.5 MB) berhasil dibangun
   ```
