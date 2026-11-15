# Implementation Plan: Push Specra to GitHub (Private, Branch `main`)

Technical planning document for Git repository initialization, `.gitignore` hygiene configuration, initial commit creation, and pushing source code to GitHub on branch `main`.

---

## 1. Goal Description

Persist the entire codebase of **Specra (AI Requirements Studio)** (Go backend + Wails v3, React/TypeScript frontend, specification documentation, and `docs/artifacts`) to the user's private GitHub repository with the following configuration:
- **Visibility:** Private
- **Default Branch:** `main`
- **Clean Hygiene:** Ensure binary outputs (`bin/*.exe`), `node_modules`, SQLite runtime databases, and temporary files are excluded.

---

## 2. User Review & Decision Workflow

> [!IMPORTANT]
> **GitHub Repository Setup:**
> - **Option 1 (Recommended):**
>   1. Navigate to [github.com/new](https://github.com/new) in browser.
>   2. Set repository name (e.g. `Specra` or `dev-agent-assistant`).
>   3. Select **Private**.
>   4. Leave *"Add a README file"*, *"Add .gitignore"*, and *"Choose a license"* unchecked.
>   5. Provide remote URL: `https://github.com/<username>/Specra.git`.
> - **Option 2 (Using GitHub CLI):**
>   Install `gh` via `winget install --id GitHub.cli`, authenticate via `gh auth login`, and create private repo via CLI.

> [!NOTE]
> **Reference Directory `_ref_ui/`:**
> Ignored in `.gitignore` to keep repository lightweight and strictly focused on core application code.

---

## 3. Proposed Changes & Steps

### 1. `.gitignore` Hardening
Ensure [`.gitignore`](file:///E:/dev-agent-assistant/.gitignore) contains:
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

# Reference UI Assets
_ref_ui/
```

---

### 2. Git Initialization & Local Commit
Execute sequential Git commands in workspace:
```powershell
# 1. Initialize repository with main branch
git init -b main

# 2. Stage all source code & documentation
git add .

# 3. Create initial commit
git commit -m "feat: initial commit AI Requirements Studio desktop app (Wails v3 + React + Specialist Agents)"
```

---

### 3. Remote Configuration & Push
```powershell
# 1. Add GitHub remote
git remote add origin <URL_GITHUB_REPO>

# 2. Ensure branch is main
git branch -M main

# 3. Push to remote
git push -u origin main
```

---

## 4. Verification Plan

### Automated Verification
```powershell
git status
git remote -v
git log -1 --stat
git branch -vv
```

### Manual Verification
- Open repository URL on GitHub to verify source files, specification documents, and `docs/artifacts/` are pushed to `main`.
