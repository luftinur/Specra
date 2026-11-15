# Implementation Plan: Sidebar Width Expansion (256px) & Typography Refinement

Widening the left sidebar (`.side3`) from **198px to 256px** (`w-[256px]`) with a spacious single-line layout, refining typography scales for balanced, elegant desktop aesthetics without crowding status badges.

---

## 1. Goal Description

1. **Prior Limitation**:
   - The left sidebar was constrained to `198px` (~15% desktop width).
   - Navigation titles (`Design System`, `SRS Document`, `Architecture`) crowded adjacent status badges (`APPROVED`, `OUTDATED`, `GATED`).
2. **Approved Solution (Option A & 256px Rail)**:
   - Expand sidebar to **`256px`** (`w-[256px]`), the modern desktop standard.
   - Retain text in a **single clean line** (`Chat Discovery`, `PRD Document`, `SRS Document`, `Architecture`, `Design System`).
   - Refine navigation typography to `12px / 12.5px font-medium` with `10px font-mono` badges for crisp readability.

---

## 2. Proposed Changes

### Styling Tokens (`frontend/src/design/tokens.css`)
#### [MODIFY] `frontend/src/design/tokens.css`
Update `.side3` width from `198px` to `256px`:
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
#### [MODIFY] `frontend/src/App.tsx`
- Update wrapper `<aside>` from `w-[198px]` to `w-[256px]`.
- Refine item typography (`text-[12px] font-medium tracking-tight`), 14px icons, and status badges `text-[10px] font-mono px-2 py-0.5`.
- Provide +58px of horizontal clearance between labels and status pills.

```tsx
{/* Left Sidebar (.side3: 256px standard desktop rail) */}
<aside className="side3 w-[256px] flex flex-col justify-between shrink-0 py-2.5 px-2.5 select-none">
  <div className="space-y-3">
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
  </div>
</aside>
```

---

## 3. Verification Plan

### Automated Tests
1. Frontend compilation:
   ```bash
   npm --prefix frontend run build
   ```
2. Go tests:
   ```bash
   go test ./internal/...
   ```

### Manual Verification
1. Inspect left sidebar: Verify expanded 256px dimensions.
2. Confirm single-line titles (`Design System`, `SRS Document`, `Architecture`) render with clean spacing before status badges.
