# Walkthrough: Rekonstruksi UX Asumsi Interaktif, Project Co-Pilot, & Sinkronisasi Alur Multi-Agent

## 1. Ringkasan Eksekutif
Berdasarkan evaluasi kritis pengguna mengenai:
1. *"di sidebar sebelah kanan kan ada assumptions nah itu gw jawabnya gimana ? perlu jawaban kan..":* Ketiadaan sarana bagi pengguna untuk menjawab atau mengoreksi asumsi AI selain menolaknya secara pasif.
2. *"sidebar kanan ini bikin bingung user yang inspector viewers secara pipeline, workflow, dan chat discovery ini nyambung semua kan sebenernya ? secara UX bagaimana rekomendasi lu":* Fragmentasi sidebar kanan ("Inspector") yang menyembunyikan 5 sub-view di balik menu 3-titik kecil.
3. *"chat discoverynya juga, harusnya nyambung juga kan ya ? karena gini misal gw ke menu prd dan gw klik button generate..apakah chat discovery paham statusnya sampai mana ? kemudian ini jadi ga kepake atau sebenertnya terpakai secara fungsi nantinya untuk chat discovery yang dropdown pilih persona discovery sama dropdown discovery mode dan exec mode":* Ketiadaan sinkronisasi antara aksi canvas dokumen dan linimasa chat, serta kebingungan tujuan fungsional dropdown persona dan mode interaksi.

Seluruh permasalahan di atas telah diselesaikan dan diimplementasikan secara end-to-end pada lapisan backend (Go, SQLite, Service layer) dan frontend (React 19, TypeScript strict mode, Tailwind CSS).

---

## 2. Rincian Fitur & Penguatan yang Diterapkan

### A. Interaktivitas Asumsi Proyek (Confirm, Correct, Reject)
1. **Penyimpanan Koreksi di SQLite (`internal/storage/conversation_repo.go`)**:
   - Menambahkan query `UpdateAssumption(ctx, id, description, status)` untuk memperbarui teks fakta hasil koreksi pengguna sekaligus menandai statusnya menjadi `confirmed`.
2. **Backend Service (`internal/services/requirement_service.go`)**:
   - Menambahkan `CorrectAssumption(id string, correctedText string) error`.
3. **Kartu Asumsi Interaktif di UI (`frontend/src/App.tsx`)**:
   - Setiap kartu asumsi kini memiliki 3 tombol aksi jelas:
     - **`✓ Benar`**: Mengonfirmasi asumsi AI apa adanya menjadi fakta proyek sah (`confirmed`).
     - **`✎ Koreksi`**: Membuka kotak teks inline (*inline textarea*) langsung di kartu: *"Tuliskan fakta atau preferensi yang benar (misal: 'Bukan Stripe, kita pakai Midtrans QRIS')..."* lengkap dengan tombol **Simpan Koreksi** dan **Batal**.
     - **`✕ Tolak`**: Menolak asumsi yang tidak relevan (`rejected`).
   - Asumsi yang telah terkonfirmasi/dikoreksi menampilkan badge hijau `✓ Terkonfirmasi` dengan opsi untuk mengedit kembali jika ada perubahan kebutuhan di kemudian hari.

### B. Transformasi Sidebar Kanan: "Project Co-Pilot" dengan 3 Tab Terbuka
1. **Re-branding Menjadi "Project Co-Pilot"**:
   - Mengganti istilah teknis *Inspector* menjadi asisten proaktif yang mendampingi alur kerja pengguna.
   - Menghilangkan menu 3-titik dropdown (`MoreVertical`) yang sebelumnya menyembunyikan navigasi.
2. **3 Segmented Tabs Permanen**:
   - **Tab 1: `Kebutuhan`**: Menampilkan backlog kebutuhan (FR-xxx/NFR-xxx), filter prioritas MoSCoW, tombol Approve/Reject, dan pemicu ekstraksi AI.
   - **Tab 2: `Tanya & Asumsi` (Action Center)**:
     - Menggabungkan **Pertanyaan Klarifikasi AI** dan **Asumsi Sistem** dalam satu wadah aksi terpusat.
     - Dilengkapi **Badge Counter** kuning berkedip (*pulsing dot*) jika ada pertanyaan terbuka atau asumsi yang belum dikonfirmasi/dijawab.
   - **Tab 3: `Pipeline & Audit`**:
     - Visual Stepper status 5 tahap dokumen (Discovery ➔ PRD ➔ SRS ➔ Architecture ➔ Design System) yang dapat diklik langsung untuk membuka dokumen terkait.
     - Ringkasan temuan validasi/konflik dengan tombol "Audit Ulang".
     - Matriks ketertelusuran (*Traceability Matrix*) PRD ➔ SRS.
3. **Smart Auto-Focusing**:
   - Saat pipeline otomatis berhenti sejenak karena ada pertanyaan klarifikasi yang wajib dijawab, sistem otomatis mengarahkan fokus sidebar kanan ke tab **Tanya & Asumsi**.

### C. Bi-Directional Canvas-to-Chat Synchronization
1. **Pencatatan Event Sistem Milestone (`internal/services/conversation_service.go`)**:
   - Menambahkan metode `PostSystemEvent(conversationID, projectID, title, message string) (*domain.Message, error)` yang mencatat milestone dokumen resmi ke dalam database percakapan.
2. **Auto-Post Notifikasi Milestone ke Linimasa Chat**:
   - Saat pengguna mengklik tombol di canvas:
     - **Generate PRD**: Mem-posting milestone *"PRD Draft v1 Berhasil Dibuat (20 Sections)"* dengan rekapitulasi jumlah kebutuhan dan asumsi.
     - **Approve PRD**: Mem-posting pemberitahuan *"PRD Resmi Disetujui (Approved)"* bahwa gerbang downstream SRS kini terbuka.
     - **Generate / Approve SRS**: Mem-posting pembaharuan spesifikasi SRS IEEE 830 (22 sections).
     - **Generate / Approve Architecture**: Mem-posting pembaharuan dokumen Arsitektur (16 sections, C4 diagram, API contracts).
     - **Generate / Approve Design System**: Mem-posting penyelesaian Design System (16 sections, MQ-Studio tokens & screen flows).
   - Saat pengguna kembali ke tab Chat, linimasa percakapan langsung sinkron dan mengetahui dengan persis di mana posisi dokumen proyek berada.

### D. Penyelarasan Specialist Persona & Segmented Mode Toggle
1. **Context-Aware Persona Auto-Switching**:
   - Berpindah ke menu **PRD** ➔ Persona chat otomatis berpindah ke **Product Analyst**.
   - Berpindah ke menu **SRS** ➔ Persona chat otomatis berpindah ke **System Analyst**.
   - Berpindah ke menu **Architecture** ➔ Persona chat otomatis berpindah ke **Software Architect**.
   - Berpindah ke menu **Design System** ➔ Persona chat otomatis berpindah ke **UI/UX Agent**.
2. **Segmented Toggle Pill Mode Interaksi**:
   - Menggantikan dropdown tersembunyi dengan **Toggle Pill 1-Klik** di atas bar input chat:
     - **`🔍 Eksplorasi (Tanya Jawab)`**: AI proaktif mencari celah, mengajukan pertanyaan klarifikasi, dan mendeteksi asumsi dari ide kasar pengguna.
     - **`⚡ Eksekusi (Spesifikasi)`**: AI langsung menyusun draft spesifikasi teknis dan artefak dokumen tanpa bertanya.

---

## 3. Hasil Verifikasi & Uji Mutu

1. **Go Unit & Integration Test Suites**:
   ```powershell
   go test -v ./internal/...
   ```
   **Hasil:**
   - `ai-requirements-studio/internal`: **PASS** (Scenario A-D e2e)
   - `ai-requirements-studio/internal/ai`: **PASS** (Orchestrator, Discovery, TOON, Validation Engine)
   - `ai-requirements-studio/internal/security`: **PASS** (Sensitive Data Redaction)
   - `ai-requirements-studio/internal/services`: **PASS** (RequirementService CorrectAssumption, ConversationService PostSystemEvent, 90 goroutines stress test)
   - `ai-requirements-studio/internal/storage`: **PASS** (Workspace path traversal guard, DocumentRepo atomic transactions)

2. **Frontend TypeScript & Vite Production Build**:
   ```powershell
   npm --prefix frontend run build
   ```
   **Hasil:**
   - `tsc` (TypeScript Strict Mode): **0 errors**.
   - Vite client bundle: Berhasil dibangun dalam **3.35s**.
