# Implementation Plan: Mermaid Blocks, Auto-Detect Coding Agents & Adaptive Dropdowns

Dokumen ini merangkum rencana implementasi terpadu untuk tiga penyempurnaan utama:
1. **Interactive Mermaid Diagram Blocks & Rich Markdown Preview** di Document Workspace (PRD, SRS, Architecture, Design System) dan Chat Discovery.
2. **Auto-Detection Coding Agents by Default** di Settings Modal serta kemudahan memilih dan mengaktifkan Agent CLI secara instan.
3. **Adaptive Upward Dropdowns** untuk Persona Selector (`Product Analyst`) dan Interaction Mode (`Discovery Mode`) di bottom Unified Prompt Console agar tidak tertutup batas bawah layar.

---

## 1. Goal Description

### A. Mermaid Diagram Blocks & Document Preview Mode
- Saat ini, dokumen yang di-generate AI hanya ditampilkan dalam bentuk raw text di dalam `<div className="whitespace-pre-wrap">`.
- Pengguna membutuhkan:
  - **Visual Preview Mode**: Diagram Mermaid (seperti C4 architecture, user journey, sequence diagram, flowchart) dirender sebagai visual SVG yang rapi.
  - **Code View Toggle**: Pilihan beralih antara tampilan diagram visual (`[👁️ Visual Diagram]`) dan sintaks kode mentah (`[< > Mermaid Code]`).
  - **One-Click Copy**: Tombol `[📋 Copy Mermaid]` di setiap diagram untuk menyalin kode diagram dengan cepat.
  - **Zoom & Pan Controls**: Kontrol zoom in/out dan reset agar diagram arsitektur yang lebar nyaman dibaca.
  - **Document-Level View Mode**: Switcher `[👁️ Formatted Preview]` vs `[📝 Source Markdown]` dan tombol `[📋 Copy Full Doc]`.

### B. Auto-Detect Coding Agents by Default & Direct CLI Selection
- Saat membuka Settings (tab AI Providers / Models), daftar coding agent (`agy`, `opencode`, Claude, Ollama) saat ini kosong sampai pengguna menekan tombol "Detect Installed Coding Agents".
- Pengguna menginginkan:
  - Deteksi berjalan otomatis saat aplikasi dimuat atau saat membuka settings, sehingga daftar agent lokal langsung muncul tanpa perlu klik manual.
  - Pengguna dapat langsung memilih agen CLI mana yang aktif (`Set as Primary`) dengan persistensi instan.

### C. Adaptive Upward Dropdown Positioning
- Dropdown Persona Selector (`[👤 Product Analyst ▾]`) dan Interaction Mode (`[🔍 Discovery Mode ▾]`) saat ini menggunakan styling `top-full mt-1`.
- Karena posisinya di bottom console (mepet tepi bawah layar), menu tersebut terbuka ke bawah sehingga terpotong oleh batas layar (*clipped/hidden*).
- Solusi: Ubah posisi render menjadi terbuka ke atas (`bottom-full mb-2` / `bottom-[calc(100%+6px)]`) sehingga menu mengambang lega di atas console bar.

---

## 2. User Review Required
> [!IMPORTANT]
> - Pustaka `mermaid`, `react-markdown`, dan `remark-gfm` telah terpasang dan diverifikasi kompatibel penuh (build Vite 530ms, 0 error).
> - Deteksi agen otomatis (`ProviderService.DetectInstalledCodingAgents()`) dijalankan secara asinkron di latar belakang saat aplikasi dibuka, sehingga tidak memblokir render UI awal.
> - Klik `Set as Primary` pada kartu agen yang terdeteksi akan langsung memanggil `ProviderService.ConfigureProviders` dan memperbarui status secara otomatis.

---

## 3. Proposed Changes

### A. New Frontend Modular Components

#### [NEW] `frontend/src/components/MermaidBlock.tsx`
Komponen isolasi untuk me-render satu blok diagram Mermaid:
- **Deteksi Tipe Diagram**: Otomatis mendeteksi tipe diagram (`Flowchart`, `C4 Architecture`, `Sequence Diagram`, `State Diagram`, `ER Diagram`, dll.).
- **Segmented Control**: `[👁️ Visual Diagram]` / `[< > Mermaid Code]`.
- **Copy Button**: `[📋 Copy Mermaid]` dengan status umpan balik `Copied!`.
- **Zoom & Fit**: Kontrol `Zoom In (+)`, `Zoom Out (-)`, `Reset`.
- **Theme Awareness**: Menyesuaikan tema Mermaid dengan token MQ-Studio (*Warm Stone Light* vs *Obsidian Slate Dark*).
- **Graceful Fallback**: Menangkap galat sintaks Mermaid dan otomatis menampilkan raw code box dengan peringatan yang jelas tanpa merusak UI.

#### [NEW] `frontend/src/components/MarkdownViewer.tsx`
Komponen parser markdown lengkap:
- Menggunakan `react-markdown` dan `remark-gfm`.
- Menghubungkan blok kode `mermaid` ke `<MermaidBlock />`.
- Blok kode umum dilengkapi bahasa dan tombol copy.
- Styling elemen Markdown: headings (H1-H4), tables, lists, task checkboxes, blockquotes, links mengikuti token `tokens.css`.

---

### B. Modifications to `frontend/src/App.tsx`

#### 1. Adaptive Upward Dropdown Positioning (Lines ~2167 & ~2225)
Ubah posisi dropdown menu Persona dan Mode agar terbuka ke atas:
```tsx
// Persona Dropdown: dari top-full mt-1 menjadi bottom-full mb-2
<div className="absolute bottom-full left-0 mb-2 w-64 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 divide-y divide-border/50 animate-in fade-in slide-in-from-bottom-2">
  ...
</div>

// Mode Dropdown: dari top-full mt-1 menjadi bottom-full mb-2
<div className="absolute bottom-full left-0 mb-2 w-64 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 divide-y divide-border/50 animate-in fade-in slide-in-from-bottom-2">
  ...
</div>
```

#### 2. Auto-Detect Coding Agents by Default & Instant Primary Selection
- Panggil `handleDetectAgents()` secara otomatis di dalam `loadProviderStatus()` pada inisialisasi awal.
- Saat Settings Modal dibuka, pastikan `handleDetectAgents()` dipanggil jika daftar masih kosong.
- Tambahkan handler `handleSelectPrimaryAgent(agentId: string)`:
  ```tsx
  const handleSelectPrimaryAgent = async (agentId: string) => {
    setPrimaryProvider(agentId);
    try {
      await ProviderService.ConfigureProviders(agentId, fallbackProvider, fallbackEnabled);
      setProviderSaveSuccess(`AI Provider utama diaktifkan: ${agentId}`);
      await loadProviderStatus();
      setTimeout(() => setProviderSaveSuccess(''), 3000);
    } catch (err) {
      alert(`Gagal mengubah provider: ${String(err)}`);
    }
  };
  ```
- Hubungkan tombol `Set as Primary` di setiap kartu agen ke `handleSelectPrimaryAgent(agent.id)`.

#### 3. Document Workspace Markdown & Mermaid Integration
- Tambahkan state `docDisplayMode: 'preview' | 'source'` (default `'preview'`).
- Di *Document Controls Banner*:
  - Tambahkan toggle `[👁️ Preview]` / `[📝 Source]`.
  - Tambahkan tombol `[📋 Copy Full Doc]`.
- Di area konten dokumen (lines ~2600):
  - Ganti `whitespace-pre-wrap` dengan `<MarkdownViewer content={activeDocDetails.current_version.content} isDark={isCurrentDark} />`.
  - Lebarkan kontainer ke `max-w-5xl mx-auto w-full px-4`.
- Di pesan chat asisten AI:
  - Gunakan `<MarkdownViewer content={m.content} isDark={isCurrentDark} />` agar diagram yang dihasilkan dalam chat juga tampil interaktif.

---

## 4. Verification Plan

### Automated Tests
1. **Frontend Compilation**:
   ```bash
   cd frontend && npm run build
   ```
   *Ekspektasi*: 0 TypeScript errors, Vite bundle berhasil dikompilasi.
2. **Backend Regression Tests**:
   ```bash
   export PATH=$PATH:/opt/homebrew/bin:~/go/bin; go test -v ./internal/...
   ```
   *Ekspektasi*: 13 test suites PASS 100%.
3. **Native macOS Desktop Binary**:
   ```bash
   export PATH=$PATH:/opt/homebrew/bin:~/go/bin; wails3 task darwin:build:native
   ```
   *Ekspektasi*: binary `bin/ai-requirements-studio` berhasil dibangun.

### Manual Verification
1. **Dropdown Adaptive Positioning**:
   - Buka Chat Discovery pada project aktif.
   - Klik `[👤 Product Analyst ▾]` ➔ Menu dropdown terbuka ke atas dengan rapi dan tidak terpotong tepi bawah layar.
   - Klik `[🔍 Discovery Mode ▾]` ➔ Menu dropdown terbuka ke atas dengan rapi.
2. **Auto-Detect Coding Agents**:
   - Buka Settings Modal (`⌘,` atau icon Settings) ➔ Tab `AI Providers / Models`.
   - Pastikan kartu coding agent (`Antigravity CLI`, `OpenCode`, dll.) langsung muncul secara otomatis tanpa harus menekan tombol "Detect".
   - Klik tombol `Set as Primary` pada salah satu agent ➔ Langsung tersimpan dan berubah menjadi `Primary Active`.
3. **Mermaid Blocks & Document Preview**:
   - Buka dokumen PRD / SRS / Architecture yang memiliki blok diagram Mermaid.
   - Pastikan diagram visual SVG tampil jelas.
   - Klik `[< > Mermaid Code]` ➔ Beralih ke kode sumber Mermaid.
   - Klik `[📋 Copy Mermaid]` ➔ Muncul indikator `Copied!` dan teks tersalin.
   - Uji tombol `Zoom In (+)` dan `Zoom Out (-)`.
   - Ganti tema Light/Dark ➔ Diagram Mermaid menyesuaikan tema.
