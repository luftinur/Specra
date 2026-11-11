# Implementation Plan — Push AI Requirements Studio ke GitHub (Private, Branch `main`)

Dokumen rencana teknis untuk inisialisasi Git, pembersihan & konfigurasi `.gitignore`, pembuatan initial commit, dan proses push kode sumber ke repositori GitHub Private pada branch `main`.

---

## 1. Goal Description

Menyimpan seluruh basis kode proyek **AI Requirements Studio** (backend Go + Wails v3, frontend React/TypeScript MQ-Studio, dokumentasi PRD/SRS/Design System, dan folder `docs/artifacts`) ke repositori GitHub pribadi milik pengguna dengan konfigurasi:
- **Visibility:** Private
- **Default Branch:** `main`
- **Clean Hygiene:** Memastikan file biner (`bin/*.exe`), `node_modules`, SQLite database, dan file sementara tidak ikut ter-push.

---

## 2. User Review & Decision Required

> [!IMPORTANT]
> **Pilihan Pembuatan Repositori GitHub:**
> 
> Karena GitHub CLI (`gh`) belum terinstal/terautentikasi di lingkungan terminal saat ini, ada 2 opsi praktis untuk menghubungkan ke GitHub:
> 
> - **Opsi 1 (Direkomendasikan - Paling Cepat):**
>   1. Buka [github.com/new](https://github.com/new) di browser Anda.
>   2. Isi nama repository (misal: `ai-requirements-studio`).
>   3. Pilih **Private**.
>   4. *Jangan* centang *"Add a README file"*, *"Add .gitignore"*, atau *"Choose a license"* (biarkan kosong).
>   5. Berikan URL repositori Anda kepada saya (contoh: `https://github.com/<username>/ai-requirements-studio.git`).
>   6. Saya akan langsung menghubungkan remote dan melakukan push ke branch `main`.
> 
> - **Opsi 2 (Menggunakan GitHub CLI):**
>   Kita instal `gh` via `winget install --id GitHub.cli`, lalu Anda jalankan `gh auth login` satu kali di terminal untuk autorisasi web browser, setelah itu kita buat private repo via perintah CLI.

> [!NOTE]
> **Direktori `_ref_ui/` (20 MB):**
> Folder `_ref_ui` berisi source code referensi dari MQ-Studio 0.4.2 yang digunakan saat mengadopsi design tokens.
> - *Rekomendasi:* Masukkan ke `.gitignore` agar repositori GitHub tetap ramping dan fokus hanya pada kode aplikasi studio kita. Jika Anda ingin menyertakannya, informasikan agar tidak kita ignore.

---

## 3. Proposed Changes & Steps

### 1. Penyempurnaan `.gitignore`
Memperbarui file [`.gitignore`](file:///E:/dev-agent-assistant/.gitignore) agar mencakup:
```gitignore
# Build & Binary
.task
bin/
*.exe
build/windows/nsis/MicrosoftEdgeWebview2Setup.exe
build/linux/appimage/build
build/ios/xcode/gen/
build/android/gen/

# Frontend dependencies & output
frontend/dist/
frontend/node_modules/

# Local databases & runtimes
*.db
*.db-journal
*.db-wal
*.db-shm
workspaces/
projects/

# OS and Temp Files
.DS_Store
Thumbs.db
*.tmp

# Reference UI Assets (Optional)
_ref_ui/
```

---

### 2. Inisialisasi Git & Commit Lokal
Menjalankan perintah Git bertahap di `E:\dev-agent-assistant`:
```powershell
# 1. Inisialisasi repository dengan branch main
git init -b main

# 2. Stage seluruh kode sumber & dokumentasi
git add .

# 3. Buat commit pertama
git commit -m "feat: initial commit AI Requirements Studio desktop app (Wails v3 + React + Specialist Agents)"
```

---

### 3. Remote Configuration & Push ke GitHub
Setelah remote URL diperoleh dari Anda:
```powershell
# 1. Tambahkan remote GitHub
git remote add origin <URL_GITHUB_REPO>

# 2. Pastikan branch bernama main
git branch -M main

# 3. Push kode ke private repository (Git Credential Manager akan pop-up/login otomatis)
git push -u origin main
```

---

## 4. Verification Plan

### Automated Verification
```powershell
# 1. Pastikan status git bersih setelah commit
git status

# 2. Pastikan remote mengarah ke GitHub
git remote -v

# 3. Verifikasi commit log
git log -1 --stat

# 4. Verifikasi branch tracking
git branch -vv
```

### Manual Verification
- Buka tautan repository di web browser GitHub untuk memastikan semua source code, dokumen PRD/SRS/Design System, dan `docs/artifacts/` telah terunggah dengan rapi di branch `main`.
