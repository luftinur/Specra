# Walkthrough: Desktop Application Menu Bar, Chat-First Split View, & Resizable Panels

**Implementation Documentation: Desktop Studio UX Architecture**  
*Date: November 13, 2026*  
*Repository: `dev-agent-assistant`*  
*Branch: `main`*

---

## 1. Executive Summary & User Experience Resolution

This milestone fundamentally transforms the application layout paradigm from modal page-switching into a **Desktop Native Chat-First Split Workspace**, completely resolving prior UX friction:

1. **Interactive Chat Always Accessible (Zero Blocking)**:
   - Previously, opening any document specification (PRD, SRS, Architecture, Design System) occluded the conversation screen, preventing users from consulting or steering the AI assistant.
   - **Solution**: Introduced layout modes `split` (Side-by-Side Split View), `chat` (Chat View Only), and `doc` (Document Canvas Only). In `split` mode, multi-agent chat remains active on the left while documents can be reviewed and edited simultaneously on the right.

2. **Standard Desktop Application Menu Bar**:
   - Replaced bulky sidebar buttons with a clean native-style top menu bar (`File`, `Edit`, `View`, `Documents`, `AI Agent`, `Help`) with standard keyboard shortcuts (`Ctrl+B`, `Ctrl+J`, `Ctrl+1/2/3`, `Ctrl+N`, `Ctrl+O`).
   - Integrated quick layout mode toggles on the right side of the menu bar: `💬 Chat`, `◫ Split`, and `📄 Doc`.

3. **Streamlined Top Stepper Bar**:
   - Removed the vertical screen space previously occupied by redundant stepper tab headers (`Discovery > PRD > SRS > Architecture > Design`).
   - Retained essential contextual alerts (e.g. clarification gating banner and completion notices) neatly above the editor.

4. **Resizable Columns with Drag Splitters**:
   - Built a reusable `useResizablePanel` hook featuring safe dynamic clamping (`min`/`max`), standard `col-resize` cursors, visual feedback on hover/active, and automatic width persistence via `localStorage`.
   - Left Navigator, Center Splitter (Chat vs Document Canvas), and Right Panel (Project Co-Pilot) are all smoothly resizable.
   - Added a fullscreen invisible drag overlay (`z-[9999]`) preventing pointer drift when cursors traverse iframes or text editors during drag operations.

5. **Context-Aware Persona Auto-Switching**:
   - Selecting a specific document via the Menu Bar or Navigator automatically aligns the specialist AI persona:
     - **PRD** ➔ Automatically selects **Product Analyst**
     - **SRS** ➔ Automatically selects **System Analyst**
     - **Architecture** ➔ Automatically selects **Software Architect**
     - **Design System** ➔ Automatically selects **UI/UX Agent**

---

## 2. New Components & Architectural Details

### A. `frontend/src/hooks/useResizablePanel.ts`
Custom React hook managing independent column resizing:
- Supports persistent state in the browser (`localStorage.getItem/setItem`).
- Dynamic clamping of minimum and maximum column constraints.
- Direction parameter (`left` or `right`) to differentiate left navigation and right inspector panels.
- Returns `isDragging` flag for global drag overlay activation.

### B. `frontend/src/components/DesktopMenuBar.tsx`
Rich native desktop application menu bar:
- **File**: *New Project (Ctrl+N)*, *Open Project (Ctrl+O)*, *Open Workspace Folder*, *Export Document*, *Export All*, *Close Project*.
- **Edit**: *Undo*, *Redo*, *Copy Markdown (Ctrl+C)*, *Clear Chat History*.
- **View**: Toggle Left Sidebar (`Ctrl+B`), Toggle Co-Pilot (`Ctrl+J`), Layout Mode: Chat (`Ctrl+1`), Split (`Ctrl+2`), Document (`Ctrl+3`), Theme Switcher (Light / Dark / System).
- **Documents**: Quick navigation to PRD (20 Sec), SRS (22 Sec), Architecture (16 Sec), and Design System (16 Sec) with status badges (*Draft*, *Approved*, *Outdated*).
- **AI Agent**: Explicit persona selection, interaction mode toggle (Exploration / Execution), and Autonomous Pipeline trigger.
- **Help**: Specification guides for IEEE 830, C4 Architecture, Design Tokens, and About Studio dialog.

### C. `frontend/src/components/DocumentCanvasPane.tsx`
Modular component rendering the active document canvas:
- Canvas header featuring approval status, manual markdown editor toggle (with discard confirmation), copy full document, and export options.
- View mode switcher: *Rendered Markdown Preview* vs *Raw Markdown Source*.
- Quick layout controls in the top-right header (*Split Ratio*, *Maximize Doc*, *Close Pane*).
- Section-level regeneration for targeted edits without regenerating entire documents.

### D. `frontend/src/App.tsx`
Core layout orchestration:
- State `layoutMode` (`'chat' | 'split' | 'doc'`).
- Initialized 3 resizers: `leftPanel` (min 160px, max 420px), `centerSplit` (min 320px, max 950px), and `rightPanel` (min 240px, max 550px).
- `handleOpenDocument` switching `activeDocType`, setting `split` mode, and auto-switching `activeChatAgent`.
- Modular separation into `renderChatPane` and `renderDocumentPane`.

---

## 3. Testing & Verification Results

### A. Frontend TypeScript & Bundle Verification
```bash
npm --prefix frontend run build
```
- **Result**: 100% passed without errors (`tsc` with `strict: true` passed; Vite compiled production bundle in 2.81 seconds).

### B. Backend Go Test Suite
```bash
go test -v ./internal/...
```
- **Result**: All 13 unit & end-to-end test suites passed (`PASS`):
  - `TestEndToEndScenarios` (Scenario A-D) : PASS
  - `TestDocumentService_PRD_SRS_ApprovalGating` : PASS
  - `TestArchitectureDocumentLifecycle` : PASS
  - `TestDesignDocumentLifecycle` : PASS
  - `TestConversation_AttachmentAndZeroMockFailFast` : PASS
  - `TestAgentRegistry_PersonasAndMCP` : PASS
  - `TestTOON_EncodeAndDecode` : PASS
  - `TestWorkspaceManager` : PASS

---

## 4. Conclusion

With the **Desktop Menu Bar + Chat-First Split View + Resizable Panels** architecture:
- Users can discuss specifications in real time on the chat timeline while inspecting generated documents side-by-side.
- Columns can be resized smoothly to match individual display dimensions.
- The workflow delivers professional desktop ergonomics on par with top-tier developer tools.
