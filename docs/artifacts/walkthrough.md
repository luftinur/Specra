# Walkthrough: Deteksi Model Dinamis & Pemilihan Model Coding Agent CLI

## 1. Ringkasan Implementasi
Kami telah menyelesaikan implementasi deteksi model dinamis untuk Coding Agent CLI (`antigravity` / `agy`, `opencode`, dan `gemini`) sehingga pengguna kini dapat melihat model apa saja yang terdeteksi secara otomatis di mesin lokal dan memilih model mana yang ingin digunakan.

---

## 2. Fitur yang Diselesaikan

### A. Dynamic Model Discovery Engine
1. **Google Antigravity CLI (`agy`)**:
   - Mendeteksi ketersediaan executable `agy` via `exec.LookPath`.
   - Mengambil model yang aktif via `agy models` non-interaktif secara real (*Zero-Mock*).
   - Mem-parsing baris output tabular (ID dan Display Name), mengabaikan header/fetching logs:
     - `gemini-3.8-flash-high` (*Gemini 3.8 Flash High*)
     - `gemini-3.8-flash-medium` (*Gemini 3.8 Flash Medium*)
     - `gemini-3.8-flash-low` (*Gemini 3.8 Flash Low*)
     - `claude-sonnet-4-6` (*Claude Sonnet 4.6 Thinking*)
     - `claude-opus-4-6-thinking` (*Claude Opus 4.6 Thinking*)
     - `gpt-oss-120b-medium` (*GPT-OSS 120B Medium*)
   - Meneruskan flag resmi `--model <selected_model>` ke subproses CLI saat generate dokumen maupun chat.

2. **OpenCode AI Agent (`opencode`)**:
   - Mendeteksi model via `opencode models` CLI atau endpoint `GET /models` jika HTTP base URL dikonfigurasi.
   - Menguraikan model seperti `opencode/beam-free`, `opencode/flint-40b-free`, `opencode/deepseek-v4.1-flash-free`, dll.
   - Meneruskan `-m <model>` ke perintah `opencode run`.

3. **Google Gemini (Direct REST API)**:
   - Mendukung penarikan daftar model resmi langsung via endpoint Google AI Studio jika API key tersedia.
   - Fallback cerdas ke model pilihan standar (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-1.5-pro`, `gemini-1.5-flash`).

### B. Penyimpanan & Integrasi Service (`internal/services/provider_service.go`)
- Model pilihan disimpan secara persisten di database SQLite lokal (`agy_model`, `opencode_model`, `gemini_model`).
- Nilai model direstore otomatis saat startup aplikasi via `restoreSettings()`.
- Menyediakan endpoint backend:
  - `ConfigureAntigravity(model string)`
  - `GetProviderModels(providerID string)`
  - `DetectInstalledCodingAgents()` (menyertakan `AvailableModels` dan `SelectedModel`).

### C. Antarmuka Pengguna (Frontend UI)
1. **Kartu Detected Agents (Settings -> Coding Agents & LLM)**:
   - Menampilkan badge jumlah model yang berhasil dideteksi (misal: `Model CLI (6 terdeteksi)`).
   - Menghadirkan `<select>` dropdown model aktif langsung di dalam kartu agent yang terinstal.
   - Mengubah dropdown langsung mengonfigurasi model aktif agent tersebut.
2. **Form Konfigurasi Spesifik Provider**:
   - Kartu konfigurasi dedicated untuk Google Antigravity CLI dengan dropdown pilihan model + tombol **Refresh Models**.
   - Kartu konfigurasi OpenCode dengan sinkronisasi model dinamis.
   - Kartu konfigurasi Gemini Direct dengan dropdown model resmi.
3. **Pill Status Engine di Header & Sidebar**:
   - Menampilkan model yang sedang aktif di samping provider (misal: `antigravity · gemini-3.8-flash-high`).
   - Dapat diklik langsung untuk membuka tab **Coding Agents & LLM**.

---

## 3. Hasil Pengujian & Verifikasi

1. **Go Unit & Service Test Suite**:
   ```powershell
   go test -v ./internal/...
   ```
   **Hasil:** Seluruh 13 test suite (`internal`, `internal/ai`, `internal/security`, `internal/services`, `internal/storage`) lulus 100% (`PASS`).

2. **Frontend TypeScript & Vite Production Build**:
   ```powershell
   npm --prefix frontend run build
   ```
   **Hasil:** `tsc` dan `vite build` selesai sukses tanpa ada error tipe maupun warning kompilasi (`0 errors`).
