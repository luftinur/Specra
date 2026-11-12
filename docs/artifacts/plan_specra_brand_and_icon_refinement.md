# Implementation Plan — Refinement Visualisasi Wordmark & App Icon `specra`

Dokumen rencana teknis untuk menyempurnakan implementasi **Wordmark** dan **SVG App Icon** `specra` berdasarkan spesifikasi desain geometris *Silicon Valley tech standard* (Neo-Grotesk kontemporer, single-story `a`, circular counters, potongan terminal 90°, dan bingkai squircle berpalet *Deep Slate/Dark Charcoal*).

---

## 1. Goal Description

Menyesuaikan kode visual aset merek `specra` di seluruh ekosistem aplikasi desktop Wails v3 dan frontend React:
1. **Refinement Wordmark `specra` (All-Lowercase):**
   - Mengubah implementasi wordmark dari elemen `<text>` (yang bergantung pada font lokal pengguna) menjadi **Pure Geometric Vector Path (`<path d="...">`)**.
   - Menjamin akurasi anatomi tipografi di semua perangkat:
     - `s`: Simetris, bukaan aperture sedang, terminal horizontal 90°.
     - `p`: Stem vertikal turun stabil ke bawah baseline dengan circular counter murni.
     - `e` & `c`: Open circular counters, horizontal crossbar sejajar garis tengah.
     - `r` & `a`: Arch `r` terpotong bersih, `a` **single-story geometris murni** (lingkaran dengan tiang tegak lurus di kanan) selaras dengan `p`, `e`, dan `c`.
     - Warna: Pure Solid White (`#FFFFFF`) di dark mode / slate-900 di light mode (WCAG AAA).
2. **Refinement SVG App Icon (512x512 px Squircle):**
   - Bingkai squircle `rx="106"` dengan gradien *Deep Slate/Dark Charcoal* (`#12151A` ke `#0F1115`).
   - Monogram huruf `s` dengan kurva berbobot tebal (*Heavy 800*), kedalaman subtil, specular glow atas, dan precision engineering node accent.
3. **Format Aset Multi-Platform:**
   - Menyinkronkan `build/appicon.svg`, `build/appicon.icon/Assets/wails_icon_vector.svg`, `frontend/public/favicon.svg`, dan komponen React [`SpecraBrand.tsx`](file:///E:/dev-agent-assistant/frontend/src/components/SpecraBrand.tsx).
   - Memperbaiki isu unused import `SpecraWordmark` di [`frontend/src/App.tsx`](file:///E:/dev-agent-assistant/frontend/src/App.tsx) sehingga kompilasi TypeScript kembali 100% clean.

---

## 2. User Review & Visual Specifications

> [!NOTE]
> **Mengapa Pure Vector Path untuk Wordmark?**
> Sebelumnya, `SpecraWordmark` menggunakan tag `<text fontFamily="Geist, 'Inter Display', ...">`. Pada komputer yang belum menginstal font Geist atau Inter Display, sistem operasi akan melakukan fallback ke Segoe UI atau Arial, di mana huruf `a` menjadi *double-story* standar dan mangkuk lingkaran tidak geometris sempurna.
> 
> Dengan mengonversi `specra` ke **vektor path geometris murni**, tampilan kata `specra` dijamin 100% identik di semua OS (macOS, Windows, Linux, dan Web) tanpa delay font loading!

### Palet Warna & Kontras:
| Elemen | Nilai Hex | Peran |
|---|---|---|
| **Background Dark Slate** | `#12151A` ➔ `#0F1115` ➔ `#0A0B0E` | Latar belakang squircle icon dengan kontras tinggi |
| **Specular Glow** | `#FFFFFF` (opacity 0.22 ➔ 0.0) | Refleksi cahaya atas tepi squircle |
| **Monogram 's' Foreground** | `#FFFFFF` ➔ `#E2E8F0` | Glif monogram dengan drop shadow lembut |
| **Engineering Accent Node** | `#6366F1` ➔ `#38BDF8` | Titik presisi terminal spektrum (Indigo ke Sky) |
| **Wordmark Glyph** | `#FFFFFF` (Dark) / `#0F172A` (Light) | Solid white / deep slate, rasio kontras 15:1+ |

---

## 3. Proposed Changes

### Component 1: Frontend Branding Component
#### [MODIFY] [`frontend/src/components/SpecraBrand.tsx`](file:///E:/dev-agent-assistant/frontend/src/components/SpecraBrand.tsx)
- Perbarui `SpecraIcon` dengan koordinat lengkungan monogram `s` yang lebih presisi, potongan 90° horizontal, dan penyesuaian gradien deep slate `#12151A` ke `#0F1115`.
- Rekonstruksi `SpecraWordmark` menggunakan **Pure SVG Vector Paths**:
  - Tiap huruf (`s`, `p`, `e`, `c`, `r`, `a`) dirender menggunakan path geometris neo-grotesk presisi dengan single-story `a` dan circular counters.
  - Mendukung prop `height`, `className`, dan `color` (default `currentColor` atau `#FFFFFF`).
- Update `SpecraLogo` agar menggabungkan icon squircle + vector wordmark secara proporsional.

---

### Component 2: Application Vector Icons & Favicon
#### [MODIFY] [`build/appicon.svg`](file:///E:/dev-agent-assistant/build/appicon.svg)
- Perbarui file SVG 512x512 master dengan squircle deep slate `#12151A` - `#0F1115`, specular glow, dan monogram `s` geometris 90°.

#### [MODIFY] [`build/appicon.icon/Assets/wails_icon_vector.svg`](file:///E:/dev-agent-assistant/build/appicon.icon/Assets/wails_icon_vector.svg)
- Perbarui vector asset untuk generator Wails.

#### [MODIFY] [`frontend/public/favicon.svg`](file:///E:/dev-agent-assistant/frontend/public/favicon.svg)
- Perbarui favicon web dengan icon squircle resolusi tajam.

---

### Component 3: Integration & TypeScript Fix in `App.tsx`
#### [MODIFY] [`frontend/src/App.tsx`](file:///E:/dev-agent-assistant/frontend/src/App.tsx)
- Sesuaikan impor di baris 58 agar `SpecraLogo`, `SpecraIcon`, dan `SpecraWordmark` terpakai secara valid (atau rapikan impor yang tidak terpakai), menyelesaikan error `TS6133`.
- Pastikan tampilan logo di Titlebar, Canvas Welcome Screen, dan Settings Modal memancarkan branding baru secara konsisten.

---

### Component 4: Dokumentasi & Pedoman Desain
#### [MODIFY] [`design_system.md`](file:///E:/dev-agent-assistant/design_system.md)
- Perbarui Bab 9 untuk mencantumkan spesifikasi visual wordmark (Neo-Grotesk, single-story `a`, circular counters) dan SVG App Icon.

#### [NEW] [`docs/artifacts/plan_specra_brand_and_icon_refinement.md`](file:///E:/dev-agent-assistant/docs/artifacts/plan_specra_brand_and_icon_refinement.md)
- Sinkronisasi artefak perencanaan ini ke folder `docs/artifacts/` sesuai aturan `AGENTS.md`.

---

## 4. Verification Plan

### Automated Tests
```powershell
# 1. Verifikasi kompilasi TypeScript & Vite bundling
cd frontend; npm run build

# 2. Verifikasi seluruh unit test Go
$env:PATH += ";C:\Program Files\Go\bin;$env:USERPROFILE\go\bin"
go test -v ./internal/...

# 3. Kompilasi biner desktop Wails v3
wails3 task build
```

### Manual Verification
- Periksa logo di Titlebar pojok kiri atas jendela aplikasi: pastikan ikon squircle dan tulisan `specra` tampil tajam dengan huruf `a` single-story geometris.
- Periksa tampilan pada tema terang (*Warm Stone*) dan tema gelap (*Obsidian Slate*).
- Periksa ikon squircle pada Welcome Canvas (tengah layar) saat tidak ada tab project yang aktif.
