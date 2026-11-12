# Implementation Plan: Fix Windows CLI Command-Line Length Limit & Autonomous Pipeline Orchestrator

## 1. Goal Description

Rencana implementasi ini menyelesaikan dua kebutuhan mendesak:
1. **Perbaikan Fatal Error Windows CLI (`The filename or extension is too long`)**:
   - **Akar Masalah**: Saat membuat dokumen hilir seperti SRS, Architecture, atau Design System, seluruh isi dokumen hulu (PRD 20 Sections dan skema JSON) dimasukkan sebagai argumen baris perintah (`-p "<prompt>"` dan `--json-schema "<schema>"`).
   - Di Windows OS, fungsi kernel `CreateProcess` memiliki batasan keras **32.767 karakter**. Melebihi batasan ini menyebabkan kernel Windows melempar error code 206: `The filename or extension is too long`.
   - **Solusi**: Mengubah adapter `antigravity` dan `opencode` agar menyalurkan prompt melalui **`cmd.Stdin` (`strings.NewReader(req.Prompt)`)** dan menyimpan schema panjang ke berkas sementara (`temp-schema-*.json`). Argumen baris perintah menyusut menjadi hanya ~50 karakter dan tidak akan pernah terkena limit Windows lagi.

2. **Autonomous Requirements Pipeline Orchestrator ("Auto Pipeline")**:
   - **Masalah UX Saat Ini**: Alur saat ini membingungkan bagi pengguna baru karena harus berpindah tab secara manual, mengekstrak requirement, meng-approve PRD di tab terpisah, berpindah ke tab SRS untuk klik generate dan approve, lalu mengulanginya untuk Architecture dan Design System.
   - **Solusi**: Menghadirkan fitur **Auto Pipeline Orchestrator** yang dapat dijalankan dengan satu klik (`[ ⚡ Jalankan Auto Pipeline ]`):
     - **Fase 1 (Discovery & Requirement Extraction)**: AI mengekstrak MoSCoW requirements, clarifications, dan assumptions dari brief/obrolan.
     - **Clarification Gating**: Jika AI menemukan pertanyaan klarifikasi pending, pipeline **otomatis berhenti sementara (*paused*)** dan menampilkan kartu pertanyaan klarifikasi. Setelah pengguna menjawab (atau memilih *"Lanjutkan dengan Asumsi"*), pipeline otomatis berlanjut.
     - **Fase 2 (PRD Generation & Auto-Approve)**: Menyusun 20 Sections PRD.
     - **Fase 3 (SRS Generation & Auto-Approve)**: Menyusun 22 Sections IEEE 830 SRS.
     - **Fase 4 (Architecture Generation & Auto-Approve)**: Menyusun 16 Sections C4 Architecture.
     - **Fase 5 (Design System Generation & Auto-Approve)**: Menyusun 16 Sections Semantic Design System.
     - **Completion**: Menampilkan status sukses komprehensif dengan opsi langsung `[ 📥 Export All (.md) ]`.

---

## 2. User Review Required

> [!IMPORTANT]
> **Clarification Gating Behavior**:
> Saat Auto Pipeline berjalan, jika ada pertanyaan klarifikasi penting dari AI (misalnya model autentikasi, batas latensi, atau payment gateway), pipeline akan **berhenti sejenak dan menyorot pertanyaan tersebut** di chat agar spesifikasi sistem tidak berhalusinasi.
> Pengguna cukup menjawab pertanyaan tersebut lalu menekan tombol `[ ➔ Lanjutkan Pipeline ]`, dan sistem akan langsung menyelesaikan sisa dokumen hingga Design System.

---

## 3. Proposed Changes

### A. AI Adapters: Stdin Piping & Schema Temp Files ([`internal/ai/adapters/antigravity/adapter.go`](file:///E:/dev-agent-assistant/internal/ai/adapters/antigravity/adapter.go) & [`internal/ai/adapters/opencode/adapter.go`](file:///E:/dev-agent-assistant/internal/ai/adapters/opencode/adapter.go))

#### [MODIFY] `internal/ai/adapters/antigravity/adapter.go`
- Hapus `-p` dari baris perintah. Alirkan `req.Prompt` melalui `cmd.Stdin = strings.NewReader(req.Prompt)`.
- Jika `req.JSONSchema` panjang, tulis ke berkas sementara di direktori OS temp dan operkan jalurnya via `--json-schema <filepath>` lalu bersihkan dengan `defer os.Remove(...)`.
```go
func (a *Adapter) Generate(ctx context.Context, req ai.GenerateRequest) (*ai.GenerateResponse, error) {
	args := []string{
		"--output-format", "json",
		"--disable-slash-commands",
	}

	if req.Model != "" {
		args = append(args, "--model", req.Model)
	}

	var tempSchemaFile string
	if req.JSONSchema != "" {
		tmpFile, err := os.CreateTemp("", "agy-schema-*.json")
		if err == nil {
			_, _ = tmpFile.WriteString(req.JSONSchema)
			_ = tmpFile.Close()
			tempSchemaFile = tmpFile.Name()
			args = append(args, "--json-schema", tempSchemaFile)
			defer os.Remove(tempSchemaFile)
		} else {
			args = append(args, "--json-schema", req.JSONSchema)
		}
	}

	cmd := exec.CommandContext(ctx, a.executablePath, args...)
	if req.WorkDir != "" {
		cmd.Dir = req.WorkDir
	}
	cmd.Stdin = strings.NewReader(req.Prompt)
    ...
```

#### [MODIFY] `internal/ai/adapters/opencode/adapter.go`
- Alirkan prompt melalui `cmd.Stdin = strings.NewReader(fullPrompt)` dengan flag `run --format default`.

---

### B. Frontend Auto Pipeline Orchestrator ([`frontend/src/App.tsx`](file:///E:/dev-agent-assistant/frontend/src/App.tsx))

#### [MODIFY] `frontend/src/App.tsx`
1. **State Auto Pipeline**:
   ```ts
   const [autoPipelineRunning, setAutoPipelineRunning] = useState(false);
   const [autoPipelineStage, setAutoPipelineStage] = useState<string | null>(null);
   const [pipelinePausedReason, setPipelinePausedReason] = useState<string | null>(null);
   ```
2. **Fungsi `runAutoPipeline()`**:
   ```ts
   const runAutoPipeline = async () => {
     setAutoPipelineRunning(true);
     setPipelinePausedReason(null);
     
     // 1. Ekstraksi Requirements jika belum ada
     if (requirements.length === 0) {
       setAutoPipelineStage('Mengekstrak Kebutuhan Awal (Discovery)...');
       await handleExtractRequirements();
     }

     // Gating Check: Pertanyaan Klarifikasi
     const openClar = clarifications.filter(c => c.status !== 'answered' && !c.answer);
     if (openClar.length > 0) {
       setAutoPipelineRunning(false);
       setPipelinePausedReason(`Pipeline Dihentikan Sementara: Harap jawab ${openClar.length} pertanyaan klarifikasi.`);
       setCurrentView('chat');
       return;
     }

     // 2. Generate & Approve PRD
     setAutoPipelineStage('Menyusun PRD (20 Sections)...');
     await handleGeneratePRD();
     await DocumentService.ApproveDocument(activeProject.id, 'prd');

     // 3. Generate & Approve SRS
     setAutoPipelineStage('Menyusun SRS IEEE 830 (22 Sections)...');
     await handleGenerateSRS();
     await DocumentService.ApproveDocument(activeProject.id, 'srs');

     // 4. Generate & Approve Architecture
     setAutoPipelineStage('Menyusun Architecture C4 (16 Sections)...');
     await handleGenerateArchitecture();
     await DocumentService.ApproveDocument(activeProject.id, 'architecture');

     // 5. Generate & Approve Design System
     setAutoPipelineStage('Menyusun Design System (16 Sections)...');
     await handleGenerateDesign();
     await DocumentService.ApproveDocument(activeProject.id, 'design');

     setAutoPipelineStage(null);
     setAutoPipelineRunning(false);
   };
   ```
3. **UI Integration**:
   - Menambahkan tombol aksi cepat **`[ ⚡ Auto Pipeline ]`** di Header Stepper Bar dan di Inspector/Chat banner.
   - Menampilkan status progres aktif (misal: *"Menyusun SRS (22 Sections)..."*) dengan loader spinner.
   - Menampilkan banner pemberitahuan saat pipeline selesai atau saat menunggu jawaban klarifikasi.

---

## 4. Verification Plan

### Automated Tests
1. **Go Unit & Adapter Tests**:
   ```bash
   go test -v ./internal/...
   ```
   *Ekspektasi: 13 test suites lolos 100%.*
2. **Frontend Compilation**:
   ```bash
   cd frontend && npm run build
   ```
   *Ekspektasi: 0 error TypeScript.*

### Manual Verification
1. **Verifikasi Perbaikan CLI Windows (SRS Generation)**:
   - Klik generate SRS pada proyek dengan PRD panjang -> Verifikasi bahwa perintah `agy.exe` berhasil mengeksekusi tanpa error `The filename or extension is too long`.
2. **Verifikasi Auto Pipeline**:
   - Buat proyek baru atau buka proyek aktif.
   - Klik tombol `[ ⚡ Auto Pipeline ]`.
   - Perhatikan alur berjalan otomatis:
     - Berhenti saat ada klarifikasi pending.
     - Melanjutkan otomatis menyusun PRD ➔ SRS ➔ Architecture ➔ Design System.
   - Verifikasi seluruh dokumen tersusun lengkap dan berstatus *approved*.
