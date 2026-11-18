# Changelog — Specra (AI Requirements Studio)

All notable changes to the Specra project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.4] — 2026-11-17

### Added
- **Kiro CLI (`kiro-cli`) Provider Adapter**: Added `internal/ai/adapters/kiro/adapter.go` implementing `AIProvider` and `ModelDiscoverer` with headless execution (`kiro-cli chat --no-interactive --output-format json --trust-all-tools`), dynamic model listing (`--list-models --format json`), workspace isolation (`cmd.Dir`), and optional `KIRO_API_KEY` storage in OS Keyring.
- **Kiro CLI Agent Detection & Diagnostics**: Registered `kiro-cli` in `internal/ai/detector.go`, `internal/security/pathenv.go` (`~/.kiro/bin`), `ProviderService`, and `RunDiagnostics` (`kiro_available`, `kiro_version`, `kiro_path`).
- **Settings UI Support for Kiro CLI**: Updated `Settings → Coding Agents & LLM` and `Diagnostics & Security` in `frontend/src/App.tsx` with `Kiro CLI (kiro-cli)` Primary/Fallback options, device agent model synchronization, and a dedicated Kiro CLI configuration card backed by regenerated Wails bindings (`ConfigureKiro`).

---

## [0.1.3] — 2026-11-16

### Added
- **Local Development Toolchain Audit & Setup**: Audited local workstation prerequisites against `Taskfile.yml` and `wails3 doctor`. Installed `go-task` (`v3.54.0`) and NSIS (`v3.13`) portable release into `%LOCALAPPDATA%\Programs\NSIS` and persistent User `PATH`.
- **Windows Packaging Support**: Augmented `internal/security/pathenv.go` with standard NSIS executable search directories, ensuring `makensis.exe` is dynamically resolved for `specra-installer.exe` packaging.
- **Developer Prerequisites Documentation**: Added comprehensive Windows & macOS local development prerequisites and setup commands to `docs/INSTALLATION.md`.

### Fixed
- **Windows Command Prompt Window Flashing**: Introduced `internal/executil` applying `CREATE_NO_WINDOW` (`0x08000000`) and `HideWindow: true` in `SysProcAttr` on Windows for all subprocess executions. Eliminated command prompt window flashing during app startup agent detection probes, model listing, and CLI AI generation.

---

## [0.1.2] — 2026-11-15

### Added
- **Left Sidebar Pipeline Hub**: Integrated the primary **Generate Full Pipeline** action button and active generating feedback card directly into the Left Sidebar under "Specifications & Pipeline", aligning document browsing with autonomous generation.
- **Project Co-Pilot Accordion Inspector**: Refactored the right sidebar into a single-expanded (mutually exclusive) 4-panel accordion (`Requirements Backlog`, `Questions & Clarifications`, `Assumptions & Constraints`, `Quality & Audit Findings`).
- **Independent Scroll Containers**: Each expanded accordion panel utilizes a dedicated `flex-1 min-h-0 overflow-y-auto` viewport, enabling smooth internal scrolling while keeping all accordion category headers accessible.

### Fixed
- **Linux Headless CI Build Failure**: Decoupled Wails desktop GUI dependencies from `internal/services/document_service.go` into a pure Go `DialogManager` interface. Resolved undefined pointer errors during GitHub Actions CI test runs on headless Linux runners.
- **Agent Detector CI Test Assertion**: Refactored `TestDetectInstalledCodingAgents` to validate contract and metadata integrity rather than hard-failing when optional coding CLIs (`agy`, `opencode`) are absent from clean CI runner environments.

---

## [0.1.1] — 2026-11-15

### Added
- **Dual-Track Language Preferences**: Decoupled Chat & Discovery Language (`chat_language`) from Document Specification Language (`doc_language`), allowing natural Indonesian conversation while producing standard English (IEEE 830) specifications, or vice-versa.
- **Centralized Agent & System Diagnostics**: Dedicated diagnostic inspector in Settings displaying exact binary paths, detected CLI versions, model counts, and evaluated system `$PATH` directories.
- **1-Click Copy Diagnostic Report**: Added a button to generate and copy a comprehensive markdown system diagnostic report to the clipboard for fast troubleshooting.
- **Open-Source Contributor Workflow**: Standardized Fork & Pull Request model (`CONTRIBUTING.md`), Pull Request Template (`.github/PULL_REQUEST_TEMPLATE.md`), and structured Issue Templates.
- **Automated Pull Request CI Pipeline**: GitHub Actions CI workflow (`.github/workflows/ci.yml`) automatically validating Go backend tests and frontend TypeScript builds for all incoming PRs.

### Changed
- **Streamlined Coding Agents Configuration**: Removed raw executable paths from main agent cards in the Coding Agents & LLM tab to keep the interface uncluttered, with a quick-action link to view detailed diagnostics.

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
- **macOS Application Icon**: Resolved legacy Wails "W" icon display on macOS by removing obsolete `Assets.car`, stripping `CFBundleIconName` from `Info.plist`, and compiling multi-resolution Apple-certified `icons.icns` with the Specra "S" monogram.
- **Desktop GUI PATH Environment**: Implemented dynamic login shell PATH resolution on app startup (`FixEnvironmentPath`), allowing autonomous coding agents (`agy`, `opencode`) to be reliably detected when launched from macOS Finder / Dock without terminal dependencies.
- **macOS Bundle Executable**: Corrected `CFBundleExecutable` in `Info.plist` from legacy `.exe` to `specra`, preventing LaunchServices missing executable errors on macOS.
- **Dynamic Coding Agent Discovery**: Auto-detect installed CLI agents (`agy`, `opencode`) upon settings open with upward-opening dropdowns preventing viewport clipping.
- **Outdated Status Clear**: Automatically clears `outdated` document status upon regeneration and synchronizes newest upstream context.
