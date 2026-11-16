# Specra — Installation & Distribution Guide

This guide provides step-by-step instructions for installing and running **Specra (AI Requirements Studio)** on macOS and Windows.

---

## 🍎 macOS Installation

### Option 1: Via `.dmg` (Disk Image)
1. Download **`specra.dmg`** from the [GitHub Releases](https://github.com/luftinurfahmi/dev-agent-assistant/releases) page.
2. Double-click `specra.dmg` to mount the volume.
3. Drag **Specra.app** into your **Applications** folder.
4. Eject the disk image.

### First-Time Launch (Handling macOS Gatekeeper)
Because Specra is distributed as an independent developer tool without an Apple Developer ID signature ($99/year), macOS Gatekeeper will present a security prompt upon first opening:
> *"Specra cannot be opened because the developer cannot be verified."*

**To open Specra for the first time:**
- **Method A (GUI)**:
  1. Open your **Applications** folder in Finder.
  2. **Right-click** (or `Control` + Click) on **Specra**.
  3. Select **Open** from the context menu.
  4. In the dialog that appears, click **Open**. (You only need to do this once).
- **Method B (Terminal command)**:
  Run the following command once:
  ```bash
  xattr -cr /Applications/Specra.app
  ```
  Then launch Specra normally from Launchpad or Spotlight.

---

## 🪟 Windows Installation

### Option 1: Standalone Portable (`specra.exe`)
1. Download **`specra.exe`** from GitHub Releases.
2. Place `specra.exe` in any folder of your choice (e.g., `C:\Tools\Specra\` or Desktop).
3. Double-click `specra.exe` to launch immediately.
   - *Zero installation required: All SQLite databases and workspaces are maintained locally under `workspaces/`.*

### Option 2: Setup Wizard Installer (`specra-installer.exe`)
1. Download **`specra-installer.exe`**.
2. Run the installer to setup Start Menu and Desktop shortcuts.
3. Launch Specra from your Windows Start Menu.

---

## ⚙️ AI Provider Setup (Local-First & Zero-Mock)

Specra strictly enforces a **Zero-Mock Policy**. It executes against real AI providers on your system:
1. **Antigravity CLI (`agy`)**: Ensure `agy` is installed and accessible in your system `PATH`.
2. **OpenCode CLI (`opencode`)**: Ensure `opencode` is installed in `PATH`.
3. **Google Gemini REST API**: Open **Settings / Configuration** (`Ctrl+,` or `⌘,`), navigate to **Provider & LLMs**, and enter your Google Gemini API key. API keys are stored encrypted via OS Keyring (macOS Keychain / Windows Credential Manager).

---

## 🛠️ Local Development & Build Prerequisites

To build, test, and package Specra from source, verify the following prerequisites:

### Common Requirements (macOS & Windows)
- **Go**: 1.24+ (tested on Go 1.27.x)
- **Node.js**: 20+ (tested on Node 24.x & npm 11.x)
- **Wails v3 CLI**: `go install github.com/wailsapp/wails/v3/cmd/wails3@latest`
- **Task Runner (`task`)**: `go install github.com/go-task/task/v3/cmd/task@latest`

### Windows Build & Packaging Tools
- **NSIS (Nullsoft Install System)**: Required for building `specra-installer.exe`:
  ```powershell
  winget install NSIS.NSIS
  # Or download portable zip and place in %LOCALAPPDATA%\Programs\NSIS
  ```
- **Windows WebView2 Runtime**: Pre-installed on Windows 10/11; auto-detected by Wails.
- **Diagnostics Check**:
  ```powershell
  wails3 doctor
  ```
