# Changelog — Specra (AI Requirements Studio)

All notable changes to the Specra project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-11-15

### Added
- **Specra Brand Identity**: All-lowercase geometric neo-grotesk wordmark (`specra`), 512x512 squircle macOS/Windows app icon monogram, and native multi-resolution assets (`icons.icns`, `icon.ico`).
- **Interactive Mermaid Code Blocks**: Markdown diagram renderer with tabbed **Preview Mode** (SVG live rendering via Mermaid 11), **Code Mode**, 1-click **Copy Syntax**, and full-screen modal expansion.
- **Project Co-Pilot Sidebar**: Unified 3-tab inspector (Requirements Backlog, Interactive Questions & Assumptions with inline edit/save, and 5-stage Pipeline Stepper).
- **Chat-First Split View**: Dual-pane layout featuring real-time conversational timeline and document canvas with resizable divider and localStorage persistence.
- **Desktop Menu Bar**: Native in-app menu bar (`File`, `Edit`, `View`, `Documents`, `Agents`, `Help`) with keyboard shortcuts.
- **Settings / Configuration Refinement**: Moved settings access to ergonomic left sidebar footer button with gear icon and universal global shortcut (`Ctrl+,` / `⌘,`), cleaning up titlebar.
- **4 Specialist Personas**: Upstream-to-downstream context inheritance pipeline (*Product Analyst*, *System Analyst*, *Software Architect*, *UI/UX Agent*) with IEEE 830 compliance and approval gating.
- **Pure Real AI Execution**: Zero-Mock Policy with Antigravity CLI (`agy`), OpenCode CLI (`opencode`), and Google Gemini 1.5/2.5 REST API support.
- **Cross-Platform Packaging & Release Pipeline**:
  - macOS Disk Image (`specra.dmg`) and bundle (`Specra.app`).
  - Windows standalone portable (`specra.exe`) and NSIS installer (`specra-installer.exe`).
  - Automated GitHub Actions release workflow (`.github/workflows/release.yml`).
  - Distribution guide (`docs/INSTALLATION.md`).

### Fixed
- **macOS Bundle Executable**: Corrected `CFBundleExecutable` in `Info.plist` from legacy `.exe` to `specra`, preventing LaunchServices missing executable errors on macOS.
- **Dynamic Coding Agent Discovery**: Auto-detect installed CLI agents (`agy`, `opencode`) upon settings open with upward-opening dropdowns preventing viewport clipping.
- **Outdated Status Clear**: Automatically clears `outdated` document status upon regeneration and synchronizes newest upstream context.
