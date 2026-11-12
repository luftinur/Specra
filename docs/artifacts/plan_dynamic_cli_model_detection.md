# Rencana Implementasi: Deteksi Model Dinamis & Pemilihan Model untuk Coding Agent CLI (Antigravity, OpenCode, dll.)

## 1. Ringkasan Eksekutif & Jawaban Kunci
**Pertanyaan Pengguna:**
> *"untuk coding agent cli, antigravity, opencode, dan lainnya apakah saat terdetect kita bisa dapatin model yang didapat dari agent tersebut jadi gw bisa milih ?"*

**Jawaban:**
**Sangat Bisa!** 
Kami telah menguji langsung pada CLI di mesin Anda secara real (*Zero-Mock*):
1. **Google Antigravity CLI (`agy`)**:
   Menyediakan perintah bawaan `agy models` yang mengembalikan daftar model aktif beserta nama tampilannya:
   - `gemini-3.8-flash-high` (Gemini 3.8 Flash High)
   - `gemini-3.8-flash-medium` (Gemini 3.8 Flash Medium)
   - `gemini-3.8-flash-low` (Gemini 3.8 Flash Low)
   - `claude-sonnet-4-6` (Claude Sonnet 4.6 Thinking)
   - `claude-opus-4-6-thinking` (Claude Opus 4.6 Thinking)
   - `gpt-oss-120b-medium` (GPT-OSS 120B Medium)
   CLI `agy` juga mendukung flag `--model <model_id>` secara resmi pada eksekusi non-interaktif!

2. **OpenCode AI Agent (`opencode`)**:
   Menyediakan perintah bawaan `opencode models` yang mengembalikan model-model yang tersedia:
   - `opencode/beam-free`
   - `opencode/big-pickle`
   - `opencode/deepseek-v4.1-flash-free`
   - `opencode/flint-40b-free`
   - `opencode/glm-5.3-flash-free`
   - dll.
   CLI `opencode` mendukung flag `-m <model_id>` pada `opencode run`. Jika berjalan melalui server HTTP/OpenAI-compatible, endpoint `GET /models` juga tersedia.

3. **Google Gemini (Direct REST API)**:
   Mendukung endpoint resmi `GET https://generativelanguage.googleapis.com/v1beta/models?key={key}` untuk menarik seluruh model yang mendukung `generateContent` (misal: `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-1.5-pro`), dengan fallback daftar model standar jika offline/belum mengisi API key.

4. **Ollama / Local LLM** (jika terinstal):
   Mendukung perintah `ollama list` untuk mengambil daftar model lokal (Llama 3, DeepSeek-R1, Mistral, dll.).

---

## 2. Arsitektur Alur Deteksi & Seleksi Model

```mermaid
flowchart TD
    subgraph Detection [1. Dynamic Agent & Model Discovery]
        DA[ai.DetectInstalledCodingAgents] --> AGY[agy models]
        DA --> OC[opencode models / GET /models]
        DA --> GEM[Gemini REST /models / Standard List]
        DA --> OLL[ollama list]
    end

    subgraph Domain [2. Domain & Storage State]
        AGY --> MI1[[]domain.ModelInfo]
        OC --> MI2[[]domain.ModelInfo]
        GEM --> MI3[[]domain.ModelInfo]
        OLL --> MI4[[]domain.ModelInfo]
        
        MI1 & MI2 & MI3 & MI4 --> DET[domain.DetectedAgent.AvailableModels]
        SQL[(SQLite app.db settings)] --> SAVED_MODELS[Saved Model per Provider]
    end

    subgraph UI [3. Frontend UI Settings & Execution]
        DET --> CARD[Agent Detection Card with Model Dropdown]
        SAVED_MODELS --> SELECTOR[Provider Config <select> Dropdown]
        SELECTOR -->|User selects model| SAVE_API[ProviderService.ConfigureXXX]
        SAVE_API --> SQL
    end

    subgraph Runtime [4. Subprocess Execution]
        DOC[DocumentService / ConversationService] --> EXEC[ai.Orchestrator.Execute]
        EXEC --> ARGS[agy --model ... / opencode -m ...]
    end
```

---

## 3. Rincian Modifikasi Teknis

### A. Domain Layer (`internal/domain/models.go`)
1. Tambahkan struktur `ModelInfo`:
   ```go
   type ModelInfo struct {
       ID          string `json:"id"`
       DisplayName string `json:"display_name"`
       Description string `json:"description,omitempty"`
   }
   ```
2. Perluas `DetectedAgent`:
   ```go
   type DetectedAgent struct {
       ID              string      `json:"id"`
       Name            string      `json:"name"`
       Executable      string      `json:"executable"`
       Installed       bool        `json:"installed"`
       Version         string      `json:"version"`
       Path            string      `json:"path"`
       Description     string      `json:"description"`
       AvailableModels []ModelInfo `json:"available_models"`
       SelectedModel   string      `json:"selected_model"`
   }
   ```

### B. AI Engine Layer (`internal/ai/`)
1. **Interface `ModelDiscoverer` (`internal/ai/provider.go`)**:
   Tambahkan interface opsional untuk provider yang bisa melist model:
   ```go
   type ModelDiscoverer interface {
       ListModels(ctx context.Context) ([]domain.ModelInfo, error)
   }
   ```
2. **Adapter Antigravity (`internal/ai/adapters/antigravity/adapter.go`)**:
   - Implementasikan `ListModels(ctx context.Context) ([]domain.ModelInfo, error)` dengan mengeksekusi `agy models` dan mem-parsing output baris demi baris (ID & Display Name).
   - Tambahkan field `model string` dan metode `SetConfig(model string)`.
   - Di `Generate()`, gunakan model yang dikonfigurasi jika `req.Model` kosong.
3. **Adapter OpenCode (`internal/ai/adapters/opencode/adapter.go`)**:
   - Implementasikan `ListModels(ctx context.Context) ([]domain.ModelInfo, error)` dengan menjalankan `opencode models` (CLI) atau `GET /models` (jika HTTP baseURL ada).
   - Di `generateCLI()`, teruskan flag `-m <model>` jika model terpilih valid.
4. **Adapter Gemini (`internal/ai/adapters/gemini/adapter.go`)**:
   - Implementasikan `ListModels(ctx context.Context) ([]domain.ModelInfo, error)` memanggil endpoint Google AI Studio jika API key terisi, atau fallback ke model populer (`gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-1.5-pro`).
5. **Agent Detector (`internal/ai/detector.go`)**:
   - Saat mendeteksi agent yang terinstal, panggil pembacaan model bawaan agar `AvailableModels` langsung terisi lengkap saat user membuka menu Settings.

### C. Service Layer (`internal/services/provider_service.go`)
1. Tambahkan metode:
   - `GetProviderModels(providerID string) ([]domain.ModelInfo, error)`: Untuk me-refresh model provider secara on-demand.
   - `ConfigureAntigravity(model string) error`: Menyimpan model aktif untuk Antigravity CLI ke database SQLite (`agy_model`).
2. Perbarui `restoreSettings()`:
   - Membaca `agy_model` dari SQLite dan menerapkannya ke `agyAdapter.SetConfig(agyModel)`.
3. Perbarui `GetProviderStatus()`:
   - Sertakan model aktif saat ini untuk setiap provider (`agy_model`, `opencode_model`, `gemini_model`).

### D. Frontend UI Layer (`frontend/src/App.tsx`)
1. **Pada Kartu Detected Agents (Settings -> Coding Agents & LLM)**:
   - Jika agent terinstal dan memiliki `available_models`:
     Tampilkan dropdown `<select>` langsung di kartu agent:
     `Pilih Model: [ gemini-3.8-flash-high (Gemini 3.8 Flash High) v ]`
   - Berikan badge jumlah model yang ditemukan (contoh: `6 models detected`).
2. **Pada Bagian Provider Configuration**:
   - **Antigravity CLI**:
     Tambahkan section konfigurasi model Antigravity dengan dropdown model hasil dari `agy models` + tombol "Refresh Models".
   - **OpenCode**:
     Ubah input text menjadi kombinasi `<select>` dari `opencode models` dan input manual (jika custom URL).
   - **Google Gemini**:
     Ganti input text dengan `<select>` model resmi Gemini + opsi custom.
3. **Pada Status Bar & Header**:
   - Tampilkan model yang sedang aktif di samping nama provider (misal: `Antigravity CLI (gemini-3.8-flash-high)`).

---

## 4. Rencana Pengujian & Verifikasi

1. **Uji CLI Parser**:
   - Verifikasi parsing output `agy models` menghasilkan 6 model akurat tanpa string `Fetching...`.
   - Verifikasi parsing output `opencode models` menghasilkan 12 model akurat.
2. **Uji Persistensi**:
   - Pilih model (misal `claude-sonnet-4-6` untuk agy), simpan, restart aplikasi, dan pastikan model tetap terpilih.
3. **Uji Eksekusi Subproses**:
   - Eksekusi generate dokumen atau chat, pastikan argumen `--model claude-sonnet-4-6` masuk ke command CLI.
4. **Uji Unit & Build**:
   - Jalankan seluruh suite tes Go: `go test -v ./internal/...`
   - Jalankan typecheck & build TypeScript frontend: `npm --prefix frontend run build`

---

## 5. Pertanyaan Konfirmasi Sebelum Eksekusi

Mohon konfirmasikan apakah Anda ingin kami langsung melanjutkan implementasi rencana ini:
1. **Lanjut implementasi penuh**: Terapkan deteksi model dinamis untuk Antigravity, OpenCode, dan Gemini lengkap dengan UI dropdown di Settings dan status bar.
2. **Ada penyesuaian khusus**: Misalnya ingin ada default model tertentu untuk masing-masing agent.
