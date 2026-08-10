---
title: Hermes Agent
sidebar_position: 6
description: Engram vs Hermes Agent — human-owned file protocol vs autonomous always-active memory.
---

# Hermes Agent

## TL;DR

| | Engram | Hermes Agent |
|---|---|---|
| **Philosophy** | Human-owned, file-first protocol (automation optional) | Autonomous, always-active memory |
| **Storage** | Typed Markdown files in `.agents/.engram/` | `MEMORY.md` + `USER.md` (hard char caps) |
| **Write model** | Human-approved by default (A/B/C gate; automatable via rules) | Agent writes autonomously |
| **Recall** | On-demand: `engram load "<task>"` injects relevant files | Always-on: core files frozen into system prompt each session |
| **Vector search** | Optional local sqlite-vec (deterministic, not embedding-backed) | Via external provider (e.g. agentmemory — BM25 + vector) |
| **Cross-agent** | Any file-reading agent can consume Engram memory | Hermes core is single-agent; cross-agent via agentmemory plugin |
| **Portability** | Git-native, offline-first, plain Markdown | Local files; external providers may add cloud lock-in |
| **Overhead** | No daemon, requires save discipline (unless automated) | Server process + viewer UI, REST API, MCP server |

## Storage formats

**Engram** stores each memory as a typed Markdown file with YAML frontmatter, hash integrity checks, and an optional dependency graph (`depends_on`). A JSON index, graph, and sqlite-vec sidecar act as acceleration layers — Markdown is the source of truth.

**Hermes** compresses all persistent memory into two bounded files:

- `~/.hermes/memories/MEMORY.md` — agent notes, capped at 2,200 characters
- `~/.hermes/memories/USER.md` — user profile, capped at 1,375 characters

Hard character limits force the agent to curate rather than accumulate. Session history is searchable via SQLite FTS5.

## Write model

**Engram** — explicit human gate by default. Agents propose candidates; a human must approve before anything lands on disk. Secret and prompt-injection scanning happen at save time. Users can opt to automate this process by saving a rule to automatically save new proposed memories when a response completes.

**Hermes** — autonomous. The agent decides what to write and when, constrained only by the character caps. No human approval in the core loop.

## Recall model

**Engram** — on-demand routing. `engram load "<task>"` reranks candidates by tags, type, recency, graph, and optional vector signals, then injects a compact pack (default: 8 files) into context.

**Hermes** — always-active injection. Core files are frozen into the system prompt at session start. An optional external provider (e.g. agentmemory) runs a prefetch before each LLM turn and syncs after.

## When to use which

**Use Engram** when you need auditable, human-reviewed memory; team sharing via Git; privacy guarantees; or agent-agnostic portability across tools (with the option to automate saves via custom rules).

**Use Hermes** when you want memory that accumulates automatically without save discipline, always-on context injection, or a richer runtime with viewers, REST API, and pluggable vector backends.

## Next steps

- [agentmemory](agentmemory.md)
- [Comparison overview](overview.md)
