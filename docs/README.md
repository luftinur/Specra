# Specra — Documentation & Engineering Architecture

Welcome to the technical documentation repository for **Specra (AI Requirements Studio)**.

All mandatory agent guidelines and development standards are formally specified in:  
👉 **[`AGENTS.md`](../AGENTS.md)**

---

## 📁 Directory Structure

```
docs/
├── ARCHITECTURE.md          # Living single source of truth for technical architecture
├── CHANGELOG.md             # Chronological release and milestone ledger
├── INSTALLATION.md          # Packaging, macOS DMG & Windows EXE installation guide
├── ACTIVE_RFC.md            # Ephemeral planning document for active feature work
├── context_history/         # Local transcript guidelines & session summaries
└── archive/
    └── v0.1.0/              # Archived planning artifacts from initial release development
```

---

## 📑 Core Document Catalog

1. **[`AGENTS.md`](../AGENTS.md)**: Authoritative developer & AI agent guidelines, Zero-Mock Policy, coding standards, and development commands.
2. **[`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)**: **Living Technical Specification**. Describes the codebase as it exists today (Go domain services, SQLite schema, React 19 split view, interactive Mermaid blocks, Zero-Mock AI adapters, and security sandboxing).
3. **[`docs/CHANGELOG.md`](./CHANGELOG.md)**: Chronological ledger of all completed feature milestones and version releases.
4. **[`docs/INSTALLATION.md`](./INSTALLATION.md)**: User installation guide for macOS (DMG drag-to-install & Gatekeeper bypass) and Windows (portable `.exe` and NSIS installer).
5. **[`docs/archive/v0.1.0/`](./archive/v0.1.0/)**: Complete archive of historical planning RFCs and audits from initial development.
