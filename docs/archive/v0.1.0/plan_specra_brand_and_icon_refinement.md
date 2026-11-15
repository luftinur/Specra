# Implementation Plan: Wordmark & App Icon Refinement for `specra`

Technical planning document refining the **Wordmark** and **SVG App Icon** for `specra` following geometric Silicon Valley design standards (contemporary Neo-Grotesk, single-story `a`, circular counters, 90° terminal shears, and a squircle frame rendered in Deep Slate/Dark Charcoal).

---

## 1. Goal Description

Align visual branding assets across the Wails v3 desktop environment and React frontend:
1. **Wordmark Refinement `specra` (All-Lowercase):**
   - Transition from font-dependent `<text>` tags to **Pure Geometric Vector Paths (`<path d="...">`)**.
   - Guarantee typographic consistency across all operating systems:
     - `s`: Symmetrical, moderate aperture, horizontal 90° terminal shears.
     - `p`: Vertical stem descending below baseline with pure circular counter.
     - `e` & `c`: Open circular counters, horizontal crossbars aligned with center-line.
     - `r` & `a`: Cleanly sheared arch on `r`, **pure geometric single-story `a`** (circle with vertical right stem) matching `p`, `e`, and `c`.
     - Contrast: Pure Solid White (`#FFFFFF`) in dark mode / slate-900 in light mode (WCAG AAA).
2. **SVG App Icon Refinement (512x512 px Squircle):**
   - Squircle frame `rx="106"` with Deep Slate/Dark Charcoal gradient (`#12151A` to `#0F1115`).
   - Monogram `s` glyph with bold stroke curves (*Heavy 800*), subtle depth, specular top glow, and an engineering accent node.
3. **Multi-Platform Asset Alignment:**
   - Synchronize `build/appicon.svg`, `build/appicon.icon/Assets/wails_icon_vector.svg`, `frontend/public/favicon.svg`, and React component [`SpecraBrand.tsx`](file:///E:/dev-agent-assistant/frontend/src/components/SpecraBrand.tsx).
   - Clean up unused `SpecraWordmark` imports in `App.tsx` ensuring 100% clean TypeScript builds.

---

## 2. Visual Specifications

> [!NOTE]
> **Why Pure Vector Paths for the Wordmark?**
> Relying on `<text fontFamily="Geist, 'Inter Display', ...">` can fall back to Segoe UI or Arial on host machines lacking those fonts, rendering double-story `a` glyphs.
> Converting to **pure vector paths** guarantees 100% identical rendering across macOS, Windows, Linux, and Web without font-loading delays.

### Palette & Contrast Specs:
| Element | Hex Value | Role |
|---|---|---|
| **Background Dark Slate** | `#12151A` ➔ `#0F1115` ➔ `#0A0B0E` | High-contrast squircle icon surface |
| **Specular Glow** | `#FFFFFF` (opacity 0.22 ➔ 0.0) | Top squircle rim light reflection |
| **Monogram 's' Foreground** | `#FFFFFF` ➔ `#E2E8F0` | Monogram glyph with soft drop shadow |
| **Engineering Accent Node** | `#6366F1` ➔ `#38BDF8` | Precision terminal anchor point |
| **Wordmark Glyph** | `#FFFFFF` (Dark) / `#0F172A` (Light) | Solid white / deep slate, 15:1+ contrast ratio |

---

## 3. Proposed Changes

### Component 1: Frontend Branding Component
#### [MODIFY] [`frontend/src/components/SpecraBrand.tsx`](file:///E:/dev-agent-assistant/frontend/src/components/SpecraBrand.tsx)
- Refine `SpecraIcon` coordinates, 90° terminal shears, and deep slate gradient `#12151A` to `#0F1115`.
- Reconstruct `SpecraWordmark` using **Pure SVG Vector Paths**:
  - Each letter (`s`, `p`, `e`, `c`, `r`, `a`) rendered using precision geometric vector coordinates with single-story `a` and circular counters.
- Update `SpecraLogo` combining squircle icon + vector wordmark proportionally.

---

### Component 2: Application Vector Icons & Favicon
#### [MODIFY] [`build/appicon.svg`](file:///E:/dev-agent-assistant/build/appicon.svg)
- Update 512x512 master SVG with deep slate squircle, specular rim glow, and geometric `s` monogram.

#### [MODIFY] [`build/appicon.icon/Assets/wails_icon_vector.svg`](file:///E:/dev-agent-assistant/build/appicon.icon/Assets/wails_icon_vector.svg)
- Update vector asset for Wails desktop packaging.

#### [MODIFY] [`frontend/public/favicon.svg`](file:///E:/dev-agent-assistant/frontend/public/favicon.svg)
- Update web favicon with sharp squircle asset.

---

### Component 3: Integration & TypeScript Fix
#### [MODIFY] [`frontend/src/App.tsx`](file:///E:/dev-agent-assistant/frontend/src/App.tsx)
- Align brand imports cleanly, resolving `TS6133`.
- Ensure brand presentation in Titlebar, Welcome Canvas, and Settings Modal remains consistent.

---

## 4. Verification Plan

### Automated Tests
```powershell
cd frontend; npm run build
go test -v ./internal/...
wails3 task build
```

### Manual Verification
- Inspect brand rendering across Titlebar, Canvas, and Settings dialogs.
- Confirm geometric single-story `a` and circular counters render consistently on all displays.
