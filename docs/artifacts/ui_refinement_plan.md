# UI Refinement & Polish Plan (Reference: amigoer/mq-studio)

Dokumen perencanaan perbaikan antarmuka pengguna (UI) mengadopsi standar desain modern developer desktop client berbasis Wails v3 seperti pada referensi **[amigoer/mq-studio](https://github.com/amigoer/mq-studio)**:
1. **Tipografi & Ketajaman Input Field:** Memperbaiki rendering font yang buram dengan membersihkan konflik CSS template legacy, menerapkan font stack modern (`Inter`, system-ui), menaikkan kontras teks, dan styling input ring khas modern developer studio.
2. **Sidebar Scrollbar:** Menyembunyikan native scrollbar (`.no-scrollbar`) pada sidebar daftar project agar tampilan flush, bersih, dan elegan tanpa mengorbankan fungsionalitas scroll (*mouse wheel/touch*).
3. **Inspector Header Dropdown (mq-studio style):** Mengganti deretan tab horizontal yang padat dengan tata letak studio modern: **Judul & Count Badge aktif di ujung kiri**, serta **Tombol 3-Titik (*MoreVertical*) di ujung kanan** yang membuka menu dropdown popover dengan icon indikator dan checkmark.

---

## 1. Analisis & Referensi Desain (`amigoer/mq-studio`)

Berdasarkan arsitektur dan UI pada `amigoer/mq-studio`:
- **Layout & Polishing:** Studio desktop Wails v3 mengutamakan tampilan yang bersih (*frameless-ready*), dengan batas panel yang tegas (`border-slate-200 dark:border-slate-800`), font crisp dengan kontras optimal (`text-slate-900 dark:text-slate-100`), dan zero visual scrollbar clutter.
- **Konflik Utama di Proyek Saat Ini:** 
  File `frontend/index.html` masih memuat `<link rel="stylesheet" href="/style.css" />` dari template bawaan Wails dengan aturan `#app, #root { display: contents; }` dan background gradient gelap. Hal ini merusak inheritance box-model CSS Tailwind, membuat rendering font input di WebView2 tampak tipis, translusen, dan buram.
- **Pola Header & View Switcher:** 
  Pada panel sekunder/inspector, tidak menggunakan deretan tombol tab panjang yang sesak, melainkan menampilkan judul aktif di kiri (misal: `Requirements (0)`) dan tombol tindakan / menu 3-titik di kanan untuk beralih mode.

---

## 2. Proposed Changes

### Component 1: Core HTML & Global Typography (`frontend/index.html` & `frontend/src/index.css`)
- **[MODIFY] [index.html](file:///E:/dev-agent-assistant/frontend/index.html):**
  - Hapus `<link rel="stylesheet" href="/style.css" />` dan `<div class="bg" aria-hidden="true"></div>`.
  - Pasang meta viewport bersih dan title yang rapi.
- **[MODIFY] [index.css](file:///E:/dev-agent-assistant/frontend/src/index.css):**
  - Terapkan font-family modern: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
  - Aktifkan text rendering tajam:
    ```css
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    ```
  - Tambahkan utilitas `.no-scrollbar`:
    ```css
    @layer utilities {
      .no-scrollbar::-webkit-scrollbar {
        display: none;
        width: 0 !important;
        height: 0 !important;
      }
      .no-scrollbar {
        -ms-overflow-style: none !important;
        scrollbar-width: none !important;
      }
    }
    ```
  - Pastikan seluruh input, textarea, dan select memiliki `user-select: text` dengan ketajaman penuh.

---

### Component 2: Sidebar Scrollbar Removal & Crisp Styling (`frontend/src/App.tsx`)
- **[MODIFY] [App.tsx](file:///E:/dev-agent-assistant/frontend/src/App.tsx):**
  - Pada elemen `<nav>` daftar project di sidebar:
    Terapkan kelas `space-y-1 overflow-y-auto no-scrollbar max-h-[calc(100vh-320px)]`.
  - Scrollbar Windows disembunyikan sepenuhnya dari pandangan mata; pengguna tetap dapat scroll secara mulus menggunakan mouse wheel / trackpad.
  - Pertegas warna teks daftar project dan hover states ala mq-studio.

---

### Component 3: Inspector Header Refactoring (3-Dot Dropdown) (`frontend/src/App.tsx`)
- **[MODIFY] [App.tsx](file:///E:/dev-agent-assistant/frontend/src/App.tsx):**
  - Import icon `MoreVertical`, `Check`, `ListOrdered` dari `lucide-react`.
  - Tambahkan state `showInspectorMenu` dan ref untuk mendeteksi penutupan klik luar (*click outside*).
  - Susun ulang header inspector:
    ```tsx
    {/* Inspector Header: Title on Left, 3-Dot Menu on Right */}
    <div className="h-12 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 relative bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 tracking-tight">
          {activeTabLabel}
        </span>
        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          {activeTabCount}
        </span>
      </div>

      <div className="relative">
        <button
          onClick={() => setShowInspectorMenu(!showInspectorMenu)}
          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          title="Switch Inspector View"
        >
          <MoreVertical size={15} />
        </button>

        {showInspectorMenu && (
          <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
            {inspectorTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setShowInspectorMenu(false); }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <tab.icon size={13} />
                  <span>{tab.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                    {tab.count}
                  </span>
                  {activeTab === tab.id && <Check size={12} className="text-indigo-600 dark:text-indigo-400" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
    ```

---

### Component 4: High-Contrast & Crisp Input Fields (`frontend/src/App.tsx`)
- Chat input bar:
  - Font size ditingkatkan ke `text-sm font-medium`.
  - Warna teks solid: `text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500`.
  - Container styling: border tegas dengan bayangan halus `border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500`.
- Textarea editor dokumen & modal input dipertegas kontrasnya untuk keterbacaan optimal.

---

## 3. Verification Plan

### Automated Verification
```powershell
# 1. Frontend compilation (Dev & Prod)
cd frontend; npm run build:dev; npm run build; cd ..

# 2. Go test suites
$env:PATH = "C:\Program Files\Go\bin;$env:USERPROFILE\go\bin;$env:PATH"; go test -v ./...

# 3. Wails v3 task build
$env:PATH = "C:\Program Files\Go\bin;$env:USERPROFILE\go\bin;$env:PATH"; wails3 task build
```

### Manual Verification
1. **Font Sharpening:** Buka aplikasi, periksa input text chat dan modal; pastikan teks tajam dan tidak buram/translusen.
2. **Hidden Scrollbar:** Tambah beberapa project di sidebar, scroll dengan mouse wheel; pastikan scrolling berfungsi tanpa scrollbar visual.
3. **Inspector 3-Dot Dropdown:** Periksa panel inspector kanan; judul di kiri menampilkan `Requirements (0)` (atau tab aktif), klik menu 3-titik di kanan untuk beralih view dengan mudah.
