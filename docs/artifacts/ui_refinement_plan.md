# UI Refinement & Polish Plan (Reference: amigoer/mq-studio)

Technical planning document for adopting desktop UI standards for Wails v3 developer clients, inspired by **[amigoer/mq-studio](https://github.com/amigoer/mq-studio)**:
1. **Typography & Input Field Clarity:** Eliminate legacy template CSS conflicts, apply a modern font stack (`Inter`, system-ui), elevate text contrast, and style sharp focus rings suited for developer tools.
2. **Sidebar Scrollbar:** Hide native scrollbars (`.no-scrollbar`) in the project list navigation to maintain a clean aesthetic without compromising mouse wheel or trackpad scrolling.
3. **Inspector Header Dropdown:** Replace crowded horizontal tabs with a modern layout: **Active Title & Count Badge on the left**, and a **3-Dot Action Menu (*MoreVertical*) on the right** opening a popover with icons and active checkmarks.

---

## 1. Analysis & Design Reference (`amigoer/mq-studio`)

Based on the architecture and UI patterns of `amigoer/mq-studio`:
- **Layout & Polishing:** Wails v3 desktop clients favor frameless-ready designs with crisp borders (`border-slate-200 dark:border-slate-800`), high-contrast typography (`text-slate-900 dark:text-slate-100`), and zero scrollbar clutter.
- **Root Conflict in Baseline Setup:** 
  The file `frontend/index.html` still imported legacy template styles `<link rel="stylesheet" href="/style.css" />` with rules `#app, #root { display: contents; }` and dark background gradients, breaking Tailwind box models and causing blurry, translucent inputs in WebView2.
- **Header & View Switcher Patterns:** 
  In secondary and inspector panels, avoid dense button clusters in favor of clean title badges on the left (e.g. `Requirements (0)`) and a 3-dot dropdown menu on the right.

---

## 2. Proposed Changes

### Component 1: Core HTML & Global Typography (`frontend/index.html` & `frontend/src/index.css`)
- **[MODIFY] [index.html](file:///E:/dev-agent-assistant/frontend/index.html):**
  - Remove `<link rel="stylesheet" href="/style.css" />` and `<div class="bg" aria-hidden="true"></div>`.
  - Maintain clean viewport meta tags and desktop titles.
- **[MODIFY] [index.css](file:///E:/dev-agent-assistant/frontend/src/index.css):**
  - Apply modern font family: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
  - Enable crisp text rendering:
    ```css
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    ```
  - Add utility `.no-scrollbar`:
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
  - Ensure all input, textarea, and select controls have `user-select: text` with maximum legibility.

---

### Component 2: Sidebar Scrollbar Removal & Crisp Styling (`frontend/src/App.tsx`)
- **[MODIFY] [App.tsx](file:///E:/dev-agent-assistant/frontend/src/App.tsx):**
  - On the `<nav>` project list container:
    Apply classes `space-y-1 overflow-y-auto no-scrollbar max-h-[calc(100vh-320px)]`.
  - Hide Windows scrollbars while preserving mouse wheel and trackpad scroll responsiveness.
  - Enhance active state and hover contrast for project navigation items.

---

### Component 3: Inspector Header Refactoring (3-Dot Dropdown) (`frontend/src/App.tsx`)
- **[MODIFY] [App.tsx](file:///E:/dev-agent-assistant/frontend/src/App.tsx):**
  - Import icons `MoreVertical`, `Check`, `ListOrdered` from `lucide-react`.
  - Add `showInspectorMenu` state and click-outside handler.
  - Restructure inspector header layout:
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
  - Base typography elevated to `text-sm font-medium`.
  - Solid contrast styling: `text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500`.
  - Container styling: crisp borders and subtle shadows `border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500`.
- Document markdown editor and modal input contrast enhanced for optimal readability.

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
1. **Font Sharpening:** Launch app, inspect chat input and modal text; confirm crisp, solid rendering without blurriness.
2. **Hidden Scrollbar:** Create multiple projects, scroll using mouse wheel; verify smooth scrolling with zero visual scrollbar clutter.
3. **Inspector 3-Dot Dropdown:** Check right inspector panel; title displays on left with count badge, clicking 3-dot menu opens smooth view switcher.
