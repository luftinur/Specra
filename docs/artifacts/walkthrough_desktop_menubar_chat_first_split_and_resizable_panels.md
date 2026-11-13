# Walkthrough: Desktop Application Menu Bar, Chat-First Split View, & Resizable Panels

**Dokumentasi Implementasi Solusi UX Desktop Studio**  
*Tanggal: 13 November 2026*  
*Repositori: `dev-agent-assistant`*  
*Branch: `main`*

---

## 1. Ringkasan Eksekutif & Pemenuhan Kebutuhan Pengguna

Pembaruan ini merombak total paradigma tata letak antarmuka aplikasi dari *page-switching modal* menjadi **Desktop Native Chat-First Split Workspace**, menyelesaikan secara tuntas seluruh keluhan UX yang disampaikan pengguna:

1. **Chat Interaktif Selalu Tersedia (Zero Blocking)**:
   - Sebelumnya, saat pengguna membuka menu dokumen (PRD, SRS, Arsitektur, Design System), layar obrolan (*Chat Discovery*) tertutup penuh sehingga pengguna tidak bisa berdiskusi atau memberikan koreksi kepada AI.
   - **Solusi**: Diperkenalkan layout mode `split` (Split View berdampingan) dan `chat` (Chat Utama Saja) serta `doc` (Dokumen Saja). Di mode `split`, percakapan dengan AI Spesialis tetap aktif di kolom kiri sementara dokumen dapat diinspeksi atau diedit di kolom kanan.

2. **Desktop Application Menu Bar Standar**:
   - Menghilangkan tombol-tombol navigasi dokumen besar yang memakan ruang sidebar vertikal.
   - Menyediakan menu bar desktop native (`File`, `Edit`, `View`, `Documents`, `AI Agent`, `Help`) lengkap dengan *keyboard shortcuts* standar industri (`Ctrl+B`, `Ctrl+J`, `Ctrl+1/2/3`, `Ctrl+N`, `Ctrl+O`).
   - Menyediakan tombol pemilih tata letak cepat di sisi kanan menu bar: `💬 Chat`, `◫ Split`, dan `📄 Doc`.

3. **Pembersihan Top Stepper Bar**:
   - Membuang top bar tab stepper (`Discovery > PRD > SRS > Architecture > Design`) yang sebelumnya memakan ruang vertikal layar kerja.
   - Banner notifikasi penting seperti pertanyaan klarifikasi (*gating banner*) dan *completion notice* tetap dipertahankan dengan rapi di area atas editor.

4. **Resizable Columns dengan Drag Splitters**:
   - Dibuat hook reusable `useResizablePanel` dengan batasan aman (`min`/`max` clamping), kursor `col-resize`, feedback visual hover/active, serta penyimpanan rasio lebar otomatis ke `localStorage`.
   - Panel Navigasi Kiri (Navigator), Pemisah Kolom Tengah (Chat vs Canvas Dokumen), dan Panel Kanan (Project Co-Pilot) kini semuanya dapat digeser lebarnya secara halus (*smooth drag*).
   - Ditambahkan *fullscreen invisible drag overlay* (`z-[9999]`) agar event mousemove dan mouseup tidak pernah lepas (*pointer drift*) saat kursor melintasi iframe atau teks editor.

5. **Context-Aware Persona Auto-Switching**:
   - Saat pengguna membuka dokumen tertentu melalui Menu Bar atau Navigator, persona AI Spesialis otomatis tersinkronisasi:
     - **PRD** ➔ Otomatis memilih **Product Analyst**
     - **SRS** ➔ Otomatis memilih **System Analyst**
     - **Architecture** ➔ Otomatis memilih **Software Architect**
     - **Design System** ➔ Otomatis memilih **UI/UX Agent**

---

## 2. Rincian Komponen Baru & Pembaruan Arsitektur

### A. `frontend/src/hooks/useResizablePanel.ts`
Hook custom React yang menangani resizing kolom secara independen:
- Mendukung penyimpanan state persisten ke browser (`localStorage.getItem/setItem`).
- Clamping ukuran minimum dan maksimum dinamis.
- Parameter arah `left` atau `right` untuk membedakan panel navigasi kiri dan inspector kanan.
- Mengembalikan flag `isDragging` untuk aktivasi drag overlay global.

### B. `frontend/src/components/DesktopMenuBar.tsx`
Menu bar bergaya desktop native yang kaya fitur:
- **File**: *New Project (Ctrl+N)*, *Open Project (Ctrl+O)*, *Open Workspace Folder*, *Export Document*, *Export All*, *Close Project*.
- **Edit**: *Undo*, *Redo*, *Copy Markdown (Ctrl+C)*, *Clear Chat History*.
- **View**: Toggle Sidebar Kiri (`Ctrl+B`), Toggle Co-Pilot (`Ctrl+J`), Pilihan Mode: Chat (`Ctrl+1`), Split (`Ctrl+2`), Dokumen (`Ctrl+3`), Ganti Tema (Terang / Gelap / Sistem).
- **Documents**: Akses cepat ke PRD (20 Sec), SRS (22 Sec), Architecture (16 Sec), dan Design System (16 Sec) lengkap dengan badge status terkini (*Draft*, *Approved*, *Outdated*).
- **AI Agent**: Beralih persona secara eksplisit, switch mode (Eksplorasi / Eksekusi), dan pemicu Auto-Pipeline.
- **Help**: Panduan Spesifikasi IEEE 830, Arsitektur C4, Desain Token MQ-Studio, dan About Studio.

### C. `frontend/src/components/DocumentCanvasPane.tsx`
Komponen modular khusus untuk menampilkan kanvas dokumen aktif:
- Header kanvas dengan status approval, tombol edit manual markdown (dengan konfirmasi pembatalan), copy full doc, dan ekspor.
- Pengalih mode tampilan: *Rendered Markdown Preview* vs *Raw Markdown Source*.
- Kontrol tata letak cepat di pojok kanan atas kanvas (*Split Ratio*, *Maximize Doc*, *Close Pane*).
- Regenerasi per-seksi untuk perbaikan terarah tanpa harus meregenerasi seluruh dokumen.

### D. `frontend/src/App.tsx`
Integrasi orkestrasi utama:
- State `layoutMode` (`'chat' | 'split' | 'doc'`).
- Inisialisasi 3 resizer: `leftPanel` (min 160px, max 420px), `centerSplit` (min 320px, max 950px), dan `rightPanel` (min 240px, max 550px).
- Fungsi `handleOpenDocument` yang mengalihkan `activeDocType`, mengaktifkan mode `split`, dan memindahkan `activeChatAgent` ke spesialis terkait.
- Pemisahan fungsi `renderChatPane` dan `renderDocumentPane` untuk rendering modular dan fleksibel.

---

## 3. Hasil Pengujian & Verifikasi

### A. Verifikasi TypeScript & Bundle Frontend
```bash
npm --prefix frontend run build
```
- **Hasil**: Berhasil 100% tanpa error (`tsc` lolos dengan `strict: true`, Vite memproduksi bundel produksi dalam 2.81 detik).

### B. Verifikasi Backend Go Test Suite
```bash
go test -v ./internal/...
```
- **Hasil**: Seluruh 13 unit & end-to-end test suite PASS (100% lolos):
  - `TestEndToEndScenarios` (Scenario A-D) : PASS
  - `TestDocumentService_PRD_SRS_ApprovalGating` : PASS
  - `TestArchitectureDocumentLifecycle` : PASS
  - `TestDesignDocumentLifecycle` : PASS
  - `TestConversation_AttachmentAndZeroMockFailFast` : PASS
  - `TestAgentRegistry_PersonasAndMCP` : PASS
  - `TestTOON_EncodeAndDecode` : PASS
  - `TestWorkspaceManager` : PASS

---

## 4. Kesimpulan

Dengan arsitektur **Desktop Menu Bar + Chat-First Split View + Resizable Panels**, pengguna sekarang mendapatkan alur kerja yang jauh lebih intuitif dan produktif:
- Ide dapat didiskusikan langsung di kolom chat kapan pun.
- Dokumen yang dihasilkan AI dapat dibaca, diedit, dan dievaluasi berdampingan secara *real-time*.
- Lebar masing-masing kolom dapat diatur bebas sesuai preferensi layar pengguna.
