# Engram

Engram is a human-owned memory protocol for AI agents. It keeps durable project, team, and personal knowledge in files that humans can inspect, review, sync, and repair.

Engram is not a hidden agent brain. The agent may propose memory, but the source of truth is approved Markdown under `.agents/.engram/` or an optional global memory folder.

## What Problem It Solves

AI agents forget project decisions, repeat setup questions, and mix old context with new instructions. Built-in memory is often private to one vendor, one app, or one machine.

Engram gives memory a stable contract:

- approved facts, rules, and workflows live as Markdown
- indexes and graphs make routing fast
- writes require human approval
- hashes reveal unsafe edits
- ignore rules protect private context
- profiles isolate company, client, and personal memory so external APIs or company-provided agents do not leak context across projects
- Git gives history, portability, and team review

## Mental Model

Think of Engram as a knowledge memory center:

| Layer | Job |
| --- | --- |
| Markdown | durable source of truth |
| JSON index | fast lookup layer |
| JSON graph | topic and relationship routing layer |
| Approval gate | trust boundary before writes |
| Hashes | integrity checks before reads |
| Ignore rules | privacy controls |
| Git | audit history and sync |
| Agent adapters | convenience, not authority |

## Scope Priority

Engram resolves memory in this order:

1. Workspace memory: `<project>/.agents/.engram/`
2. Global memory: `$ENGRAM_GLOBAL_DIR` or `engram inject --global-path <path>`

Workspace memory wins. Global memory is fallback for reusable preferences and team context across projects.

## Current Shape

Engram includes:

- `save` for one approved memory
- `save-session` / `ss` for several memories from a session, with optional `--query-level <n>` to mine up to n recent accessible chats; `/engram ss -a last 50 sessions` normalizes to `engram save-session --query-level 50 --accept-all`
- `observe` for raw notes that are not active memory yet
- `take-control` for importing existing agent guidance and docs
- `graph` and `quality-check` for review signals
- `archive` for wrong or superseded memory
- `repair` for invalid memory files skipped by index rebuild
- `benchmark` for retrieval regression checks
- agent skillsets, slash adapters, and MCP-style proposal tools

Before using commands, read the concept page: [Understand Engram](understanding.md).

Next: [AI-agent quickstart](quickstart.md).
