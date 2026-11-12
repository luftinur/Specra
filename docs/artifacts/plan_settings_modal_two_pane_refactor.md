# Implementation Plan: Settings Modal Two-Pane Master-Detail Refactor (h-640px)

Merekonstruksi Settings Modal dari layout single-pane horizontal raksasa menjadi **Two-Pane Master-Detail** berstandar aplikasi desktop native modern (`w-[940px] h-[640px]`), dilengkapi **password reveal toggle (Eye/EyeOff)**, pengelompokan **Grouped Cards**, serta audit arsitektur keamanan penyimpanan data (OS Keyring vs SQLite).

---

## 1. Goal Description & Security Architecture Analysis

### A. Analisis Keamanan Penyimpanan Kredensial & Data Lokal
Berdasarkan audit teknis terhadap basis kode:
1. **Penyimpanan Kunci API (API Key)**:
   - **TIDAK PERNAH disimpan di SQLite (`app.db`)** dan **TIDAK PERNAH disimpan di browser `localStorage`**.
   - Kunci API dikelola secara terisolasi oleh [`internal/security/keyring.go`](file:///Users/luftinurfahmi/VibeCoding/dev-agent-assistant/internal/security/keyring.go) menggunakan library native OS Keyring (`github.com/zalando/go-keyring`):
     - **Di macOS**: Menggunakan **Apple Keychain** (enkripsi hardware Enclave Apple & akun login user).
     - **Di Windows**: Menggunakan **Windows Credential Manager (WinCred)** dengan enkripsi DPAPI.
     - **Di Linux**: Menggunakan **Secret Service (GNOME Keyring / KWallet)**.
   - Sensor Log ([`internal/security/redactor.go`](file:///Users/luftinurfahmi/VibeCoding/dev-agent-assistant/internal/security/redactor.go)): Secara otomatis menyensor kunci API (pola `sk-...`, `AIzaSy...`) dari log diagnostik agar tidak bocor.
2. **Penyimpanan Dokumen & Database SQLite**:
   - Tersimpan secara lokal di folder pengguna `~/AI-Requirements-Studio/`:
     - Database: `app.db` (SQLite WAL mode, CGO-free, hanya berisi tabel project, requirements, metadata chat, dan pengaturan tema).
     - Dokumen: `projects/{id}/PRD.md`, `SRS.md`, `architecture.md`, `design.md`.
   - **Tingkat Keamanan**: Sangat aman untuk desktop application lokal (*Local-First & Zero-Cloud Leak*), tidak ada data yang dikirim ke server pihak ketiga selain prompt AI yang secara eksplisit dikirim pengguna ke provider terpilih.

---

## 2. User Review Required & Decisions Made

> [!IMPORTANT]
> **Keputusan User (Disetujui):**
> 1. **Dimensi Modal**: Menggunakan ukuran **`w-[940px] h-[640px]`** (maksimal 85vh) dengan `overflow-hidden`.
> 2. **Password Reveal Toggle**: Menambahkan icon mata (`Eye` / `EyeOff` dari Lucide) di dalam field input API Key agar pengguna dapat mengintip dan memastikan keakuratan kunci API sebelum menekan tombol simpan.
> 3. **Format Two-Pane Master-Detail**:
>    - **Left Pane (`w-60` / 240px)**: Vertical list 6 tab pengaturan dengan badge terpisah untuk count (misal: `MCP Connections`).
>    - **Right Pane (`flex-1`)**: Scroll area mandiri dengan *Grouped Cards* dan header section yang jelas.

---

## 3. Proposed Changes

### Frontend UI Component (`frontend/src/App.tsx`)

#### [MODIFY] `frontend/src/App.tsx` (Lines 195–210 & Lines 2390–3912)

1. **State Tambahan untuk Password Masking**:
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
         AI Requirements Studio Settings
       </h3>
     </div>
     <button 
       onClick={() => setShowSettingsModal(false)} 
       className="w-8 h-8 flex items-center justify-center text-muted hover:text-fg hover:bg-fill rounded-md transition-colors"
       title="Tutup (Esc)"
     >
       <X size={16} />
     </button>
   </div>
   ```

4. **Two-Pane Split Layout**:
   - **Panel Kiri (Sidebar Navigasi `w-60` / 240px)**:
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
           Studio Engine v1.2 • Local-First
         </div>
       </aside>

       {/* Panel Kanan (Scrollable Detail Sheet) */}
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
       <span>Kredensial dienkripsi di OS Keyring • Data tersimpan lokal di SQLite</span>
     </div>
     <button 
       type="button" 
       onClick={() => setShowSettingsModal(false)} 
       className="px-4 py-1.5 text-xs font-medium rounded-md bg-fill text-fg hover:bg-fill-mute transition-colors border border-border shadow-2xs"
     >
       Tutup
     </button>
   </div>
   ```

6. **Refactor Grouped Cards di Tab Diagnostics & Security**:
   - **Card 1: Health & Latency**:
     - Split header row antara judul status & tombol aksi `Jalankan Diagnostik`.
     - Key-value metric: Durasi ms, Antigravity CLI version, OpenCode CLI status, OS Keyring status, Storage status.
   - **Card 2: Secure OS Credential Store (API Key)**:
     - Input field satu baris fleksibel:
       ```tsx
       <div className="flex gap-2 items-center">
         <div className="relative flex-1">
           <input
             type={showApiKey ? 'text' : 'password'}
             value={apiKeyInput}
             onChange={(e) => setApiKeyInput(e.target.value)}
             placeholder="Simpan Google Gemini / OpenCode API Key..."
             className="w-full border border-border rounded-md pl-3 pr-10 py-2 text-xs bg-surface font-mono text-fg placeholder:text-muted outline-none focus:border-primary"
           />
           <button
             type="button"
             onClick={() => setShowApiKey(!showApiKey)}
             className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg p-1"
             title={showApiKey ? 'Sembunyikan' : 'Perlihatkan'}
           >
             {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
           </button>
         </div>
         <button
           type="submit"
           className="px-3.5 py-2 text-xs font-medium rounded-md bg-primary hover:bg-primary-hover text-white shrink-0 shadow-2xs transition-colors"
         >
           Simpan ke Keyring
         </button>
       </div>
       ```
     - Keterangan keamanan dengan icon gembok: *"Kunci API disimpan terenkripsi di OS Keyring (Apple Keychain / Windows Credential Manager). Tidak pernah disimpan di database biasa."*
   - **Card 3: Storage & Environment Info**:
     - Key-Value Data List dengan inline code blocks font-mono:
       - SQLite Database: `ModernC Pure-Go SQLite (WAL mode, CGO-free)`
       - Workspace Documents: `AI-Requirements-Studio/projects/{id}`

---

## 4. Verification Plan

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
1. Jalankan `wails3 dev` di macOS.
2. Buka Settings Modal:
   - Pastikan tinggi modal pas pada `h-[640px]`.
   - Pastikan navigasi 6 tab vertikal di kiri berpindah dengan mulus dan memiliki badge count pada MCP.
   - Di tab Diagnostics, coba ketikkan teks pada input API Key dan klik tombol icon mata untuk memverifikasi fungsi toggle *Eye/EyeOff*.
   - Pastikan footer memiliki tombol Tutup yang menutup modal dengan cepat.
