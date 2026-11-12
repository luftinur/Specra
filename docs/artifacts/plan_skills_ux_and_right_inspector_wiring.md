# Implementation Plan: Skills UX Refinement & Right Inspector Interactive Wiring

Dokumen rencana teknis ini menjawab evaluasi arsitektur dari pengguna:
1. **Asal-usul Skills & Mekanisme Injeksi Prompt AI**
2. **Refactor UX Personas & Skills di Settings Modal** (Hanya tampilkan skill aktif, tambahkan Dropdown "+ Add Skill to Persona", dan tombol detach)
3. **Audit & Penyambungan Interaktif Right Inspector** (Requirements actions, Validation, Traceability, Assumptions, Clarifications, serta Auto/Manual Extraction)

---

## 1. Jawaban & Analisis Arsitektur: Dari Mana Asal Skills?

### A. Asal-Usul Skills dalam Sistem
Skills dalam **AI Requirements Studio** berasal dari dua sumber:
1. **Built-in Skills Catalog (16 Skills Bawaan)**:
   - Didefinisikan secara statis di Go backend: [`internal/ai/agent_registry.go`](file:///Users/luftinurfahmi/VibeCoding/dev-agent-assistant/internal/ai/agent_registry.go#L33-L58).
   - Dikelompokkan ke dalam 4 kategori domain:
     - **Product Analyst (4 skills)**: `product-discovery`, `user-story-mapping`, `moscow-prioritization`, `business-kpi-definition`.
     - **System Analyst (4 skills)**: `ieee-830-specification`, `functional-flow-modeling`, `traceability-verification`, `non-functional-sla-definition`.
     - **Software Architect (4 skills)**: `c4-architecture-modeling`, `api-contract-engineering`, `security-threat-modeling`, `scalability-fault-tolerance`.
     - **UI/UX Agent (4 skills)**: `semantic-design-tokens`, `atomic-component-hierarchy`, `mermaid-screen-flows`, `wcag-accessibility-audit`.
2. **Custom Skills (Skill Kustom Tambahan Pengguna)**:
   - Dibuat oleh pengguna melalui dialog *"Create New Custom Skill"*.
   - Disimpan secara persisten di database SQLite tabel `app_settings` dengan key `"custom_skills"`.
   - Dapat memiliki nama bebas, kategori, deskripsi, dan prompt directive khusus (misalnya *"Fintech OJK Compliance"*, *"HIPAA Medical Privacy"*, *"ISO 27001 Security"*).

### B. Bagaimana Skills Diterapkan ke AI?
- Setiap agen persona (`domain.AgentConfig`) memiliki daftar array `Skills []string` yang menyimpan ID skill yang aktif padanya.
- Saat pengguna mengirim prompt di chat ([`ConversationService.SendMessageWithAgent`](file:///Users/luftinurfahmi/VibeCoding/dev-agent-assistant/internal/services/conversation_service.go#L89-L101)):
  ```go
  skills := s.agentRegistry.GetSkillsForAgent(agentID)
  if len(skills) > 0 {
      var skillDirectives []string
      for _, sk := range skills {
          if sk.Prompt != "" {
              skillDirectives = append(skillDirectives, fmt.Sprintf("- [%s]: %s", sk.Name, sk.Prompt))
          }
      }
      systemDirective += "\n\nACTIVE SPECIALIZED SKILLS & FRAMEWORKS:\n" + strings.Join(skillDirectives, "\n")
  }
  ```
- Directive ini disuntikkan langsung ke LLM system instructions, memerintahkan AI menerapkan metodologi tersebut dalam merespons brief pengguna.

---

## 2. Masalah UX Saat Ini & Solusi Refactor

### A. Masalah di Settings Modal (Tab Specialist Personas)
*   **Visual Clutter (Kelebihan Kartu)**: Saat pengguna memilih persona (misal *Product Analyst*), UI merender **seluruh 16+ skill di katalog** dalam grid besar. Akibatnya, ada 12 kartu skill berlabel *"Disabled"* yang memenuhi layar dan membuat pusing pengguna.
*   **Rekomendasi Refactor**:
    1. **Active Skills Only**: Pada panel persona yang dipilih, hanya tampilkan kartu skill yang **sedang aktif** untuk persona tersebut (biasanya 2-5 skill).
    2. **Dropdown "+ Add Skill to Persona"**:
       - Berisi daftar skill yang **belum terpasang** pada persona tersebut.
       - Dikelompokkan per kategori (*Product*, *System*, *Architecture*, *UI/UX*, *Custom*).
       - Memilih salah satu opsi langsung meng-attach skill ke persona aktif.
       - Menyertakan opsi pintas: `+ Create Custom Skill...` untuk membuat skill baru.
    3. **Detach Button (`X`)**: Setiap kartu skill aktif memiliki tombol lepas/detach cepat tanpa merusak katalog utama.
    4. **Custom Skills Library Section**: Bagian tersendiri di bawah untuk melihat dan menghapus custom skill yang dibuat pengguna.

---

## 3. Audit Right Inspector: Apakah Sudah Nyambung dengan Project Context?

### A. Status Konektivitas Saat Ini (Backend & State)
| Tab Inspector | Backend Data Source | Apakah Nyambung ke Project? | Status Fungsional Saat Ini |
|---|---|---|---|
| **Requirements** | `RequirementService.ListRequirements(projectID)` | **Sudah** (terhubung ke SQLite `requirements`) | ⚠️ **Read-Only**: Data ter-load otomatis saat project berganti dan saat chat selesai, namun **belum ada tombol aksi Approve/Reject/Priority** di kartu. |
| **Validation** | `ValidationService.GetLatestFindings(projectID)` & `RunValidation(projectID)` | **Sudah** (memeriksa PRD 20 sec, SRS 22 sec, orphan reqs, outdated SRS) |  **Bekerja Penuh**: Tombol `Run Check` memicu validasi riil ke backend dan menampilkan findings. |
| **Traceability** | `ValidationService.GetTraceabilityMatrix(projectID)` | **Sudah** (memetakan requirement PRD vs kemunculannya di dokumen SRS) |  **Bekerja Penuh**: Menampilkan status `Mapped in SRS` vs `Orphan (Not in SRS)`. |
| **Assumptions** | `ConversationService.ListAssumptions(projectID)` | **Sudah** (terhubung ke SQLite `assumptions`) | ⚠️ **Read-Only**: Asumsi terekstraksi muncul, tapi belum ada tombol untuk `Confirm` atau `Reject` asumsi dari UI. |
| **Questions** | `ConversationService.ListClarifications(projectID)` | **Sudah** (terhubung ke SQLite `clarifications`) | ⚠️ **Read-Only**: Daftar pertanyaan klarifikasi muncul, tapi belum ada form input bagi pengguna untuk **menjawab klarifikasi**. |

### B. Masalah Kritis yang Perlu Diselesaikan di Right Inspector
1. **Fungsi Interaktif Requirement yang Hilang**:
   - Backend sudah memiliki method:
     - `RequirementService.ApproveRequirement(id)`
     - `RequirementService.RejectRequirement(id)`
     - `RequirementService.UpdatePriority(id, priority)`
   - *Solusi*: Tambahkan quick actions di setiap kartu requirement:
     - Tombol status toggle: `Approve` (Check hijau) dan `Reject` (Silang merah).
     - Dropdown/pill selector untuk mengubah prioritas MoSCoW (`Must Have`, `Should Have`, `Could Have`, `Won't Have`).
2. **Form Jawaban Klarifikasi**:
   - Backend sudah memiliki `RequirementService.AnswerClarification(id, answer)`.
   - *Solusi*: Untuk pertanyaan klarifikasi yang belum dijawab (`status === 'open'`), sediakan inline mini input teks dan tombol `Kirim Jawaban`. Jawaban ini akan tersimpan dan otomatis menjadi konteks discovery berikutnya.
3. **Toggle Status Asumsi**:
   - Backend sudah memiliki `RequirementService.UpdateAssumptionStatus(id, status)`.
   - *Solusi*: Sediakan tombol `Tandai Valid / Confirmed` dan `Tolak / Invalid`.
4. **Tombol "Ekstraksi Requirement Baru" (Manual Trigger)**:
   - Jika pengguna baru saja mengunggah draft dokumen atau chat tanpa menghasilkan JSON terstruktur, tambahkan tombol `+ Ekstrak Requirements` di header panel Requirements agar AI menganalisis ulang dokumen aktif dan mengekstrak item-item kebutuhan secara instan.

---

## 4. Proposed Changes

### Component 1: Settings Modal (`frontend/src/App.tsx`)
#### [MODIFY] `frontend/src/App.tsx`
- **Refactor Persona Editor Skills List**:
  - Ganti grid 16 kartu dengan daftar **Active Skills** yang bersih.
  - Setiap kartu aktif memiliki nama, kategori, cuplikan direktif prompt, dan tombol `X` (detach).
- **Dropdown "+ Add Skill to Persona"**:
  - Tombol dropdown interaktif dengan menu popover.
  - Menampilkan filter `skillsCatalog.filter(sk => !currentSkills.includes(sk.id))`.
  - Mengelompokkan skill yang belum terpasang berdasarkan kategori.
- **Custom Skills Library Management**:
  - Menempatkan kartu manajemen custom skill secara rapi dengan tombol delete permanen.

```tsx
// Dropdown "+ Add Skill to Persona"
<div className="relative">
  <button
    type="button"
    onClick={() => setShowAddSkillDropdown(!showAddSkillDropdown)}
    className="px-3 py-1.5 bg-primary-soft text-primary hover:bg-primary/20 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
  >
    <Plus size={13} />
    <span>+ Add Skill to Persona</span>
    <ChevronDown size={13} />
  </button>
  {showAddSkillDropdown && (
    <div className="absolute right-0 top-full mt-1.5 w-72 bg-surface border border-border rounded-xl shadow-xl p-1.5 z-30 max-h-64 overflow-y-auto">
      {unattachedSkills.map(sk => (
        <button
          key={sk.id}
          onClick={() => handleAddSkillToAgent(currentAgent, sk.id)}
          className="w-full text-left p-2 rounded-lg hover:bg-fill flex flex-col gap-0.5 text-xs"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-fg">{sk.name}</span>
            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-fill font-mono text-muted">{sk.category}</span>
          </div>
          <span className="text-[11px] text-muted line-clamp-1">{sk.description}</span>
        </button>
      ))}
    </div>
  )}
</div>
```

---

### Component 2: Right Inspector (`frontend/src/App.tsx`)
#### [MODIFY] `frontend/src/App.tsx`
- **Tab 1: Interactive Requirements Cards**:
  - Tambahkan tombol `Approve` (`Check`, emerald) dan `Reject` (`X`, rose) di pojok kanan kartu.
  - Tambahkan selector MoSCoW Priority (`Must Have`, `Should Have`, `Could Have`, `Won't Have`) yang memanggil `RequirementService.UpdatePriority(req.id, newPriority)`.
  - Tambahkan tombol `Ekstrak Requirement Baru` di header.
- **Tab 4: Interactive Assumptions**:
  - Tambahkan tombol status: `Konfirmasi Asumsi` (ubah status ke `confirmed`) dan `Tolak` (`rejected`) memanggil `RequirementService.UpdateAssumptionStatus`.
- **Tab 5: Interactive Clarifications**:
  - Tambahkan inline form untuk menjawab pertanyaan terbuka:
    - Input teks: `Tulis klarifikasi...`
    - Tombol `Simpan Jawaban` memanggil `RequirementService.AnswerClarification(c.id, answer)`.

---

## 5. Verification Plan

### Automated Tests
1. **Frontend Compilation**:
   ```bash
   cd frontend && npm run build
   ```
   *Ekspektasi: 0 TypeScript errors, Vite build sukses.*
2. **Backend Services Unit Tests**:
   ```bash
   export PATH=$PATH:/opt/homebrew/bin:~/go/bin; go test -v ./internal/...
   ```
   *Ekspektasi: Seluruh 13 unit test suites lulus (100% PASS).*
3. **Wails Native Compilation**:
   ```bash
   export PATH=$PATH:/opt/homebrew/bin:~/go/bin; wails3 task darwin:build:native
   ```

### Manual Verification
1. **Pengujian Skills UI di Settings**:
   - Buka Settings Modal &rarr; Tab *Specialist Personas*.
   - Pilih *Product Analyst*: Hanya 4 skill aktif bawaan yang muncul (rapi dan bersih tanpa 12 kartu disabled).
   - Klik `+ Add Skill to Persona`: Dropdown terbuka menampilkan skill dari kategori lain dan custom skill yang belum aktif.
   - Pilih satu skill: Skill langsung berpindah ke daftar aktif persona.
   - Klik icon `X` pada salah satu skill: Skill langsung terlepas dari persona.
2. **Pengujian Interaktivitas Right Inspector**:
   - Buka sebuah project aktif.
   - Masuk ke tab **Requirements**:
     - Klik tombol `Approve` pada requirement draft &rarr; status berubah menjadi `approved` (hijau).
     - Ubah prioritas MoSCoW &rarr; badge prioritas terupdate secara instan.
   - Masuk ke tab **Questions**:
     - Ketik jawaban pada klarifikasi &rarr; status terupdate menjadi `answered` dengan teks jawaban tampil rapi.
   - Masuk ke tab **Assumptions**:
     - Klik `Konfirmasi` pada asumsi unconfirmed &rarr; status terupdate menjadi `confirmed`.
   - Masuk ke tab **Validation**:
     - Klik `Run Check` &rarr; findings terupdate.
   - Masuk ke tab **Traceability**:
     - Pastikan mapping PRD ke SRS tampil akurat.

---

## User Review Required
> [!IMPORTANT]
> **Keputusan UX**:
> 1. Apakah Anda setuju dengan pendekatan dropdown "+ Add Skill to Persona" yang hanya menampilkan skill yang belum terpasang per persona?
> 2. Di panel Requirements sebelah kanan, apakah Anda ingin tombol "Ekstrak Requirements Otomatis" tersedia langsung di header panel inspector?

Mohon review dan berikan konfirmasi atau masukan untuk memulai eksekusi.
