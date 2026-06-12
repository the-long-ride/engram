# Comparison, Pros, Cons, And Roadmap

Engram sits in a different part of the memory space than automatic memory engines. It optimizes for human ownership, reviewability, and portability.

## Engram Strengths

- Plain Markdown source of truth.
- Human approval before durable writes.
- Git-native audit history and sync.
- Workspace-first, global-fallback memory.
- Agent-agnostic: any agent can read Markdown.
- Safety layers: schema validation, secret scan, injection scan, hashes, ignore rules.
- No required daemon, database, or cloud account.
- Import, observe, archive, graph, benchmark, and repair flows support long-term maintenance.

## Engram Tradeoffs

- Less automatic than daemon-based memory systems.
- Default search is deterministic lexical search; `search --semantic` adds deterministic local similarity, not embedding-backed semantic search.
- Graph vectors are local hashed word vectors, not semantic embeddings.
- Contradiction detection is heuristic and advisory.
- `deduplicate --semantic` uses deterministic local similarity, not external embeddings.
- Pattern mining, encryption config, and PR workflow assets exist, but full runtime workflows are not wired yet.
- The graph depends on generated tags and summaries.

## Compared With Agentmemory

[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) is a powerful automatic memory engine for coding agents. Its README presents server-based memory, MCP/hooks/REST integration, many agent adapters, benchmark claims, a viewer, replay, hybrid retrieval, and Hermes integration.

Use agentmemory when you want automatic capture, live viewer/replay, vector retrieval, many MCP tools, and server-style shared memory.

Use Engram when you want memory to be a repo-readable protocol: Markdown first, human approved, Git reviewed, portable across agents even without a running server.

| Dimension | Engram | agentmemory |
| --- | --- | --- |
| Source of truth | Approved Markdown files | Memory server/store |
| Trust boundary | Human A/B/C approval | Automatic capture plus tool governance |
| Default mode | File protocol, no daemon required | Running service recommended |
| Review | Git diff and Markdown review | Viewer/API and stored sessions |
| Best fit | teams that need ownership and auditability | users who want automatic recall and replay |
| Risk | more manual discipline | more invisible state unless governed carefully |

## Compared With Hermes Agent

### TL;DR

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

---

### Storage formats

**Engram** stores each memory as a typed Markdown file with YAML frontmatter, hash integrity checks, and an optional dependency graph (`depends_on`). A JSON index, graph, and sqlite-vec sidecar act as acceleration layers — Markdown is the source of truth.

**Hermes** compresses all persistent memory into two bounded files:
- `~/.hermes/memories/MEMORY.md` — agent notes, capped at 2,200 characters
- `~/.hermes/memories/USER.md` — user profile, capped at 1,375 characters

Hard character limits force the agent to curate rather than accumulate. Session history is searchable via SQLite FTS5.

---

### Write model

**Engram** — explicit human gate by default. Agents propose candidates; a human must approve before anything lands on disk. Secret and prompt-injection scanning happen at save time. *(Note: Users can opt to automate this process by saving a rule to automatically save new proposed memories when a response completes, enabling an automated saving flow).*

**Hermes** — autonomous. The agent decides what to write and when, constrained only by the character caps. No human approval in the core loop.

---

### Recall model

**Engram** — on-demand routing. `engram load "<task>"` reranks candidates by tags, type, recency, graph, and optional vector signals, then injects a compact pack (default: 8 files) into context.

**Hermes** — always-active injection. Core files are frozen into the system prompt at session start. An optional external provider (e.g. agentmemory) runs a prefetch before each LLM turn and syncs after.

---

### When to use which

**Use Engram** when you need auditable, human-reviewed memory; team sharing via Git; privacy guarantees; or agent-agnostic portability across tools (with the option to automate saves via custom rules).

**Use Hermes** when you want memory that accumulates automatically without save discipline, always-on context injection, or a richer runtime with viewers, REST API, and pluggable vector backends.

## Compared With Built-In Agent Memory

Built-in agent memory is convenient, but often tied to one host. It can be hard to diff, export, review, or share with another agent.

Engram treats built-in memory as a convenience layer, not the authority. The authority remains files the human owns.

## Roadmap Ideas

- Optional local embedding provider for graph vectors and search.
- Better graph diagnostics explaining why a memory routed.
- Benchmark fixtures checked into the repo for regression tracking.
- Stronger contradiction review workflow combining graph, quality-check, and archive.
- More import tests for agentmemory export variants.
- Optional external embedding provider for semantic duplicate detection.
- Repair workflows that can propose fixes after reporting invalid memory files.

Next: back to [Home](index.md).
