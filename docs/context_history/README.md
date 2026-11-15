# Context History & Transcripts

Raw machine conversation logs (`.jsonl`) generated during AI coding agent sessions are stored locally in:
`~/.gemini/antigravity-cli/brain/<conversation-id>/.system_generated/logs/transcript.jsonl`

To prevent multi-megabyte machine logs from bloating the Git repository and consuming bandwidth, `.jsonl` files are ignored by Git. High-level architectural milestones and decisions are formally tracked in:
- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) (Living Architecture Reference)
- [`docs/CHANGELOG.md`](../CHANGELOG.md) (Milestone History)
