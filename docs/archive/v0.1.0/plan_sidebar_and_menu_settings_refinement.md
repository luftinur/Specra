# Implementation Plan: Sidebar Footer Refinement, Titlebar Clean-up & File > Settings Menu Audit

## 1. Goal Description
Permintaan pengguna berfokus pada penyederhanaan antarmuka (*clean & uncluttered UX*):
1. **Sidebar Kiri (Left Sidebar Footer)**:
   - Menghapus kotak info AI (*Antigravity CLI / OpenCode, status dot, +FB, dan token summary*) di bagian bawah sidebar kiri agar sidebar lebih bersih dan fokus pada navigasi dokumen & spesifikasi proyek.
   - Mengganti tombol `General & Appearance` (icon slider) menjadi tombol **`Settings / Configuration`** dengan ikon roda gigi (**`Settings`**) dan shortcut badge `Ctrl+,` / `⌘,`.
2. **Pojok Kanan Atas (Top-Right Titlebar)**:
   - Menghapus tombol ikon gear (*Settings Studio*) di pojok kanan atas titlebar karena pengaturan kini telah terpusat secara konsisten dan mudah diakses di footer sidebar kiri serta menu aplikasi.
3. **Menu Bar Audit (`File > Settings`)**:
   - Memeriksa ketersediaan opsi Settings di menu bar (`DesktopMenuBar.tsx`):
     - Menu `File` sudah memiliki item pengaturan namun sebelumnya berlabel `Studio Settings...`. Kita perbarui menjadi **`Settings / Configuration...`** (atau `Settings...`) dengan shortcut `Ctrl+,` / `⌘,`.
     - Memeriksa menu lain: Menu `Help` memiliki akses langsung ke `Token Usage Logs` (tab token pada settings). Menu `Edit`, `View`, `Documents`, dan `Agents` bersih dari duplikasi.
4. **Global Shortcut (`Ctrl+,` / `⌘,`)**:
   - Menambahkan event listener keyboard global agar kombinasi `Ctrl+,` (Windows/Linux) atau `⌘,` (macOS) dapat membuka modal pengaturan secara langsung dari mana saja.

---

## 2. User Review Required
> [!NOTE]
> - Info provider AI dan penggunaan token tidak hilang secara permanen; seluruh detail status AI, biner coding agent, API key, dan token usage tetap lengkap di dalam modal **Settings / Configuration** (tab `AI Providers / Models` dan `Token Usage`).
> - Tombol cepat tema (*Sun / Moon*) di pojok kanan atas tetap dipertahankan untuk kemudahan beralih *Dark/Light mode* dalam 1 klik.

---

## 3. Audit Menu Bar Saat Ini (`DesktopMenuBar.tsx`)
Berdasarkan hasil audit kode di [`DesktopMenuBar.tsx`](file:///Users/luftinurfahmi/VibeCoding/dev-agent-assistant/frontend/src/components/DesktopMenuBar.tsx):
- **Menu `File`**: Sudah terdapat tombol di baris ke-236 yang memanggil `onOpenSettings('general')`, sebelumnya berlabel `Studio Settings...` dengan shortcut `Ctrl+,`.
- **Menu `Help`**: Memiliki shortcut langsung ke `Token Usage Logs` (`onOpenSettings('tokens')`).
- **Menu lainnya (`Edit`, `View`, `Documents`, `Agents`)**: Tidak memiliki menu Settings (sudah terisolasi dengan rapi sesuai fungsinya).

---

## 4. Proposed Changes

### Component 1: Left Sidebar Refinement (`frontend/src/App.tsx`)

#### [MODIFY] `frontend/src/App.tsx` (Lines ~2868–2906)
- **Hapus**: Kotak info AI provider (`primaryProvider`, status dot, token count) dari footer sidebar kiri.
- **Perbarui Tombol**: Ubah tombol `General & Appearance` menjadi:
```tsx
{/* Sidebar Footer: Settings / Configuration */}
<div className="pt-2 border-t border-border/60">
  <button
    type="button"
    onClick={() => {
      setSettingsTab('general');
      setShowSettingsModal(true);
      loadGeneralSettings();
      loadTokenUsage();
      handleDetectAgents(true);
    }}
    className="w-full flex items-center justify-between text-xs px-2.5 py-2 rounded-[7px] hover:bg-fill-mute text-fg-2 hover:text-fg transition-colors border border-border/60 bg-surface shadow-2xs cursor-pointer group"
    title="Settings / Configuration (Ctrl+,)"
  >
    <div className="flex items-center gap-2">
      <Settings size={14} className="text-primary group-hover:rotate-45 transition-transform" />
      <span className="font-semibold text-xs text-fg">Settings / Configuration</span>
    </div>
    <span className="text-[10px] font-mono text-muted bg-fill px-1.5 py-0.5 rounded border border-border/60">
      Ctrl+,
    </span>
  </button>
</div>
```

---

### Component 2: Top-Right Titlebar Clean-up (`frontend/src/App.tsx`)

#### [MODIFY] `frontend/src/App.tsx` (Lines ~2548–2556)
- Hapus tombol icon gear di header titlebar kanan:
```tsx
// SEBELUM:
{/* Settings Studio */}
<button
  type="button"
  onClick={() => { setShowSettingsModal(true); loadGeneralSettings(); loadTokenUsage(); handleDetectAgents(true); }}
  className="p-1.5 rounded-[6px] text-muted hover:text-fg hover:bg-fill-mute transition-colors cursor-pointer"
  title="Studio Settings (Ctrl+,)"
>
  <Settings size={14} />
</button>

// SESUDAH:
// Dihapus sepenuhnya. Area titlebar kanan kini hanya memuat status pill, theme toggle (Sun/Moon), dan inspector toggle.
```

---

### Component 3: Global Shortcut Support (`frontend/src/App.tsx`)

#### [MODIFY] `frontend/src/App.tsx` (Lines ~460–468)
- Tambahkan pendeteksi shortcut `Ctrl+,` / `Cmd+,` di `useEffect` global:
```tsx
} else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
  e.preventDefault();
  setShowSettingsModal(true);
  loadGeneralSettings();
  loadTokenUsage();
  handleDetectAgents(true);
}
```

---

### Component 4: Menu Bar Polish (`frontend/src/components/DesktopMenuBar.tsx`)

#### [MODIFY] `frontend/src/components/DesktopMenuBar.tsx` (Lines ~236–246)
- Sesuaikan label di dalam dropdown `File` menu:
```tsx
<button
  type="button"
  onClick={() => { closeMenu(); onOpenSettings('general'); }}
  className="w-full text-left px-3 py-1.5 hover:bg-primary-soft hover:text-primary flex items-center justify-between transition-colors"
>
  <div className="flex items-center gap-2">
    <Settings size={13} />
    <span>Settings / Configuration...</span>
  </div>
  <span className="text-[10px] text-muted font-mono">Ctrl+,</span>
</button>
```

---

## 5. Verification Plan

### Automated Tests
1. **Frontend Compilation Check**:
   ```bash
   cd frontend && npm run build
   ```
   *Ekspektasi*: 0 TypeScript errors, Vite bundle berhasil dikompilasi.
2. **Backend Test Suite**:
   ```bash
   export PATH=$PATH:/opt/homebrew/bin:~/go/bin; go test -v ./internal/...
   ```
   *Ekspektasi*: 13 test suites PASS 100%.

### Manual Verification
1. **Sidebar Kiri**:
   - Pastikan footer sidebar kini hanya menampilkan tombol `Settings / Configuration` berikon gear.
   - Pastikan kotak info AI (*Antigravity CLI / token count*) sudah tidak muncul.
   - Klik tombol `Settings / Configuration` ➔ modal pengaturan terbuka dengan lancar.
2. **Pojok Kanan Atas Titlebar**:
   - Pastikan tombol icon gear di sebelah tombol Sun/Moon sudah hilang dan layout tetap rapi.
3. **Menu File**:
   - Klik menu `File` ➔ periksa item `Settings / Configuration...`.
   - Klik item tersebut ➔ modal pengaturan terbuka.
4. **Keyboard Shortcut**:
   - Tekan `Ctrl+,` (atau `Cmd+,` pada Mac) ➔ modal pengaturan langsung terbuka.
