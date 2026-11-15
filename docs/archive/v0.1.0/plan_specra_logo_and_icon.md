# Implementation Plan: Visual Identity, SVG App Icon & Wordmark for "specra"

## 1. Goal Description
Transforming the visual identity of the application from a placeholder name (*AI Requirements Studio*) into **`specra`**, adhering to modern Silicon Valley engineering standards (e.g. Vercel, Linear, Supabase, Raycast):
- **Wordmark `specra`**: Contemporary geometric Neo-Grotesk typography (all-lowercase, bold/heavy 700-800, circular counters on `p`, `e`, `c`, single-story `a`, and 90° horizontal terminal shears on `s` and `r`).
- **SVG App Icon (512×512 px)**: Precision `s` monogram within a macOS/Windows standard squircle frame with subtle depth (dark charcoal gradient `#161920` to `#0B0D11`, inner stroke highlight, and soft drop shadow).
- **Comprehensive Integration**:
  - Modular React components (`<SpecraIcon />`, `<SpecraWordmark />`, `<SpecraLogo />`).
  - Titlebar header updates, Welcome canvas screen, Settings modal, `index.html` (favicon & title), and desktop window title in `main.go`.
  - Native asset regeneration: macOS (`icons.icns`), Windows (`icon.ico`), and master image (`appicon.png`).

---

## 2. Visual Specification & Design Architecture

### A. Wordmark Anatomy `specra` (All-Lowercase)
```text
  s      p      e      c      r      a
[───]  [───]  [───]  [───]  [───]  [───]
  │      │      │      │      │      └── Geometric single-story (circle + right vertical stem)
  │      │      │      │      └──────── Arch curve terminal sheared clean at 90°
  │      │      │      └─────────────── Open circular counter matching p & e
  │      │      └────────────────────── Horizontal crossbar aligned with center-line
  │      └───────────────────────────── Stable vertical stem below baseline + round bowl
  └──────────────────────────────────── Symmetrical curves, medium aperture, 90° terminals
```

### B. SVG App Icon Specification (512×512 px)
1. **Dimensions**: `viewBox="0 0 512 512"`
2. **Background Squircle**:
   - Apple/macOS squircle geometry `(corner radius ~115px)`.
   - Linear Gradient: `#171922` (top) to `#0A0C10` (bottom).
   - Inner Border: `1.5px stroke` with transparent white gradient `#FFFFFF` (opacity 0.16 top to 0.03 bottom) for rim lighting.
3. **Monogram `s`**:
   - Heavy stroke geometry (~56px).
   - Clean 90° horizontal terminal cuts on both ends.
   - Color: Pure Solid White (`#FFFFFF`) with subtle depth shading to `#E2E8F0`.
4. **Subtle Engineering Accent**:
   - Precision anchor point accent affirming technical studio positioning.

---

## 3. Proposed Changes

### Component 1: Frontend Brand Assets

#### [NEW] `frontend/src/components/SpecraBrand.tsx`
Reusable SVG React components:
- `<SpecraIcon size={number} className={string} />`: Renders 512x512 squircle `s` monogram with proportional scaling.
- `<SpecraWordmark height={number} className={string} />`: Renders pure vector path `specra` wordmark.
- `<SpecraLogo size={number} showWordmark={boolean} />`: Combination icon + wordmark for titlebars and navbars.

#### [NEW] `frontend/public/favicon.svg` & `frontend/src/assets/specra-icon.svg`
Standalone SVG assets for browser favicons and desktop window icons.

---

### Component 2: UI Integration in `frontend/src/App.tsx`

#### [MODIFY] `frontend/src/App.tsx`
1. **Titlebar Header**:
   - Replace placeholder boxes with:
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
2. **Empty State Canvas Welcome Screen**:
   - Replace generic folder icon with `<SpecraIcon size={56} />`.
   - Title: `Welcome to Specra`.
   - Subtitle: `Personal requirements engineering workspace transforming ideas and briefs into structured system specifications.`
3. **Settings Modal Header**:
   - Update modal title to `Specra Settings`.

#### [MODIFY] `frontend/index.html`
- Update `<title>specra</title>`.
- Update `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`.

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

#### [GENERATE] Desktop Icon Binaries
1. Generate `build/appicon.png` (1024×1024 high-res master icon).
2. Generate `build/appicon.icon/Assets/wails_icon_vector.svg`.
3. Generate native binaries via `wails3 generate icons`:
   - `build/darwin/icons.icns`
   - `build/windows/icon.ico`

---

## 4. Verification Plan

### Automated Tests
```bash
npm --prefix frontend run build
go test -v ./internal/...
wails3 task build
```

### Manual Verification
1. **Titlebar Header**: Verify `specra` logo renders sharply in the top-left corner.
2. **Empty State Canvas**: Verify 56px `specra` monogram and welcome copy.
3. **Favicon & Window Title**: Window chrome displays `specra` title and icon.
4. **Desktop Dock / Taskbar Icon**: Application icon renders squircle monogram.
