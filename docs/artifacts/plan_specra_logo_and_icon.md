# Implementation Plan: Visual Identity, SVG App Icon & Wordmark for "specra"

## 1. Goal Description
Mentransformasikan identitas visual aplikasi dari nama sementara (*AI Requirements Studio*) menjadi **`specra`**, dengan standar visual modern Silicon Valley tech tooling (seperti Vercel, Linear, Supabase, Raycast):
- **Wordmark `specra`**: Tipografi Neo-Grotesk Geometris kontemporer (all-lowercase, bold/heavy 700-800, circular counters pada `p`, `e`, `c`, `a` single-story, potongan terminal horizontal 90° pada `s` dan `r`).
- **SVG App Icon (512×512 px)**: Monogram huruf `s` yang presisi di dalam bingkai squircle standar macOS/Windows dengan sentuhan *subtle depth* (dark charcoal gradient `#161920` ke `#0B0D11`, inner stroke highlight, dan drop shadow halus).
- **Integrasi Penuh**:
  - Komponen React terisolasi (`<SpecraIcon />`, `<SpecraWordmark />`, `<SpecraLogo />`).
  - Pembaruan Titlebar header, Welcome canvas screen, Settings modal, `index.html` (favicon & title), dan window title desktop `main.go`.
  - Regenerasi aset desktop macOS (`icons.icns`), Windows (`icon.ico`), dan master image (`appicon.png`).

---

## 2. User Review Required
> [!IMPORTANT]
> - Nama aplikasi resmi diperbarui dari *AI Requirements Studio* menjadi **`specra`** (all-lowercase untuk wordmark).
> - Seluruh ikon dan wordmark dibuat dalam bentuk **Pure Vector SVG** mandiri (tanpa dependensi font eksternal) sehingga tampil tajam di semua resolusi Retina / High-DPI.
> - Regenerasi aset native desktop (`build/darwin/icons.icns` dan `build/windows/icon.ico`) menggunakan toolchain Wails 3 CLI (`wails3 generate icons`).

---

## 3. Visual Specification & Design Architecture

### A. Anatomi Huruf Wordmark `specra` (All-Lowercase)
```text
  s      p      e      c      r      a
[───]  [───]  [───]  [───]  [───]  [───]
  │      │      │      │      │      └── Single-story geometris (lingkaran + stem vertikal kanan)
  │      │      │      │      └──────── Lengkungan arch terminal dipotong horizontal bersih
  │      │      │      └─────────────── Open circular counter konsisten dengan p & e
  │      │      └────────────────────── Horizontal crossbar sejajar tepat garis tengah
  │      └───────────────────────────── Stem vertikal stabil ke bawah baseline + mangkuk bulat
  └──────────────────────────────────── Kurva simetris, bukaan aperture sedang, terminal 90°
```

### B. Spesifikasi SVG App Icon (512×512 px)
1. **Dimensi**: `viewBox="0 0 512 512"`
2. **Background Squircle**:
   - Path squircle standar Apple/macOS `(corner radius ~115px)`.
   - Linear Gradient: `#171922` (top) ke `#0A0C10` (bottom).
   - Inner Border: `1.5px stroke` dengan gradien transparan `#FFFFFF` (opacity 0.16 di atas ke 0.03 di bawah) untuk refleksi kaca halus.
3. **Monogram `s`**:
   - Geometri kurva presisi tinggi dengan stroke tebal stabil (~56px).
   - Potongan terminal horizontal 90° yang tegas di kedua ujung.
   - Warna: Pure Solid White (`#FFFFFF`) dengan aksen subtle depth gradient ke `#E2E8F0`.
4. **Subtle Engineering Accent**:
   - Aksen halus dot / beam reflektif di sudut squircle atau pusat kurva yang menegaskan identitas *spec engineering studio*.

---

## 4. Proposed Changes

### Component 1: Frontend Brand Assets

#### [NEW] `frontend/src/components/SpecraBrand.tsx`
Komponen SVG React siap pakai:
- `<SpecraIcon size={number} className={string} />`: Merender squircle 512x512 monogram `s` dengan skalabilitas proporsional.
- `<SpecraWordmark height={number} className={string} />`: Merender wordmark murni `specra` berbasis vector paths presisi (tidak bergantung font lokal).
- `<SpecraLogo size={number} showWordmark={boolean} />`: Kombinasi ikon + teks `specra` dengan proporsi seimbang untuk navbar/titlebar.

#### [NEW] `frontend/public/favicon.svg` & `frontend/src/assets/specra-icon.svg`
Aset SVG mandiri untuk browser favicon dan referensi desktop.

---

### Component 2: UI Integration in `frontend/src/App.tsx`

#### [MODIFY] `frontend/src/App.tsx`
1. **Titlebar Header (Line ~1445)**:
   - Ganti kotak placeholder "AR" + "Requirements Studio" dengan:
     ```tsx
     <button
       type="button"
       onClick={() => { setProjectManagerTab('open'); setIsProjectManagerOpen(true); }}
       className="flex items-center gap-2 px-2 py-1 rounded-[6px] hover:bg-fill-mute text-fg transition-colors shrink-0"
       title="Open Project Manager"
     >
       <SpecraLogo size={22} showWordmark={true} />
     </button>
     ```
2. **Empty State Canvas Welcome Screen (Line ~1900)**:
   - Ganti icon folder default dengan `<SpecraIcon size={56} />`.
   - Perbarui judul: `Selamat Datang di specra`.
   - Subjudul: `Personal requirements engineering workspace untuk mentransformasikan ide dan brief proyek menjadi spesifikasi sistem terstruktur.`
3. **Settings Modal Header (Line ~3430)**:
   - Perbarui judul modal menjadi `specra Settings` dengan icon monogram.

#### [MODIFY] `frontend/index.html`
- Perbarui `<title>specra</title>`.
- Perbarui `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`.

---

### Component 3: Desktop Shell & Build Assets

#### [MODIFY] `main.go`
- Update `application.Options`:
  - `Name: "specra"`
- Update `WebviewWindowOptions`:
  - `Title: "specra"`

#### [MODIFY] `build/config.yml`
- Update `productName: "specra"`.
- Update `description: "Personal AI Requirements Engineering Workspace"`.

#### [NEW / GENERATE] Desktop Icon Binaries
1. Generate `build/appicon.png` (1024×1024 high-res master icon).
2. Generate `build/appicon.icon/Assets/wails_icon_vector.svg`.
3. Jalankan `wails3 generate icons` untuk menghasilkan:
   - `build/darwin/icons.icns`
   - `build/windows/icon.ico`

---

## 5. Verification Plan

### Automated Tests
1. **Frontend Compilation**:
   ```bash
   cd frontend && npm run build
   ```
   *Ekspektasi*: 0 TypeScript errors, bundle berhasil dibangun.
2. **Backend Unit & End-to-End Tests**:
   ```bash
   export PATH=$PATH:/opt/homebrew/bin:~/go/bin; go test -v ./internal/...
   ```
   *Ekspektasi*: 13 test suites PASS 100%.
3. **Native Desktop Build**:
   ```bash
   export PATH=$PATH:/opt/homebrew/bin:~/go/bin; wails3 task darwin:build:native
   ```
   *Ekspektasi*: binary `bin/ai-requirements-studio` berhasil dibangun dengan nama dan icon baru.

### Manual Verification
1. **Titlebar Header**: Logo `specra` (monogram squircle + wordmark lowercase) tampil tajam dan elegan di kiri atas.
2. **Empty State Canvas**: Monogram `specra` tampil berukuran 56px dengan teks selamat datang yang selaras.
3. **Favicon & Window Title**: Window macOS menampilkan judul `specra` dan favicon browser aktif.
4. **Desktop Dock Icon**: Icon aplikasi di dock/taskbar menampilkan monogram squircle `specra`.
