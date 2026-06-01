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
