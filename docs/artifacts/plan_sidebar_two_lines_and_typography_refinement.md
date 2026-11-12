# Implementation Plan: Sidebar Width Expansion (256px) & Typography Refinement

Memperlebar sidebar kiri (`.side3`) dari **198px menjadi 256px** (`w-[256px]`) dengan tata letak 1 baris lega (*Pilihan A*), serta sedikit mengecilkan dan memperhalus ukuran font agar tampil proporsional, elegan, dan terhindar dari desakan badge status.

---

## 1. Goal Description

1. **Permasalahan Sebelumnya**:
   - Sidebar kiri sebelumnya memiliki lebar sempit `198px` (~15% lebar layar desktop).
   - Di lebar tersebut, item navigasi Workspace (`Design System`, `SRS Document`, `Architecture`) berhimpitan dengan status badge di sebelah kanan (`APPROVED`, `OUTDATED`, `GATED`).
2. **Solusi yang Dipilih Pengguna (Pilihan A & 256px)**:
   - Sidebar diperlebar menjadi **`256px`** (`w-[256px]`), standar emas aplikasi desktop modern.
   - Teks tetap dipertahankan dalam **1 baris lega** (`Chat Discovery`, `PRD Document`, `SRS Document`, `Architecture`, `Design System`).
   - Ukuran font navigasi sedikit dikecilkan ke `12px / 12.5px font-medium` dengan badge status `10px font-mono` untuk estetika visual yang lebih tajam dan bersih.

---

## 2. Proposed Changes

### Styling Tokens (`frontend/src/design/tokens.css`)
#### [MODIFY] `frontend/src/design/tokens.css`
- Mengubah properti `.side3` `width: 198px;` menjadi `width: 256px;`.

```css
/* sidebar */
.side3 {
  width: 256px;
  flex: none;
  display: flex;
  flex-direction: column;
  padding: 2px 10px 10px;
}
```

---

### Frontend Main App (`frontend/src/App.tsx`)
#### [MODIFY] `frontend/src/App.tsx` (Lines 1295–1405)
- Mengubah kelas pembungkus `<aside>` dari `w-[198px]` menjadi `w-[256px]`.
- Menyempurnakan typography teks tombol navigasi (`text-[12px] font-medium tracking-tight`), icon 14px, dan status badge `text-[10px] font-mono px-2 py-0.5`.
- Memberikan ruang horizontal lega (+58px) sehingga judul dan status badge memiliki jarak pemisah yang bersih.

```tsx
{/* Left Sidebar (.side3: 256px standard desktop rail) */}
<aside className="side3 w-[256px] flex flex-col justify-between shrink-0 py-2.5 px-2.5 select-none">
  <div className="space-y-3">
    {/* Group: Workspace Mode */}
    <div>
      <div className="gl text-[10.5px] font-semibold uppercase tracking-wider text-muted-2 px-2 py-1">
        Workspace
      </div>
      <div className="space-y-0.5">
        {/* Chat Discovery */}
        <button
          onClick={() => { setCurrentView('chat'); setIsEditingDoc(false); }}
          className={`ni w-full text-left px-2.5 py-1.5 rounded-[7px] flex items-center gap-2 text-[12px] font-medium transition-colors ${
            currentView === 'chat'
              ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
              : 'text-fg-2 hover:bg-fill-mute hover:text-fg'
          }`}
        >
          <MessageSquare size={14} className={currentView === 'chat' ? 'text-primary' : 'text-muted'} />
          <span>Chat Discovery</span>
        </button>

        {/* PRD Document */}
        <button
          onClick={() => { setCurrentView('prd'); setIsEditingDoc(false); }}
          className={`ni w-full text-left px-2.5 py-1.5 rounded-[7px] flex items-center justify-between text-[12px] font-medium transition-colors ${
            currentView === 'prd'
              ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
              : 'text-fg-2 hover:bg-fill-mute hover:text-fg'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={14} className={currentView === 'prd' ? 'text-primary shrink-0' : 'text-muted shrink-0'} />
            <span className="truncate">PRD Document</span>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold shrink-0 ${
            isPRDApproved ? 'bg-ok-tint text-ok' : 'bg-fill text-muted font-medium'
          }`}>
            {prdDetails.document?.status || 'none'}
          </span>
        </button>

        {/* SRS Document */}
        <button
          onClick={() => { setCurrentView('srs'); setIsEditingDoc(false); }}
          className={`ni w-full text-left px-2.5 py-1.5 rounded-[7px] flex items-center justify-between text-[12px] font-medium transition-colors ${
            currentView === 'srs'
              ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
              : 'text-fg-2 hover:bg-fill-mute hover:text-fg'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <FileCode2 size={14} className={currentView === 'srs' ? 'text-primary shrink-0' : 'text-muted shrink-0'} />
            <span className="truncate">SRS Document</span>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold shrink-0 ${
            isSRSOutdated
              ? 'bg-err-bg text-err'
              : srsDetails.document?.status === 'approved' 
              ? 'bg-ok-tint text-ok' 
              : !isPRDApproved 
              ? 'bg-warn-bg text-warn' 
              : 'bg-fill text-muted font-medium'
          }`}>
            {isSRSOutdated ? 'Outdated' : !isPRDApproved ? 'Gated' : srsDetails.document?.status || 'draft'}
          </span>
        </button>

        {/* Architecture */}
        <button
          onClick={() => { setCurrentView('architecture'); setIsEditingDoc(false); }}
          className={`ni w-full text-left px-2.5 py-1.5 rounded-[7px] flex items-center justify-between text-[12px] font-medium transition-colors ${
            currentView === 'architecture'
              ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
              : 'text-fg-2 hover:bg-fill-mute hover:text-fg'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Cpu size={14} className={currentView === 'architecture' ? 'text-primary shrink-0' : 'text-muted shrink-0'} />
            <span className="truncate">Architecture</span>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold shrink-0 ${
            isArchitectureApproved 
              ? 'bg-ok-tint text-ok' 
              : !isPRDApproved 
              ? 'bg-warn-bg text-warn' 
              : 'bg-fill text-muted font-medium'
          }`}>
            {isArchitectureApproved ? 'approved' : !isPRDApproved ? 'Gated' : architectureDetails.document?.status || 'draft'}
          </span>
        </button>

        {/* Design System */}
        <button
          onClick={() => { setCurrentView('design'); setIsEditingDoc(false); }}
          className={`ni w-full text-left px-2.5 py-1.5 rounded-[7px] flex items-center justify-between text-[12px] font-medium transition-colors ${
            currentView === 'design'
              ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
              : 'text-fg-2 hover:bg-fill-mute hover:text-fg'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={14} className={currentView === 'design' ? 'text-primary shrink-0' : 'text-muted shrink-0'} />
            <span className="truncate">Design System</span>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold shrink-0 ${
            isDesignApproved 
              ? 'bg-ok-tint text-ok' 
              : !isPRDApproved 
              ? 'bg-warn-bg text-warn' 
              : 'bg-fill text-muted font-medium'
          }`}>
            {isDesignApproved ? 'approved' : !isPRDApproved ? 'Gated' : designDetails.document?.status || 'draft'}
          </span>
        </button>
      </div>
    </div>
```

---

## 3. Verification Plan

### Automated Tests
1. Verifikasi kompilasi frontend:
   ```bash
   cd frontend && npm run build
   ```
2. Verifikasi unit tests backend Go:
   ```bash
   go test ./internal/...
   ```

### Manual Verification
1. Jalankan `wails3 dev` atau buka aplikasi desktop.
2. Periksa tampilan sidebar kiri:
   - Lebar sidebar bertambah menjadi 256px dengan proporsi yang proporsional.
   - Teks `Design System`, `SRS Document`, `PRD Document`, `Architecture` tampil rapi dalam 1 baris tanpa terpotong atau berhimpitan dengan badge status.
   - Badge status di sebelah kanan memiliki spasi lega dan terbaca jelas.
