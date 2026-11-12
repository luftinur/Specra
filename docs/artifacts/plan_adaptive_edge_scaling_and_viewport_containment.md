# Implementation Plan: Adaptive 4-Edge Viewport, Chat Text Selection, and OpenCode Response Normalization

## 1. Goal Description

Rencana ini menangani tiga kebutuhan utama yang disampaikan pengguna:
1. **Adaptive 4-Edge Viewport Containment & HiDPI Scaling Fix**:
   - Menghilangkan penyebab pergeseran jendela (*off-screen shift*) saat zoom aktif dengan mengeliminasi unit `w-screen` (`100vw`) dan `h-screen` (`100vh`).
   - Mengunci kontainer shell (`#root`, `body`, `.m3`) dengan `position: fixed; inset: 0; width: 100%; height: 100%;` agar ke-4 tepi (*top, bottom, left, right*) selalu menempel presisi di batas jendela native tanpa terpotong atau overflow.
   - Mengunci koordinat scroll dokumen ke `(0, 0)` secara konsisten.
2. **Chat Text Selection (Dapat Menyeleksi Teks Chat)**:
   - Menghapus kelas `select-none` global pada elemen root `.m3`.
   - Mengisolasi `select-none` hanya pada area kontrol chrome (TitleBar, Sidebar items, Tabs).
   - Menambahkan kelas `select-text` (`user-select: text`) secara eksplisit pada bubble chat (pesan pengguna, jawaban asisten AI, dan Markdown viewer), sehingga teks obrolan dapat diblok/diseleksi dengan kursor layaknya aplikasi chat modern (ChatGPT, Claude, Slack).
3. **OpenCode CLI Response Normalization (Respon Berbentuk Chat Bersih, Bukan JSON Mentah)**:
   - OpenCode CLI (`opencode run --format json`) menghasilkan format *newline-delimited JSON (NDJSON)* atau objek bertingkat (`{"type":"text","part":{"text":"..."}}`).
   - Parser adapter saat ini gagal mem-parse format multi-event NDJSON sehingga fallback mengembalikan seluruh raw JSON string ke dalam chat bubble.
   - Memperbaiki parser OpenCode adapter untuk mengekstrak teks asli dari NDJSON/part event, serta memperkuat `ParseDiscoveryOutput` agar mengekstrak percakapan `reply` yang ramah pengguna ke dalam chat bubble dan memisahkan entitas requirements/clarifications ke database & inspector.

---

## 2. User Review Required

> [!IMPORTANT]
> **Kepastian Tata Letak & Interaksi**:
> - **Seleksi Teks**: Teks di seluruh bubble chat dan dokumen spesifikasi kini dapat diseleksi, di-copy, atau di-highlight dengan kursor mouse secara bebas.
> - **Keutuhan 4 Tepi Layar**: Titlebar di atas, sidebar di kiri, inspector di kanan, dan prompt bar di bawah tidak akan pernah terdorong keluar layar saat mengubah zoom (Auto HiDPI, 90%–125%, `Ctrl +`, `Ctrl -`).
> - **Respon OpenCode**: Respon dari coding agent `opencode` akan tampil sebagai pesan chat natural berformat Markdown, bukan blok kode JSON mentah.

---

## 3. Proposed Changes

### A. Frontend Stylesheet & Root Shell ([`frontend/src/index.css`](file:///E:/dev-agent-assistant/frontend/src/index.css) & [`frontend/src/App.tsx`](file:///E:/dev-agent-assistant/frontend/src/App.tsx))

#### [MODIFY] `frontend/src/index.css`
- Ganti `height: 100vh; width: 100%;` menjadi `position: fixed; inset: 0; width: 100%; height: 100%; max-width: 100%; max-height: 100%; overflow: hidden;`.
- Tambahkan aturan seleksi teks pada chat:
```css
.select-text, .select-text * {
  user-select: text !important;
  -webkit-user-select: text !important;
}
```

#### [MODIFY] `frontend/src/App.tsx`
- **Baris 1513**:
  Ganti:
  `<div className="m3 flex flex-col h-screen w-screen overflow-hidden text-fg select-none">`
  Menjadi:
  `<div className="m3 flex flex-col w-full h-full overflow-hidden text-fg">` (menghapus `select-none` dari root, `w-screen`, dan `h-screen`).
- **Baris 2095–2117 (Chat Bubbles)**:
  Tambahkan kelas `select-text` pada bubble user dan bubble assistant:
  ```tsx
  <div className="max-w-[75%] rounded-[8px] px-3.5 py-2.5 bg-fill text-fg border border-border/60 leading-relaxed whitespace-pre-wrap shadow-2xs text-[13px] select-text">
    {m.content}
  </div>
  ...
  <div className="leading-relaxed text-fg-2 text-[13px] select-text">
    <MarkdownViewer content={m.content} isDark={isCurrentDark} />
  </div>
  ```
- **Kunci Scroll Koordinat ke (0, 0)**:
  Tambahkan fungsi reset scroll pada `applyFontScale`, event listener `resize`, dan event listener global `scroll`:
  ```ts
  window.scrollTo(0, 0);
  document.documentElement.scrollLeft = 0;
  document.documentElement.scrollTop = 0;
  document.body.scrollLeft = 0;
  document.body.scrollTop = 0;
  ```

---

### B. HiDPI Scaling Two-Axis Fit ([`frontend/src/lib/uiScale.ts`](file:///E:/dev-agent-assistant/frontend/src/lib/uiScale.ts))

#### [MODIFY] `frontend/src/lib/uiScale.ts`
- Gunakan kalkulasi rasio dua sumbu (*Two-Axis Fit*):
  ```ts
  const DESIGN_WIDTH = 1200;
  const DESIGN_HEIGHT = 800;

  export function getAdaptiveZoomFactor(width: number, height: number): number {
    const fit = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    if (fit >= 1.25) return 1.15;
    if (fit >= 1.10) return 1.08;
    if (fit >= 1.00) return 1.00;
    return Math.max(0.90, Number(fit.toFixed(2)));
  }
  ```

---

### C. OpenCode CLI Output Extraction ([`internal/ai/adapters/opencode/adapter.go`](file:///E:/dev-agent-assistant/internal/ai/adapters/opencode/adapter.go))

#### [MODIFY] `internal/ai/adapters/opencode/adapter.go`
- Perbaiki `generateCLI` untuk mendukung ekstraksi multi-line NDJSON dan nested parts dari OpenCode v2:
  ```go
  // Parse single JSON or NDJSON event stream from opencode run
  lines := strings.Split(content, "\n")
  var accumulated strings.Builder
  for _, line := range lines {
      line = strings.TrimSpace(line)
      if line == "" {
          continue
      }
      var ev struct {
          Type string `json:"type"`
          Text string `json:"text"`
          Part struct {
              Text string `json:"text"`
          } `json:"part"`
          Content string `json:"content"`
          Message string `json:"message"`
      }
      if err := json.Unmarshal([]byte(line), &ev); err == nil {
          if ev.Part.Text != "" {
              accumulated.WriteString(ev.Part.Text)
          } else if ev.Text != "" {
              accumulated.WriteString(ev.Text)
          } else if ev.Content != "" {
              accumulated.WriteString(ev.Content)
          } else if ev.Message != "" {
              accumulated.WriteString(ev.Message)
          }
      }
  }
  if accumulated.Len() > 0 {
      content = accumulated.String()
  }
  ```
- Jika OpenCode mengembalikan output berformat JSON terstruktur yang membungkus teks percakapan, adapter memastikan teks diekstrak bersih sebelum dikirimkan ke `conversation_service`.

---

### D. Chat Discovery Parsing Robustness ([`internal/ai/discovery.go`](file:///E:/dev-agent-assistant/internal/ai/discovery.go))

#### [MODIFY] `internal/ai/discovery.go`
- Perluas `ParseDiscoveryOutput` agar jika output AI berupa objek JSON umum dengan atribut `content`, `text`, `message`, atau `reply`, nilainya otomatis dijadikan sebagai percakapan chat `Reply`:
  ```go
  // Fallback extraction for general LLM JSON responses:
  var genericMap map[string]any
  if err := json.Unmarshal([]byte(jsonCandidate), &genericMap); err == nil {
      if reply, ok := genericMap["reply"].(string); ok && reply != "" {
          braceRes.Reply = reply
      } else if msg, ok := genericMap["message"].(string); ok && msg != "" {
          braceRes.Reply = msg
      } else if text, ok := genericMap["content"].(string); ok && text != "" {
          braceRes.Reply = text
      }
  }
  ```
- Menjamin chat bubble pengguna hanya menampilkan teks percakapan natural dan tidak pernah menampilkan kurung kurawal `{ ... }` mentah.

---

## 4. Verification Plan

### Automated Tests
1. **Backend Unit & Parser Tests**:
   ```bash
   go test -v ./internal/ai/...
   go test -v ./internal/services/...
   ```
   *Ekspektasi: Unit test untuk NDJSON OpenCode, TOON tokenization, dan Discovery parser lolos 100%.*
2. **Frontend Build Verification**:
   ```bash
   cd frontend && npm run build
   ```
   *Ekspektasi: 0 error TypeScript.*

### Manual Verification
1. **Verifikasi Seleksi Teks**:
   - Blok teks chat bubble asisten AI dan user dengan kursor mouse -> Pastikan teks dapat disorot dan disalin dengan `Ctrl + C`.
2. **Verifikasi 4 Tepi Adaptif**:
   - Ganti skala ke `Auto (Adaptive HiDPI)`, `115%`, `125%` di Settings -> Pastikan Logo di pojok kiri atas, Window Controls di kanan atas, Sidebar di kiri, dan Chat bar di bawah tetap tampak utuh tanpa pergeseran.
3. **Verifikasi OpenCode CLI**:
   - Kirim pesan di Chat Discovery saat provider OpenCode aktif -> Pastikan respon yang muncul di bubble berupa pesan chat teks Markdown yang rapi, bukan JSON mentah.
