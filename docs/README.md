# AI Requirements Studio — Project Artifacts & Context History

Folder ini menyimpan salinan lengkap seluruh dokumen perencanaan (*plans*), spesifikasi, audit, walkthrough hasil pengujian, serta riwayat konteks (*transcript logs*) dari sesi interaksi pengembangan **AI Requirements Studio**.

Seluruh aturan baku bagi AI Agent terkait sinkronisasi artefak dan riwayat percakapan diatur secara formal di:  
👉 **[`AGENTS.md`](../AGENTS.md)**

---

## 📁 Struktur Direktori

```
docs/
├── artifacts/
│   ├── implementation_plan.md                         # Rencana pondasi awal (Fase 1)
│   ├── fix_bindings_and_verify.md                     # Perbaikan Wails bindings
│   ├── audit_prd_srs_compliance.md                    # Audit kepatuhan PRD & SRS
│   ├── ui_refinement_plan.md                          # Rencana penyempurnaan UI
│   ├── advance_ai_provider_and_ui_plan.md             # Multi-agent & AI provider plan
│   ├── business_orchestration_plan.md                 # 4 Specialist personas & doc lifecycles
│   ├── plan_mq_studio_design_system.md                # Adaptasi design system MQ-Studio
│   ├── plan_general_settings_and_darkmode.md          # General settings & full dark mode
│   ├── plan_custom_skills_mcp_scoping_modal_scaling.md# Custom skills & MCP scoping
│   ├── plan_github_push_private_main.md               # Rencana push ke remote GitHub
│   ├── plan_agents_rules_and_environment_continuity.md# Aturan baku AI Agent & kontinuitas dev macOS
│   ├── plan_sidebar_two_lines_and_typography_refinement.md# Rencana sidebar 2-baris & typography refinement
│   ├── plan_settings_modal_two_pane_refactor.md       # Rekonstruksi Settings Modal Two-Pane Master-Detail
│   ├── plan_workspace_and_canvas_experience_refactor.md# Rekonstruksi Canvas Empty State, 3-Pane Depth, & Input Bar
│   ├── plan_skills_ux_and_right_inspector_wiring.md   # Refactor UX Skills Persona & Interaktivitas Right Inspector
│   ├── plan_agentic_modes_and_slash_commands.md       # Slash Commands (/plan dsb), Clarification Cards & Interaction Modes
│   ├── plan_agentic_pipeline_and_unified_console.md   # Unified Console, Pipeline Stepper & Interactive Q&A Loop
│   ├── plan_mermaid_blocks_and_preview_mode.md        # Blok Mermaid Interaktif, Visual Preview & Copy Button
│   ├── plan_specra_logo_and_icon.md                   # Identitas Visual, SVG App Icon & Wordmark specra
│   ├── plan_specra_brand_and_icon_refinement.md       # Refinement visualisasi Wordmark geometri & App Icon squircle
│   ├── plan_review_and_sync_macos_updates.md          # Review & sinkronisasi pembaruan multi-device macOS
│   ├── plan_opencode_json_fix_and_toon_tokenization.md# Fix respon JSON OpenCode & elaborasi TOON tokenization
│   ├── plan_decouple_mq_studio_and_fix_slash_scroll.md# Decoupling MQ-Studio & fix slash dropup auto-scroll
│   ├── plan_adaptive_edge_scaling_and_viewport_containment.md# Kunci 4 tepi viewport & fix pergeseran zoom HiDPI
│   ├── plan_fix_windows_cli_length_and_auto_pipeline.md# Fix limit argumen CLI Windows via stdin pipe & Auto Pipeline
│   ├── plan_dynamic_cli_model_detection.md            # Deteksi model dinamis CLI (agy, opencode, gemini) & model selector
│   ├── plan_comprehensive_security_race_and_hydration_audit.md # Audit security, race conditions, hydration/FOUC & E2E
│   └── walkthrough.md                                 # Rangkuman komprehensif & hasil testing
└── context_history/
    ├── transcript_01_windows.jsonl                    # Log riwayat sesi awal pengembangan di Windows (1.963 steps)
    └── transcript_02_macos.jsonl                      # Log riwayat sesi migrasi & setup dev di macOS
```

---

## 📑 Daftar Dokumen Utama

1. **[`AGENTS.md`](../AGENTS.md)**: Pedoman wajib AI Coding Agent, aturan zero-mock, dan SOP sinkronisasi artefak & riwayat.
2. **[`walkthrough.md`](./artifacts/walkthrough.md)**: Rangkuman arsitektur, perjalanan implementasi menyeluruh (Fase 1-11), dan tabel verifikasi hasil testing.
3. **[`plan_specra_logo_and_icon.md`](./artifacts/plan_specra_logo_and_icon.md)**: Rencana teknis Identitas Visual, SVG App Icon (512x512 squircle), Wordmark `specra`, dan regenerasi aset native desktop.
4. **[`plan_specra_brand_and_icon_refinement.md`](./artifacts/plan_specra_brand_and_icon_refinement.md)**: Refinement visualisasi Wordmark murni vektor geometri (single-story `a`, circular counters) & App Icon squircle (palet deep slate).
5. **[`plan_mermaid_blocks_and_preview_mode.md`](./artifacts/plan_mermaid_blocks_and_preview_mode.md)**: Rencana teknis Blok Mermaid Interaktif, Visual Preview SVG, Zoom/Pan, Code Toggle & One-Click Copy Button.
6. **[`plan_opencode_json_fix_and_toon_tokenization.md`](./artifacts/plan_opencode_json_fix_and_toon_tokenization.md)**: Analisis & perbaikan respon JSON mentah OpenCode CLI serta elaborasi format TOON untuk penghematan token 30%–60%.
7. **[`plan_decouple_mq_studio_and_fix_slash_scroll.md`](./artifacts/plan_decouple_mq_studio_and_fix_slash_scroll.md)**: Isolasi konteks AI dari MQ-Studio, auto-scroll dropup slash command, Export All Documents, pembersihan Q&A chat, dan adaptive HiDPI scaling.
8. **[`plan_adaptive_edge_scaling_and_viewport_containment.md`](./artifacts/plan_adaptive_edge_scaling_and_viewport_containment.md)**: Rencana teknis penguncian kontainer 4 tepi layar (*top, bottom, left, right*), eliminasi unit `w-screen`/`h-screen` viewport, isolasi scroll offset (0, 0), dan kalkulasi skala dua sumbu.
9. **[`plan_agentic_pipeline_and_unified_console.md`](./artifacts/plan_agentic_pipeline_and_unified_console.md)**: Rencana teknis Fase 12: Unified Prompt Console, Pipeline Stepper, Interactive Q&A Loop Cards, dan AI Readiness Recommender.
10. **[`plan_fix_windows_cli_length_and_auto_pipeline.md`](./artifacts/plan_fix_windows_cli_length_and_auto_pipeline.md)**: Perbaikan error batas panjang argumen CLI Windows (`The filename or extension is too long`) lewat stdin pipe & perancangan Autonomous Pipeline Orchestrator.
5. **[`plan_agentic_modes_and_slash_commands.md`](./artifacts/plan_agentic_modes_and_slash_commands.md)**: Rencana teknis Agentic Interaction Modes, Slash Commands System (/plan, /discovery, /exec, /prd), dan Interactive Clarification Cards dalam Chat Bubble.
6. **[`plan_skills_ux_and_right_inspector_wiring.md`](./artifacts/plan_skills_ux_and_right_inspector_wiring.md)**: Rencana teknis Skills UX Refinement (Dropdown per Persona) dan Interaktivitas Right Inspector (Requirements, Validation, Assumptions, Clarifications).
7. **[`plan_workspace_and_canvas_experience_refactor.md`](./artifacts/plan_workspace_and_canvas_experience_refactor.md)**: Rekonstruksi Canvas Empty State, Elevasi 3-Pane, Pill Tab Agen, dan Elevated Chat Input.
8. **[`plan_settings_modal_two_pane_refactor.md`](./artifacts/plan_settings_modal_two_pane_refactor.md)**: Rekonstruksi Settings Modal menjadi Two-Pane Master-Detail standar desktop.
9. **[`plan_sidebar_two_lines_and_typography_refinement.md`](./artifacts/plan_sidebar_two_lines_and_typography_refinement.md)**: Rencana ekspansi lebar sidebar ke 256px dan penataan typography 1 baris lega.
9. **[`plan_agents_rules_and_environment_continuity.md`](./artifacts/plan_agents_rules_and_environment_continuity.md)**: Rencana peresmian `AGENTS.md`, pemisahan transkrip riwayat per sesi, dan setup toolchain macOS.
10. **[`plan_custom_skills_mcp_scoping_modal_scaling.md`](./artifacts/plan_custom_skills_mcp_scoping_modal_scaling.md)**: Rencana teknis Custom Skill library, scoping MCP Server (Global vs Persona), dan modal upscaling.
11. **[`plan_general_settings_and_darkmode.md`](./artifacts/plan_general_settings_and_darkmode.md)**: Rencana implementasi General Settings, 3 color themes (Warm Stone, Obsidian Slate, System Auto), dan font scaling.
12. **[`plan_mq_studio_design_system.md`](./artifacts/plan_mq_studio_design_system.md)**: Adaptasi token styling dan layout shell ala MQ-Studio.
13. **[`business_orchestration_plan.md`](./artifacts/business_orchestration_plan.md)**: Spesifikasi orkestrasi 4 Specialist Personas (*Product Analyst*, *System Analyst*, *Software Architect*, *UI/UX Agent*).
