# Comparison, Pros, Cons, Roadmap

Engram оптимизирован под human ownership, reviewability и portability.

## Strengths

- Markdown source of truth.
- Human approval before durable writes.
- Git-native audit history and sync.
- Workspace-first, global-fallback.
- Agent-agnostic.
- Safety layers: schema, secret scan, injection scan, hashes, ignore rules.
- No required daemon, database, or cloud account.
- Import, observe, archive, graph, benchmark, repair for long-term maintenance.

## Tradeoffs

- Less automatic than daemon-based systems.
- Default search is lexical; `search --semantic` uses deterministic local similarity, not embedding-backed semantic search.
- Graph vectors are local hashed word vectors.
- Contradiction detection is heuristic/advisory.
- `deduplicate --semantic` uses deterministic local similarity, no external embeddings.
- Pattern mining, encryption config, PR workflow are not full runtime workflows yet.

## Compared With Agentmemory

[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) is an automatic memory engine for coding agents. Its README emphasizes server memory, MCP/hooks/REST, adapters, benchmarks, viewer, replay, hybrid retrieval, and Hermes integration.

Use agentmemory for automatic capture, replay, vector retrieval, and many MCP tools.

Use Engram for a repo-readable protocol: Markdown first, human approved, Git reviewed, portable across agents without a server.

| Dimension | Engram | agentmemory |
| --- | --- | --- |
| Source | Approved Markdown | Memory server/store |
| Trust | Human A/B/C approval | Auto-capture + governance |
| Default | File protocol | Service recommended |
| Review | Git diff + Markdown | Viewer/API/sessions |
| Best fit | ownership/audit | automatic recall/replay |

## Compared With Built-In Agent Memory

Built-in memory is convenient but host-bound. Engram keeps authority in files the human owns.

## Roadmap

- Optional local embeddings.
- Clearer graph routing diagnostics.
- Versioned benchmark fixtures.
- Better contradiction review workflow.
- More agentmemory import variants.
- Optional external embedding provider for semantic dedupe.
- Repair that can propose fixes.
