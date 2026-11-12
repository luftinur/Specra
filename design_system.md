# AI Requirements Studio
## Design System & UI Guidelines

**Version:** 1.0
**Theme:** Simplify, Clean, Desktop-Native
**Target:** Desktop Application (React + Tailwind CSS)

---

## 1. Design Principles

1. **Desktop-Native Feel:** UI harus terasa seperti aplikasi desktop bawaan (native), bukan website. Gunakan *system fonts*, *snappy interactions*, dan *compact spacing*.
2. **Content-First (Clean):** Mengurangi distraksi visual. Fokus pada percakapan (chat) dan dokumen teks (Markdown). Border dan bayangan (shadow) dibuat sangat halus.
3. **High Information Density:** Karena ini aplikasi untuk profesional (PM, Analyst, Engineer), *padding* dan ukuran teks disesuaikan untuk menampilkan lebih banyak informasi tanpa terlihat berantakan.
4. **Clear Hierarchy:** Pemisahan visual yang jelas antara Sidebar (navigasi), Chat Panel (interaksi), dan Document Workspace (hasil).

---

## 2. Color Palette

Menggunakan palet warna netral (Slate/Zinc) untuk mengurangi kelelahan mata, dengan warna aksen yang jelas untuk aksi dan status.

### 2.1. Base Colors (Light / Dark Mode)
*Menggunakan referensi Tailwind CSS.*

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `bg-app` | `slate-50` (`#f8fafc`) | `slate-950` (`#020617`) | Background utama aplikasi |
| `bg-panel` | `white` (`#ffffff`) | `slate-900` (`#0f172a`) | Background sidebar, card, panel |
| `bg-hover` | `slate-100` (`#f1f5f9`) | `slate-800` (`#1e293b`) | Hover states pada list/button |
| `border-subtle` | `slate-200` (`#e2e8f0`) | `slate-800` (`#1e293b`) | Divider, border panel |
| `text-primary` | `slate-900` (`#0f172a`) | `slate-50` (`#f8fafc`) | Teks utama, judul, body teks |
| `text-muted` | `slate-500` (`#64748b`) | `slate-400` (`#94a3b8`) | Teks sekunder, placeholder, meta info |

### 2.2. Accent & Semantic Colors
| Token | Color (Tailwind) | Usage |
|---|---|---|
| `primary` | `indigo-600` / `indigo-500` | Primary buttons, active tabs, AI highlights |
| `success` | `emerald-600` / `emerald-500` | Approved requirements, success states |
| `warning` | `amber-500` / `amber-400` | Ambiguity warnings, missing info, unconfirmed |
| `danger` | `rose-600` / `rose-500` | Destructive actions (Delete), errors, conflicts |

---

## 3. Typography

Gunakan *System Font Stack* agar aplikasi terasa *native* di Windows, macOS, dan Linux.

* **Font Family:** `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
* **Monospace (Code/Markdown):** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`

### 3.1. Type Scale (Desktop Optimized)
| Element | Size | Weight | Line Height | Tracking |
|---|---|---|---|---|
| `Heading 1` (H1) | 20px (`text-xl`) | 600 (Semibold)| 1.4 | Tighter |
| `Heading 2` (H2) | 16px (`text-base`) | 600 (Semibold)| 1.5 | Normal |
| `Body Large` | 14px (`text-sm`) | 400 (Regular) | 1.5 | Normal |
| `Body Default`| 13px (`text-[13px]`) | 400 (Regular) | 1.5 | Normal |
| `Caption` | 12px (`text-xs`) | 400 (Regular) | 1.4 | Normal |

*(Catatan: Ukuran default base diset di 13px atau 14px, standar untuk desktop UI seperti Slack, VS Code, atau Notion).*

---

## 4. Spacing & Layout System

Berdasarkan sistem *4px Grid* untuk presisi desktop.

* `xs`: 4px
* `sm`: 8px
* `md`: 16px
* `lg`: 24px
* `xl`: 32px

### 4.1. App Layout Structure
Aplikasi menggunakan pola *Three-Pane Layout* atau *Split View*.

1. **Sidebar (Left):** `w-64` (256px) - Project list, settings.
2. **Main Workspace (Center):** Fleksibel (`flex-1`) - Tempat Chat UI.
3. **Context/Document Panel (Right):** `w-96` (384px) hingga 50% layar - PRD/SRS preview, validation details.

---

## 5. UI Components

### 5.1. Buttons
Desain minimal dengan sedikit atau tanpa bayangan (flat design).

*   **Primary:** `bg-indigo-600 text-white rounded-md px-3 py-1.5 text-[13px] font-medium hover:bg-indigo-700 transition-colors`
*   **Secondary/Outline:** `border border-slate-200 bg-white text-slate-700 rounded-md px-3 py-1.5 text-[13px] font-medium hover:bg-slate-50` (Dark: `border-slate-700 bg-slate-900 text-slate-300`)
*   **Ghost/Tertiary:** `bg-transparent text-slate-600 hover:bg-slate-100 rounded-md px-2 py-1 text-[13px]`

### 5.2. Inputs & Forms
*   **Text Input:** `border border-slate-300 rounded-md px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 bg-white`
*   **Chat Input Area:** Borderless design yang terletak di bawah panel utama, dengan divider line di bagian atas. Dapat membesar sesuai isi teks (auto-resize).

### 5.3. Chat Bubbles (AI & User)
Visual chat di desktop harus *subtle*, tidak seperti bubble chat di aplikasi mobile (WhatsApp/iMessage).

*   **User Message:** Rata kanan (opsional) atau sebaris dengan background halus `bg-slate-100` (Dark: `bg-slate-800`), teks hitam/putih. Padding `p-3 rounded-lg`.
*   **AI Message:** Background transparan (menyatu dengan background aplikasi), border kiri tebal (kiri) `border-l-2 border-indigo-500 pl-4 py-1`.
*   **AI Action Cards (Requirement Snippet):** Jika AI menghasilkan requirement terstruktur, tampilkan dalam bentuk Card kecil: `border border-slate-200 rounded-md p-3 bg-white shadow-sm`. Terdapat tombol **[Approve]** atau **[Reject]**.

### 5.4. Document Editor (Markdown)
*   **Typography:** Lebar baris maksimal `max-w-prose` (sekitar 65-70 karakter) agar nyaman dibaca.
*   **Headings:** Margin top yang besar `mt-6`, margin bottom kecil `mb-2`.
*   **Code/Requirements ID:** Gunakan format monospace dengan background `bg-slate-100 text-indigo-600 px-1 rounded text-xs`. (Contoh: `REQ-001`).

---

## 6. Iconography

*   **Gaya Icon:** *Outline, stroke width 1.5px atau 2px*.
*   **Library Rekomendasi:** [Lucide Icons](https://lucide.dev/) atau [Heroicons](https://heroicons.com/).
*   **Ukuran:** `16x16` untuk button/inline, `20x20` untuk navigasi sidebar.

---

## 7. Motion & Animation

Animasi di desktop app harus *snappy* (sangat cepat) dan bertujuan fungsional.

*   **Hover States:** `duration-150 ease-in-out` (Warna background berubah).
*   **Panel Slide/Toggles:** `duration-200 ease-out` untuk transisi membuka Document Sidebar atau Inspector.
*   **Tidak ada animasi loading yang berlebihan.** Gunakan *skeleton loading* yang halus atau spinner kecil yang inline di sebelah teks status (misal: "Generating PRD...").

---

## 8. Specific UI States

*   **Empty States:** Gunakan ikon abu-abu berukuran sedang dengan teks penjelas singkat dan satu CTA primary. (Contoh: "No projects yet. Create your first project.")
*   **Validation Findings:** Tampilkan sebagai list dengan *color-coded side border* (Kuning untuk Warning, Merah untuk Conflict).
*   **Provider Status Badge:** Indikator titik (dot) hijau/merah/abu-abu di sudut UI untuk menunjukkan status koneksi (Local/CLI/API) secara unobtrusive.

---

## 9. Reference UI Architecture & Catatan `_ref_ui/`

Aplikasi ini mengadopsi pola antarmuka dan sistem token warna dari **MQ-Studio (v0.4.2)**. 

### 9.1. Komponen & Pola yang Diadaptasi
1. **Figma-Style Horizontal Tabs (`ConnectionTabs.tsx`):**
   - Ditempatkan langsung pada TitleBar jendela aplikasi (`.tb2`).
   - Mendukung multi-project tabs, indikator aktif, status dot, dan tombol close tab `X` serta tombol tambah project `+`.
2. **Comprehensive Color Token Scale (`tokens.css`):**
   - Chrome ground: `--c-chrome` (`#f2ede4` Light, `#121110` Dark).
   - Elevated canvas sheet: `--c-bg` (`#faf6f0` Light, `#1a1816` Dark).
   - Interactive fills: `--c-fill`, `--c-fill-soft`, `--c-fill-mute`.
   - Primary cobalt: `--c-primary` (`#2b5797` Light, `#4a7fc7` Dark).
   - Semantic tone badges: `--c-tone-blue`, `--c-tone-teal`, `--c-tone-violet`, `--c-tone-orange`.
3. **Shell Layout Structure (`.m3`):**
   - 198px sidebar rail (`.side3`) menempel langsung pada chrome ground.
   - Sheet konten utama melayang dengan sudut membulat (`rounded-[10px]`) dan gutter 8px (`.mqs-content`).
   - Inspector / Right dock yang terintegrasi secara harmonis.

### 9.2. Status Folder Referensi Lokal `_ref_ui/`
- **Keberadaan:** Direktori `_ref_ui/` (berisi source code utuh MQ-Studio 0.4.2) disimpan di lingkungan pengembang lokal sebagai acuan visual, struktur komponen, dan ekstraksi styling.
- **Kebijakan Git:** Folder `_ref_ui/` (~20 MB, 1.600+ file) secara sengaja dimasukkan ke dalam `.gitignore` agar:
  - Repositori GitHub tetap bersih, ramping, dan cepat saat proses `git clone` atau `git pull`.
  - Fokus repositori murni pada kode sumber aplikasi AI Requirements Studio tanpa menyertakan repositori pihak ketiga.

---

## 10. Identitas Visual, Wordmark & App Icon `specra`

Identitas merek **`specra`** dirancang dengan pendekatan *clean Silicon Valley tech standard* yang minimalis, tegas, dan berbobot sebagai platform *requirements engineering* profesional:

### 10.1. Bedah Visualisasi Wordmark `specra`
- **Tipologi & Klasifikasi Font:**
  - Kategori: Neo-Grotesk Geometris kontemporer (padanan Geist / Inter Display geometric single-story).
  - Bobot: Heavy / Bold (700–800) untuk kestabilan visual alat rekayasa perangkat lunak.
- **Anatomi & Proporsi Huruf (All-Lowercase):**
  - **`s`**: Kurva simetris, bukaan aperture sedang, dan potongan terminal horizontal 90° presisi.
  - **`p`**: Stem vertikal turun stabil ke bawah baseline dengan mangkuk (*counter*) bulat geometris sempurna.
  - **`e` & `c`**: Bentuk lingkaran terbuka (*open circular counters*) dengan horizontal crossbar pada `e` sejajar tepat dengan garis tengah.
  - **`r` & `a`**: Lengkungan arch pada `r` dipotong bersih; huruf `a` menggunakan model **single-story geometris murni** (lingkaran dengan tiang tegak lurus di kanan) selaras konsisten dengan `p`, `e`, dan `c`.
- **Implementasi Pure Vector Path:**
  - Diimplementasikan langsung menggunakan elemen vektor SVG `<path d="...">` pada [`SpecraBrand.tsx`](frontend/src/components/SpecraBrand.tsx) sehingga bebas dependensi font OS dan 100% konsisten di semua lingkungan.

### 10.2. Spesifikasi SVG App Icon (512×512 px)
- **Bingkai:** Squircle standar macOS/Windows (`rx="106"`).
- **Latar Belakang:** Deep Slate / Dark Charcoal (`#12151A` ➔ `#0F1115` ➔ `#0A0B0E`) dengan kontras rasio WCAG AAA.
- **Kedalaman Subtil:**
  - Refleksi cahaya atas (*ambient specular glow*).
  - Inner glow border 3.5px (`#FFFFFF` opacity 0.22 ➔ 0.0).
  - Monogram `s` tebal (*weight 800*, stroke 54px) dengan drop shadow lembut.
  - Precision engineering accent node dot (`#6366F1` ke `#38BDF8`).

### 10.3. Matriks Aset Multi-Platform
| Target Platform | Format File | Lokasi Aset | Rekomendasi Dimensi |
|---|---|---|---|
| **macOS App Icon** | `.icns` | `build/darwin/icons.icns` | Multi-resolusi (16–1024 px @2x) |
| **Windows Desktop** | `.ico` | `build/windows/icon.ico` | Multi-layer bitmap (16–256 px) |
| **Linux Desktop** | `.png` / `.svg` | `build/appicon.svg` | `/usr/share/icons/hicolor/512x512/apps/specra.png` |
| **Web Favicon / PWA**| `.svg` + `.png` | `frontend/public/favicon.svg` | Favicon SVG dinamis & PNG 32×32 / 192×192 px |

