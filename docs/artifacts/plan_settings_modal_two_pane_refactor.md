# Implementation Plan: Settings Modal Two-Pane Master-Detail Refactor (h-640px)

Refactoring the Settings Modal from a large horizontal sheet into a **Two-Pane Master-Detail** layout adhering to modern desktop application standards (`w-[940px] h-[640px]`), equipped with **password visibility toggle (Eye/EyeOff)**, **Grouped Cards**, and a security architecture audit of local credential storage (OS Keyring vs SQLite).

---

## 1. Goal Description & Security Architecture Analysis

### A. Local Credential Storage Security Audit
Based on architectural audits:
1. **API Key Storage**:
   - **NEVER stored in SQLite (`app.db`)** and **NEVER stored in browser `localStorage`**.
   - Managed in isolation via [`internal/security/keyring.go`](file:///E:/dev-agent-assistant/internal/security/keyring.go) using native OS Keyrings (`github.com/zalando/go-keyring`):
     - **On macOS**: Apple Keychain (Enclave hardware encryption & user login credentials).
     - **On Windows**: Windows Credential Manager (WinCred) with DPAPI encryption.
     - **On Linux**: Secret Service (GNOME Keyring / KWallet).
   - Log Redaction: Automatically strips API keys (`sk-...`, `AIzaSy...`) from diagnostic logs via [`internal/security/redactor.go`](file:///E:/dev-agent-assistant/internal/security/redactor.go).
2. **Document & Database Storage**:
   - Stored locally under user directory `~/AI-Requirements-Studio/`:
     - Database: `app.db` (SQLite WAL mode, CGO-free, project metadata, requirements, theme settings).
     - Documents: `projects/{id}/PRD.md`, `SRS.md`, `architecture.md`, `design.md`.
   - **Security Level**: Zero-Cloud Leakage local-first desktop application; no data leaves the machine except user-directed prompts sent to selected AI providers.

---

## 2. User Review & Decisions

> [!IMPORTANT]
> **Approved Design Choices:**
> 1. **Modal Dimensions**: Standardized desktop dimensions **`w-[940px] h-[640px]`** (max 85vh) with `overflow-hidden`.
> 2. **Password Reveal Toggle**: Lucide `Eye` / `EyeOff` icons inside API Key inputs allowing verification prior to saving.
> 3. **Two-Pane Master-Detail Layout**:
>    - **Left Pane (`w-60` / 240px)**: Vertical list of 6 settings tabs with count badges (e.g. `MCP Connections`).
>    - **Right Pane (`flex-1`)**: Independent scrollable pane with Grouped Cards and clear section headings.

---

## 3. Proposed Changes

### Frontend UI Component (`frontend/src/App.tsx`)

#### [MODIFY] `frontend/src/App.tsx`

1. **State for Password Masking**:
   ```tsx
   const [showApiKey, setShowApiKey] = useState(false);
   ```

2. **Modal Outer Shell (`w-[940px] h-[640px]`)**:
   ```tsx
   {showSettingsModal && (
     <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 flex items-center justify-center p-3 md:p-4">
       <div className="bg-surface border border-border rounded-[14px] w-[940px] max-w-[95vw] h-[640px] max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
   ```

3. **Top Header Bar (`h-14` / 56px)**:
   ```tsx
   <div className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0 bg-surface">
     <div className="flex items-center gap-2.5">
       <Settings size={18} className="text-primary" />
       <h3 className="font-semibold text-base text-fg">
         Specra Settings
       </h3>
     </div>
     <button 
       onClick={() => setShowSettingsModal(false)} 
       className="w-8 h-8 flex items-center justify-center text-muted hover:text-fg hover:bg-fill rounded-md transition-colors"
       title="Close (Esc)"
     >
       <X size={16} />
     </button>
   </div>
   ```

4. **Two-Pane Split Layout**:
   - **Left Pane (Navigation Sidebar `w-60` / 240px)**:
     ```tsx
     <div className="flex-1 flex min-h-0 overflow-hidden">
       <aside className="w-60 shrink-0 bg-panel/75 border-r border-border p-3 flex flex-col justify-between overflow-y-auto">
         <nav className="space-y-1">
           {[
             { id: 'general', label: 'General & Appearance', icon: Sliders },
             { id: 'personas', label: 'Specialist Personas', icon: Sparkles },
             { id: 'mcp', label: 'MCP Connections', icon: Database, badge: mcpList.length },
             { id: 'providers', label: 'Coding Agents & LLM', icon: Bot },
             { id: 'tokens', label: 'Token Telemetry', icon: BarChart2 },
             { id: 'diagnostics', label: 'Diagnostics & Security', icon: Activity },
           ].map((tab) => {
             const Icon = tab.icon;
             const isActive = settingsTab === tab.id;
             return (
               <button
                 key={tab.id}
                 type="button"
                 onClick={() => {
                   setSettingsTab(tab.id as any);
                   if (tab.id === 'general') loadGeneralSettings();
                   if (tab.id === 'personas' || tab.id === 'mcp') loadAgentsAndMCP();
                   if (tab.id === 'tokens') loadTokenUsage();
                 }}
                 className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all w-full text-left ${
                   isActive
                     ? 'bg-surface text-primary font-semibold shadow-2xs border border-border'
                     : 'text-fg-2 hover:bg-fill hover:text-fg'
                 }`}
               >
                 <Icon size={16} className={isActive ? 'text-primary' : 'text-muted'} />
                 <span className="truncate">{tab.label}</span>
                 {tab.badge !== undefined && (
                   <span className={`ml-auto text-xs px-1.5 py-0.5 rounded font-mono ${
                     isActive ? 'bg-primary-soft text-primary font-bold' : 'bg-fill text-muted'
                   }`}>
                     {tab.badge}
                   </span>
                 )}
               </button>
             );
           })}
         </nav>
         <div className="pt-3 border-t border-border/60 text-[11px] text-muted-2 px-2">
           Specra Studio Engine • Local-First
         </div>
       </aside>

       {/* Right Pane (Scrollable Detail Sheet) */}
       <main className="flex-1 min-w-0 overflow-y-auto p-6 space-y-6 bg-surface">
         {/* Detail Tabs */}
       </main>
     </div>
     ```

5. **Bottom Footer Bar (`h-14` / 56px)**:
   ```tsx
   <div className="h-14 px-6 border-t border-border flex items-center justify-between shrink-0 bg-surface">
     <div className="flex items-center gap-1.5 text-xs text-muted">
       <Lock size={12} className="text-ok" />
       <span>Credentials encrypted in OS Keyring • Data stored locally in SQLite</span>
     </div>
     <button 
       type="button" 
       onClick={() => setShowSettingsModal(false)} 
       className="px-4 py-1.5 text-xs font-medium rounded-md bg-fill text-fg hover:bg-fill-mute transition-colors border border-border shadow-2xs"
     >
       Close
     </button>
   </div>
   ```

6. **Grouped Cards in Diagnostics & Security Tab**:
   - **Card 1: Health & Latency**: Status metrics and "Run Diagnostics" button.
   - **Card 2: Secure OS Credential Store (API Key)**:
     - Flexible input with eye icon toggle:
       ```tsx
       <div className="flex gap-2 items-center">
         <div className="relative flex-1">
           <input
             type={showApiKey ? 'text' : 'password'}
             value={apiKeyInput}
             onChange={(e) => setApiKeyInput(e.target.value)}
             placeholder="Enter API key..."
             className="w-full border border-border rounded-md pl-3 pr-10 py-2 text-xs bg-surface font-mono text-fg placeholder:text-muted outline-none focus:border-primary"
           />
           <button
             type="button"
             onClick={() => setShowApiKey(!showApiKey)}
             className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg p-1"
             title={showApiKey ? 'Hide' : 'Show'}
           >
             {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
           </button>
         </div>
         <button
           type="submit"
           className="px-3.5 py-2 text-xs font-medium rounded-md bg-primary hover:bg-primary-hover text-white shrink-0 shadow-2xs transition-colors"
         >
           Save to Keyring
         </button>
       </div>
       ```
   - **Card 3: Storage & Environment Info**:
     - Key-Value specs for SQLite WAL mode and local workspace directories.

---

## 4. Verification Plan

### Automated Tests
```bash
npm --prefix frontend run build
go test -v ./internal/...
```

### Manual Verification
1. Open Settings Modal; verify `w-[940px] h-[640px]` geometry.
2. Confirm smooth navigation between 6 left tabs.
3. Test API Key visibility toggle (`Eye`/`EyeOff`).
4. Click Close button in footer to dismiss.
