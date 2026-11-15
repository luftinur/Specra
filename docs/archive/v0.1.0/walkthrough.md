# Walkthrough: Specra Visual Identity, Interactive Mermaid Blocks, & Settings UX Refinement

## 1. Executive Summary
This walkthrough documents the successful implementation and verification of the following major milestones in **Specra (AI Requirements Studio)**:
1. **Specra Visual Identity & App Icon**: All-lowercase geometric neo-grotesk wordmark (`specra`), high-resolution SVG app icon (512x512 squircle monogram `s`), and generated multi-resolution desktop app icons (`icons.icns`, `icon.ico`).
2. **Interactive Mermaid Code Blocks & Preview Mode**: Interactive diagram renderer for PRD, SRS, Architecture, and Design documents featuring 1-click **Copy Mermaid Code**, dynamic **Preview Mode** with live SVG rendering via Mermaid 11, zoom/pan controls, error fallback, and full-screen modal expansion.
3. **Settings / Configuration Refinement & UI De-clutter**:
   - **Left Sidebar Footer**: Removed redundant AI provider status card; replaced "General & Appearance" with an ergonomic **Settings / Configuration** button with a gear icon (`Settings`) and shortcut badge `Ctrl+,`.
   - **Desktop Menu Bar**: Audited and updated `File > Settings / Configuration...` (`Ctrl+,`) with active modal trigger.
   - **Top-right Titlebar**: Removed the redundant gear button from the titlebar header, leaving a clean, high-contrast toolbar.
   - **Global Shortcut**: Bound `Ctrl+,` (and `⌘,` on macOS) to universally open the Settings modal from anywhere in the application.

---

## 2. Detailed Implementation Breakdown

### A. Specra Visual Identity & App Icon
1. **Wordmark & Typography**:
   - Implemented `specra` brand wordmark in lowercase geometric neo-grotesk with bold/heavy weight (700-800), clean aperture terminals, and high-contrast styling across the application titlebar, menu bar, and splash elements.
2. **Monogram App Icon (`build/appicon.svg`)**:
   - 512x512 squircle frame conforming to macOS and Windows dock/taskbar standards.
   - Subtle depth gradient and pure solid white glyph `#FFFFFF` on dark charcoal `#0F1115`.
3. **Desktop App Bundling**:
   - Generated native `build/icons.icns` for macOS and `build/icon.ico` for Windows.
   - Updated window title in `main.go`, `build/config.yml`, and `frontend/index.html` to `specra`.

### B. Interactive Mermaid Blocks & Preview Mode
1. **Mermaid Viewer Component (`frontend/src/components/MermaidBlock.tsx`)**:
   - Renders fenced ````mermaid`` code blocks inside Markdown with tabbed toggles: **Preview Mode** (visual diagram) and **Code Mode** (raw syntax with line numbers).
   - **1-Click Copy**: Copies Mermaid syntax directly to clipboard with visual copied indicator.
   - **Full-Screen Modal**: Expand button allows viewing intricate C4 diagrams, sequence diagrams, and statecharts in a high-resolution dialog.
   - **Theme Synchronization**: Listens to app theme (`warm-stone`, `obsidian-slate`, `system`) and dynamically re-renders SVG themes.

### C. Sidebar & Menu Settings Refinement
1. **Left Sidebar Footer Clean-up (`frontend/src/App.tsx`)**:
   - Removed the bottom AI provider status info box (`antigravity-cli`, status dot, token usage) to eliminate visual noise.
   - Replaced "General & Appearance" button with:
     ```tsx
     <button
       onClick={() => {
         setIsSettingsOpen(true);
         loadGeneralSettings();
         loadTokenUsage();
         handleDetectAgents(true);
       }}
       className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors"
     >
       <div className="flex items-center gap-2">
         <Settings size={14} className="text-fg-muted" />
         <span>Settings / Configuration</span>
       </div>
       <kbd className="px-1.5 py-0.5 text-[10px] bg-surface border border-border-subtle rounded text-fg-muted">
         Ctrl+,
       </kbd>
     </button>
     ```
2. **Top-Right Titlebar Clean-up (`frontend/src/App.tsx`)**:
   - Removed the duplicate gear icon button from the titlebar header, streamlining the titlebar to show only system status, theme switcher, and inspector toggle.
3. **Menu Bar Audit (`frontend/src/components/DesktopMenuBar.tsx`)**:
   - Updated `File > Settings / Configuration...` (`Ctrl+,`) to trigger `onOpenSettings('general')`.
   - Updated `Help` dropdown to display `specra — AI Requirements Studio • Zero-Mock`.
4. **Universal Keyboard Shortcut (`frontend/src/App.tsx`)**:
   - Added global listener in `handleGlobalZoomKeys`:
     ```tsx
     if ((e.ctrlKey || e.metaKey) && e.key === ',') {
       e.preventDefault();
       setIsSettingsOpen(true);
       loadGeneralSettings();
       loadTokenUsage();
       handleDetectAgents(true);
     }
     ```

---

## 3. Verification & Quality Assurance

1. **Backend Test Suite (Go 1.24 / macOS ARM64)**:
   ```bash
   export PATH=$PATH:/opt/homebrew/bin:~/go/bin
   go test -v ./internal/...
   ```
   **Result**: 100% PASS across all packages:
   - `ai-requirements-studio/internal`: **PASS** (End-to-End Scenarios A-D)
   - `ai-requirements-studio/internal/ai`: **PASS** (Orchestrator, TOON parser, Validation Engine)
   - `ai-requirements-studio/internal/security`: **PASS** (Data Redaction)
   - `ai-requirements-studio/internal/services`: **PASS** (RequirementService, DocumentService, AgentRegistry)
   - `ai-requirements-studio/internal/storage`: **PASS** (Workspace path traversal guard, Repositories)

2. **Frontend Strict TypeScript & Vite Production Build**:
   ```bash
   cd frontend && npm run build
   ```
   **Result**: `tsc` completed with **0 errors**, Vite compiled in 921ms without warnings.

3. **Wails 3 Native Desktop Compilation**:
   ```bash
   export PATH=$PATH:/opt/homebrew/bin:~/go/bin
   wails3 task darwin:build:native
   ```
   **Result**: Built `bin/ai-requirements-studio` executable successfully.
