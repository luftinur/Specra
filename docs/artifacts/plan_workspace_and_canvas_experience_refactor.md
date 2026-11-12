# Implementation Plan: Workspace & Main Canvas Experience Refactor

Merekonstruksi pengalaman antarmuka utama aplikasi desktop **AI Requirements Studio** berdasarkan hasil audit UX/UI:
1. **Hero Empty State Terpadu & Eliminasi Dual Action** (saat belum ada project aktif).
2. **Layered Elevation 3-Pane Workspace** (Sidebar Kiri `bg-panel/75`, Center Stage `bg-surface rounded-xl shadow-xs`, Right Inspector `bg-panel/60`).
3. **Segmented Pill Tabs untuk Specialist Agents** (Pill berkontras tinggi dengan badge ringkas `PRD`, `SRS`, `Arch`, `Design`).
4. **Gated Status Redesign** (Mengganti badge teks kuning `GATED` dengan icon gembok minimalis `Lock`).
5. **Unified Elevated Chat Input Card** (Prompt card melayang dengan attachment & action buttons terpadu).
6. **Illustrated Empty State untuk Requirements Panel** (Panduan visual ekstraksi kebutuhan otomatis).
7. **Titlebar Spacing & Visual Balance** (Margin lega antar elemen sistem).

---

## 1. Goal Description

### Masalah UX Saat Ini Berdasarkan Audit:
1. **Dual Primary Action Membingungkan (Empty State)**: Terdapat tombol `+ Open Project` di sidebar dan `Buka Project Manager` di tengah canvas yang bersaing dan membingungkan pengguna.
2. **Elevasi 3-Pane Terlalu Rata**: Sidebar, kanvas chat, dan inspector panel menggunakan latar belakang putih polos yang serupa tanpa pemisahan kedalaman hierarki visual.
3. **Chip Agen Berdesakan & Muted**: Tab spesialis di header chat memiliki kontras rendah dan teks dalam kurung memanjang tanpa hierarki.
4. **Badge GATED Terkesan Error**: Status terkunci `GATED` berwarna oranye mencolok layaknya peringatan error alih-alih alur kerja bertahap (*gated lifecycle*).
5. **Input Chat Mengambang**: Input chat tampak seperti textfield biasa yang terisolasi.
6. **Requirements Panel Kosong Melompong**: Teks *"Belum ada requirement terekstraksi"* tanpa petunjuk aksi atau visual cue.

---

## 2. User Review Required

> [!IMPORTANT]
> **Komponen Kunci yang Direkonstruksi:**
> 1. **Hero Empty State di Center Canvas**:
>    - Illustrated icon container (`FolderKanban` / `Layers`).
>    - Judul hero: `"Selamat Datang di AI Requirements Studio"`.
>    - Subteks: *"Pilih project yang sudah ada atau buat project baru untuk memulai requirements engineering berbasis AI."*
>    - Dua tombol aksi bersanding: Primary `Buka Project Manager` & Secondary `+ Buat Project Baru`.
>    - **Recent Projects Quick Grid**: Menampilkan 2–3 kartu project terakhir yang bisa dibuka dengan 1-klik langsung ke tab.
>    - Sidebar kiri saat kosong: Diganti dengan instruksi tenang *"Pilih project dari tab atas atau canvas"* tanpa tombol competing.
> 2. **Segmented Modern Pill Tabs untuk Specialist Switcher**:
>    - Status Aktif: `bg-primary-soft text-primary font-semibold border border-primary/30 shadow-2xs`.
>    - Badge peran ringkas: `PRD` (Product), `SRS` (System), `Arch` (Architect), `Design` (UI/UX).
> 3. **Sidebar Gated Status -> Lock Icon Minimalis 🔒**:
>    - Mengganti teks `GATED` oranye dengan icon gembok halus `Lock` (`text-muted-2`) yang rapi dan tenang.
> 4. **Unified Elevated Chat Input Card**:
>    - Input prompt card melayang (`bg-surface border border-border rounded-2xl shadow-sm p-2 flex items-center gap-2`).
> 5. **Requirements Illustrated Empty State**:
>    - Menampilkan illustrated container dengan panduan ramah dan placeholder skeleton cards format `FR-xxx`.

---

## 3. Open Questions

> [!IMPORTANT]
> 1. **Recent Projects Card di Empty Canvas**: Apakah Anda ingin kartu project terakhir menampilkan jumlah requirement terekstraksi (misal: `12 Reqs`) dan tanggal modifikasi terakhir?
> 2. **Sidebar Lock Icon**: Apakah Anda lebih menyukai icon gembok saja (`<Lock size={12} />`) atau icon gembok dengan teks ringkas (`<Lock size={11} /> Locked`)?

---

## 4. Proposed Changes

### Frontend UI (`frontend/src/App.tsx`)

#### [MODIFY] `frontend/src/App.tsx`

1. **TitleBar Header Spacing (Lines 1140–1215)**:
   - Menambahkan margin `mx-2.5` antar elemen pemisah.
   - Merapikan padding dan jarak tab project agar tidak menempel pada logo brand.

2. **Sidebar Navigation Gated Status (Lines 1340–1410)**:
   - Mengubah status `!isPRDApproved` dari teks `Gated` kuning mencolok menjadi icon gembok minimalis `Lock` dengan tooltip informatif.
   - Menyederhanakan kartu `No active project` di sidebar agar tidak bersaing dengan hero center canvas.

3. **Center Canvas Hero Empty State (Lines 1525–1550)**:
   - Menghadirkan Hero Box terpadu dengan 2 tombol utama (Buka vs Buat Baru) dan daftar 2-3 project terakhir jika ada.

4. **Specialist Agent Switcher Pill Tabs (Lines 1495–1525)**:
   - Mengubah chip datar menjadi Segmented Pill Control dengan contrast ratio tinggi dan badge peran ringkas (`PRD`, `SRS`, `Arch`, `Design`).

5. **Unified Elevated Chat Input Card (Lines 1600–1640)**:
   - Membungkus paperclip, input field, dan tombol send ke dalam rounded-2xl elevated card yang estetik.

6. **Requirements Panel Illustrated Empty State (Lines 1975–2000)**:
   - Menambahkan visual empty state dengan icon panduan dan skeleton dashed cards.

7. **3-Pane Layered Background Depth (Lines 1290–1905)**:
   - Canvas/Sidebar: `bg-chrome` / `bg-panel/75`.
   - Center Canvas: `bg-surface rounded-[12px] border border-border shadow-xs`.
   - Right Inspector: `bg-panel/60 border border-border rounded-[10px]`.

---

## 5. Verification Plan

### Automated Tests
1. Verifikasi kompilasi frontend TypeScript:
   ```bash
   cd frontend && npm run build
   ```
2. Verifikasi unit tests Go backend:
   ```bash
   go test ./internal/...
   ```

### Manual Verification
1. Jalankan `wails3 dev` di macOS.
2. Uji kondisi **Empty State** (tutup semua tab project aktif):
   - Periksa Hero Empty State di tengah canvas: tombol Buka & Buat Baru, serta quick cards project terakhir.
   - Periksa bahwa sidebar kiri tidak lagi memiliki tombol ganda yang bersaing.
3. Buka salah satu project untuk menguji **Active Workspace**:
   - Periksa elevasi 3 panel (kedalaman visual sidebar vs center stage vs right inspector).
   - Periksa pill tab spesialis agen di atas chat (kontras tinggi, icon jelas, badge ringkas).
   - Periksa icon gembok pada menu SRS/Architecture/Design di sidebar jika PRD belum approved.
   - Periksa chat input card melayang dengan paperclip dan tombol send terpadu.
   - Periksa panel kanan Requirements saat kosong (tampil illustrated guide yang ramah).
