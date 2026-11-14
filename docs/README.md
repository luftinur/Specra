# Specra — Project Artifacts & Context History

This directory contains the complete archive of all engineering plans, specifications, audits, test walkthroughs, and serialized session transcripts generated during the development of **Specra (AI Requirements Studio)**.

All mandatory agent guidelines governing artifact synchronization and transcript logs are formally documented in:  
👉 **[`AGENTS.md`](../AGENTS.md)**

---

## 📁 Directory Structure

```
docs/
├── artifacts/
│   ├── implementation_plan.md                         # Foundation architecture plan (Phase 1)
│   ├── fix_bindings_and_verify.md                     # Wails v3 bindings refactor & verification
│   ├── audit_prd_srs_compliance.md                    # PRD & SRS section standard compliance audit
│   ├── ui_refinement_plan.md                          # UI refinement & component layout plan
│   ├── advance_ai_provider_and_ui_plan.md             # Multi-agent & AI provider execution plan
│   ├── business_orchestration_plan.md                 # 4 Specialist personas & doc lifecycle orchestration
│   ├── plan_mq_studio_design_system.md                # MQ-Studio design system adaptation
│   ├── plan_general_settings_and_darkmode.md          # General settings & full dark mode support
│   ├── plan_custom_skills_mcp_scoping_modal_scaling.md# Custom skill library & MCP server scoping
│   ├── plan_github_push_private_main.md               # GitHub repository setup & initial push
│   ├── plan_agents_rules_and_environment_continuity.md# AGENTS.md formalization & macOS continuity
│   ├── plan_sidebar_two_lines_and_typography_refinement.md# Sidebar width expansion & typography polish
│   ├── plan_settings_modal_two_pane_refactor.md       # Settings modal two-pane master-detail refactor
│   ├── plan_workspace_and_canvas_experience_refactor.md# Canvas empty state, 3-pane depth, & chat input bar
│   ├── plan_skills_ux_and_right_inspector_wiring.md   # Skills UX dropdown & right inspector interactivity
│   ├── plan_agentic_modes_and_slash_commands.md       # Slash commands (/plan, /exec), modes, & clarification cards
│   ├── plan_agentic_pipeline_and_unified_console.md   # Unified console, pipeline stepper, & Q&A loop
│   ├── plan_mermaid_blocks_and_preview_mode.md        # Interactive Mermaid diagrams, SVG preview, & copy button
│   ├── plan_specra_logo_and_icon.md                   # Brand visual identity, SVG app icon, & wordmark
│   ├── plan_specra_brand_and_icon_refinement.md       # Pure geometric wordmark & squircle app icon refinement
│   ├── plan_review_and_sync_macos_updates.md          # Multi-device macOS updates review & sync
│   ├── plan_opencode_json_fix_and_toon_tokenization.md# OpenCode raw JSON fix & TOON tokenization format
│   ├── plan_decouple_mq_studio_and_fix_slash_scroll.md# MQ-Studio context isolation & slash auto-scroll fix
│   ├── plan_adaptive_edge_scaling_and_viewport_containment.md# 4-edge viewport containment & HiDPI scaling
│   ├── plan_fix_windows_cli_length_and_auto_pipeline.md# Windows CLI command length stdin fix & auto-pipeline
│   ├── plan_dynamic_cli_model_detection.md            # Dynamic CLI model discovery (agy, opencode, gemini)
│   ├── plan_comprehensive_security_race_and_hydration_audit.md # Security audit, race conditions, hydration & E2E
│   ├── plan_unified_copilot_assumptions_and_pipeline_ux.md    # Right inspector (Project Co-Pilot) & assumption corrections
│   ├── plan_custom_toast_dialogs_and_native_export_ux.md     # In-app toast system, confirm modal, & native export
│   ├── walkthrough_custom_toast_dialogs_and_native_export_ux.md # Walkthrough: Toasts, confirm modal, & native export
│   ├── plan_desktop_menubar_chat_first_split_and_resizable_panels.md # Desktop menu bar, chat-first split view, & resizable panels
│   ├── walkthrough_desktop_menubar_chat_first_split_and_resizable_panels.md # Walkthrough: Menu bar, split view, & panel persistence
│   ├── plan_fix_outdated_alert_clear_and_granular_doc_loading.md # Outdated alert auto-clear & granular loading
│   ├── walkthrough_outdated_alert_clear_and_granular_loading.md # Walkthrough: Outdated alert cycle & granular loading
│   ├── plan_english_ui_localization.md                # Comprehensive English UI localization plan
│   ├── walkthrough_english_ui_localization.md         # Walkthrough: English UI localization verification
│   ├── plan_public_repo_readme_and_security_audit.md  # Product-focused root README & security credential audit
│   ├── walkthrough_public_repo_readme_and_security_audit.md # Walkthrough: Root README & clean security audit
│   ├── plan_translate_docs_and_agents_to_english.md   # Translation of AGENTS.md, docs catalog, & artifacts to English
│   ├── walkthrough_translate_docs_and_agents_to_english.md # Walkthrough: Complete translation of docs & AGENTS.md
│   └── walkthrough.md                                 # Comprehensive architecture summary & test results
└── context_history/
    ├── transcript_01_windows.jsonl                    # Initial Windows development session logs (1,963 steps)
    └── transcript_02_macos.jsonl                      # Migration & Mac development setup session logs
```

---

## 📑 Core Document Catalog

1. **[`AGENTS.md`](../AGENTS.md)**: Authoritative developer & AI agent guidelines, Zero-Mock Policy, and documentation protocols.
2. **[`walkthrough.md`](./artifacts/walkthrough.md)**: End-to-end architecture summary, implementation journey (Phases 1–11), and test verification table.
3. **[`plan_specra_logo_and_icon.md`](./artifacts/plan_specra_logo_and_icon.md)**: Technical design for brand visual identity, SVG app icon (512x512 squircle), `specra` wordmark, and native asset regeneration.
4. **[`plan_specra_brand_and_icon_refinement.md`](./artifacts/plan_specra_brand_and_icon_refinement.md)**: Refinement of geometric vector wordmark (single-story `a`, circular counters) and deep slate squircle icon.
5. **[`plan_mermaid_blocks_and_preview_mode.md`](./artifacts/plan_mermaid_blocks_and_preview_mode.md)**: Interactive Mermaid diagrams, SVG visual preview, zoom/pan controls, code toggle, and one-click copy.
6. **[`plan_opencode_json_fix_and_toon_tokenization.md`](./artifacts/plan_opencode_json_fix_and_toon_tokenization.md)**: OpenCode raw JSON streaming repair and TOON tokenization format delivering 30%–60% token savings.
7. **[`plan_decouple_mq_studio_and_fix_slash_scroll.md`](./artifacts/plan_decouple_mq_studio_and_fix_slash_scroll.md)**: Decoupling internal MQ-Studio context from AI prompts, slash command dropup auto-scroll, batch document export, and HiDPI scaling.
8. **[`plan_adaptive_edge_scaling_and_viewport_containment.md`](./artifacts/plan_adaptive_edge_scaling_and_viewport_containment.md)**: Four-edge viewport containment, removal of `w-screen`/`h-screen` viewport units, scroll offset isolation, and dual-axis scaling.
9. **[`plan_agentic_pipeline_and_unified_console.md`](./artifacts/plan_agentic_pipeline_and_unified_console.md)**: Phase 12 architecture: Unified prompt console, pipeline stepper, interactive Q&A loop cards, and AI readiness recommender.
10. **[`plan_fix_windows_cli_length_and_auto_pipeline.md`](./artifacts/plan_fix_windows_cli_length_and_auto_pipeline.md)**: Resolution of Windows command line length limits via stdin pipes and autonomous pipeline orchestrator design.
11. **[`plan_agentic_modes_and_slash_commands.md`](./artifacts/plan_agentic_modes_and_slash_commands.md)**: Agentic interaction modes, slash command system (`/plan`, `/discovery`, `/exec`, `/prd`), and interactive in-chat clarification cards.
12. **[`plan_skills_ux_and_right_inspector_wiring.md`](./artifacts/plan_skills_ux_and_right_inspector_wiring.md)**: Skills UX refinement (persona dropdown) and interactive right inspector (Requirements, Validation, Assumptions, Clarifications).
13. **[`plan_workspace_and_canvas_experience_refactor.md`](./artifacts/plan_workspace_and_canvas_experience_refactor.md)**: Canvas empty state reconstruction, 3-pane visual depth, agent pill tabs, and elevated chat input bar.
14. **[`plan_settings_modal_two_pane_refactor.md`](./artifacts/plan_settings_modal_two_pane_refactor.md)**: Two-pane master-detail settings modal adhering to desktop application standards.
15. **[`plan_sidebar_two_lines_and_typography_refinement.md`](./artifacts/plan_sidebar_two_lines_and_typography_refinement.md)**: Sidebar expansion to 256px and clean single-line typography layout.
16. **[`plan_agents_rules_and_environment_continuity.md`](./artifacts/plan_agents_rules_and_environment_continuity.md)**: Formalization of `AGENTS.md`, session-based transcript serialization, and macOS toolchain configuration.
17. **[`plan_custom_skills_mcp_scoping_modal_scaling.md`](./artifacts/plan_custom_skills_mcp_scoping_modal_scaling.md)**: Custom skill library architecture, MCP server scoping (Global vs Persona), and modal upscaling.
18. **[`plan_general_settings_and_darkmode.md`](./artifacts/plan_general_settings_and_darkmode.md)**: General settings implementation, 3 themes (Warm Stone, Obsidian Slate, System Auto), and typography scaling.
19. **[`plan_mq_studio_design_system.md`](./artifacts/plan_mq_studio_design_system.md)**: Adaptation of MQ-Studio styling tokens and shell layout.
20. **[`business_orchestration_plan.md`](./artifacts/business_orchestration_plan.md)**: Specification of 4 Specialist Personas (*Product Analyst*, *System Analyst*, *Software Architect*, *UI/UX Agent*).
21. **[`plan_unified_copilot_assumptions_and_pipeline_ux.md`](./artifacts/plan_unified_copilot_assumptions_and_pipeline_ux.md)**: UX reconstruction: Interactive assumption corrections, Project Co-Pilot sidebar, canvas-to-chat synchronization, and persona alignment.
22. **[`plan_custom_toast_dialogs_and_native_export_ux.md`](./artifacts/plan_custom_toast_dialogs_and_native_export_ux.md)**: Implementation of in-app toast notification system, custom confirmation modal, and native OS file/folder export dialog.
23. **[`walkthrough_custom_toast_dialogs_and_native_export_ux.md`](./artifacts/walkthrough_custom_toast_dialogs_and_native_export_ux.md)**: Verification of browser dialog replacement (`alert`, `confirm`, `prompt`) with toasts, confirm modal, and native export.
24. **[`plan_desktop_menubar_chat_first_split_and_resizable_panels.md`](./artifacts/plan_desktop_menubar_chat_first_split_and_resizable_panels.md)**: Chat-first desktop architecture: Desktop menu bar, side-by-side split view (chat + document canvas), context-aware auto-switching, and resizable panels.
25. **[`walkthrough_desktop_menubar_chat_first_split_and_resizable_panels.md`](./artifacts/walkthrough_desktop_menubar_chat_first_split_and_resizable_panels.md)**: Verification of desktop menu bar, chat-first split view, context-aware persona auto-switching, and localStorage panel persistence.
26. **[`plan_fix_outdated_alert_clear_and_granular_doc_loading.md`](./artifacts/plan_fix_outdated_alert_clear_and_granular_doc_loading.md)**: Comprehensive plan: Outdated status auto-clear upon regeneration, granular loading states, and prominent Regenerate All pipeline button.
27. **[`walkthrough_outdated_alert_clear_and_granular_loading.md`](./artifacts/walkthrough_outdated_alert_clear_and_granular_loading.md)**: Verification of outdated status auto-clear, granular document loading, and synchronized Regenerate All pipeline action.
28. **[`plan_english_ui_localization.md`](./artifacts/plan_english_ui_localization.md)**: Comprehensive English UI localization plan across all menus, canvas, modals, toasts, dropdowns, and validation audit rules.
29. **[`walkthrough_english_ui_localization.md`](./artifacts/walkthrough_english_ui_localization.md)**: Verification of full UI localization across desktop menu bar, document canvas, Project Co-Pilot, input console, and backend validation engine.
30. **[`plan_public_repo_readme_and_security_audit.md`](./artifacts/plan_public_repo_readme_and_security_audit.md)**: Product-focused root README architecture, pre-public repository security & credential audit, and .gitignore hardening.
31. **[`walkthrough_public_repo_readme_and_security_audit.md`](./artifacts/walkthrough_public_repo_readme_and_security_audit.md)**: Verification of product-focused root README, clean security audit across all git history, and MIT License application.
32. **[`plan_translate_docs_and_agents_to_english.md`](./artifacts/plan_translate_docs_and_agents_to_english.md)**: Comprehensive plan for translating AGENTS.md, docs catalog, and all historical documentation artifacts to professional technical English.
33. **[`walkthrough_translate_docs_and_agents_to_english.md`](./artifacts/walkthrough_translate_docs_and_agents_to_english.md)**: Walkthrough verifying complete translation of AGENTS.md, docs catalog, and all 35 historical documentation artifacts to professional technical English.
