# Implementation Plan: Translate `AGENTS.md`, `docs/README.md`, and All Artifacts to English

## 1. Executive Summary & Objective

The user requested:
> **"/plan /docs nya diganti versi english ya artifact2nya.. di Agents.md nya juga"**  
> *(Translate `/docs` artifacts and `AGENTS.md` into English versions).*

With the root `README.md` and the entire Specra desktop application now localized into English, the project is ready for open-source and public repository visibility. However, the internal governance document (`AGENTS.md`), the documentation catalog (`docs/README.md`), and 35 planning/walkthrough artifacts in `docs/artifacts/` were historically written in Indonesian.

This plan details a systematic, high-fidelity translation across all documentation assets, standardizing the entire repository into clean, professional technical English while strictly preserving technical accuracy, Mermaid diagrams, code blocks, file paths, and testing verification results.

---

## 2. Inventory & Scope of Translation

### 2.1. Authoritative Guidelines
- **[`AGENTS.md`](./AGENTS.md)** (111 lines): Mandatory guidelines for AI agents & developers. Translating mission & identity, artifact synchronization protocol, 4 specialist personas & interconnected pipeline, approval gating rules, zero-mock policy, coding & architecture rules, and dev/testing commands.

### 2.2. Documentation Catalog
- **[`docs/README.md`](./docs/README.md)** (92 lines): Master directory overview, tree structure, and detailed descriptions for all 24+ numbered artifacts.

### 2.3. Artifacts in `docs/artifacts/` (35 files to translate)
Every file will be translated into technical English, keeping code snippets, diffs, tables, and Mermaid blocks intact:

1. `implementation_plan.md` (Phase 1 foundational plan)
2. `fix_bindings_and_verify.md` (Wails bindings fix)
3. `audit_prd_srs_compliance.md` (PRD & SRS compliance audit)
4. `ui_refinement_plan.md` (UI refinement plan)
5. `advance_ai_provider_and_ui_plan.md` (Multi-agent & AI provider plan)
6. `business_orchestration_plan.md` (4 Specialist personas & doc lifecycles)
7. `plan_mq_studio_design_system.md` (Design system adaptation)
8. `plan_general_settings_and_darkmode.md` (General settings & dark mode)
9. `plan_custom_skills_mcp_scoping_modal_scaling.md` (Custom skills & MCP scoping)
10. `plan_github_push_private_main.md` (GitHub remote push plan)
11. `plan_agents_rules_and_environment_continuity.md` (AGENTS.md & macOS dev continuity)
12. `plan_sidebar_two_lines_and_typography_refinement.md` (Sidebar typography refinement)
13. `plan_settings_modal_two_pane_refactor.md` (Settings modal two-pane master-detail)
14. `plan_workspace_and_canvas_experience_refactor.md` (Canvas empty state & 3-pane depth)
15. `plan_skills_ux_and_right_inspector_wiring.md` (Skills UX & Right Inspector interactivity)
16. `plan_agentic_modes_and_slash_commands.md` (Agentic interaction modes & slash commands)
17. `plan_agentic_pipeline_and_unified_console.md` (Unified console & Q&A loop)
18. `plan_mermaid_blocks_and_preview_mode.md` (Interactive Mermaid blocks & copy button)
19. `plan_specra_logo_and_icon.md` (Visual identity & SVG squircle icon)
20. `plan_specra_brand_and_icon_refinement.md` (Geometric wordmark & brand refinement)
21. `plan_review_and_sync_macos_updates.md` (macOS multi-device sync review)
22. `plan_opencode_json_fix_and_toon_tokenization.md` (OpenCode JSON fix & TOON tokenization)
23. `plan_decouple_mq_studio_and_fix_slash_scroll.md` (Decouple MQ-Studio & fix slash scroll)
24. `plan_adaptive_edge_scaling_and_viewport_containment.md` (4-edge viewport containment & HiDPI scaling)
25. `plan_fix_windows_cli_length_and_auto_pipeline.md` (Windows CLI length fix & Auto Pipeline)
26. `plan_dynamic_cli_model_detection.md` (Dynamic CLI model detection)
27. `plan_comprehensive_security_race_and_hydration_audit.md` (Security, race condition & hydration audit)
28. `plan_unified_copilot_assumptions_and_pipeline_ux.md` (Project Co-Pilot reconstruction & assumptions)
29. `plan_custom_toast_dialogs_and_native_export_ux.md` (Custom toast & native export UX)
30. `walkthrough_custom_toast_dialogs_and_native_export_ux.md` (Walkthrough for custom toast & export)
31. `plan_desktop_menubar_chat_first_split_and_resizable_panels.md` (Desktop Menu Bar, split view & resizable panels)
32. `walkthrough_desktop_menubar_chat_first_split_and_resizable_panels.md` (Walkthrough for desktop menu bar & panels)
33. `plan_fix_outdated_alert_clear_and_granular_doc_loading.md` (Outdated alert clear & granular loading)
34. `walkthrough_outdated_alert_clear_and_granular_loading.md` (Walkthrough for outdated alert & granular loading)
35. `walkthrough.md` (Comprehensive historical summary & testing table)

*(Note: The 4 recent artifacts `plan_public_repo_readme_and_security_audit.md`, `walkthrough_public_repo_readme_and_security_audit.md`, `plan_english_ui_localization.md`, and `walkthrough_english_ui_localization.md` are already in English).*

---

## 3. Translation Strategy & Quality Principles

1. **Terminology Consistency**:
   - `Kebutuhan` ➔ `Requirements`
   - `Pelacakan / Keterlacakan` ➔ `Traceability`
   - `Perencanaan` ➔ `Implementation Plan`
   - `Persetujuan / Gerbang` ➔ `Approval Gating`
   - `Persona Spesialis` ➔ `Specialist Personas`
   - `Draf Dokumen` ➔ `Draft Document`
   - `Riwayat Percakapan` ➔ `Conversation History / Transcripts`
2. **Preserve Formats & Code Blocks**:
   - All file links (`file:///...`), bash commands, go test commands, markdown headers, and Mermaid diagrams (`flowchart TD`, `sequenceDiagram`, etc.) will be preserved without syntax alteration.
3. **Execution Execution Batching**:
   - **Phase 1**: Translate `AGENTS.md` and `docs/README.md`.
   - **Phase 2**: Translate the 35 artifacts in `docs/artifacts/` using automated python translation workers ensuring no broken markdown syntax or links.
   - **Phase 3**: Run `go test -v ./internal/...` and `npm --prefix frontend run build` to verify zero regressions.
   - **Phase 4**: Create `walkthrough_translate_docs_and_agents_to_english.md`, update `docs/README.md`, commit, and push.

---

## 4. Verification Plan

1. **Language Scan**: Run automated regex scan on `docs/` and `AGENTS.md` confirming 0 untranslated Indonesian sections remain.
2. **Link Integrity**: Verify markdown links in `AGENTS.md`, `README.md`, and `docs/README.md` resolve accurately.
3. **Build & Tests**: Verify `go test -v ./internal/...` and `npm --prefix frontend run build` pass cleanly.

---

## 5. User Feedback & Next Steps

Please review this plan. Upon your confirmation (**`proceed`** or **`lanjut`**), execution will start immediately.
