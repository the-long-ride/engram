---
title: Comparison overview
sidebar_position: 1
description: How Engram compares to built-in agent memory, agentmemory, Obsidian, Tolaria, and Hermes Agent.
---

# Comparison overview

Engram sits in a different part of the memory space than automatic memory engines. It optimizes for human ownership, reviewability, and portability.

## Engram strengths

- Plain Markdown source of truth.
- Human approval before durable writes.
- Git-native audit history and sync.
- Workspace-first, global-fallback memory.
- Agent-agnostic: any agent can read Markdown.
- Safety layers: schema validation, secret scan, injection scan, hashes, ignore rules.
- No required daemon, database, or cloud account.
- Import, observe, archive, graph, benchmark, and repair flows support long-term maintenance.

## Engram tradeoffs

- Less automatic than daemon-based memory systems.
- Default search is deterministic lexical search; `search --semantic` adds deterministic local similarity, not embedding-backed semantic search.
- Graph vectors are local hashed word vectors, not semantic embeddings.
- Contradiction detection is heuristic and advisory.
- `deduplicate --semantic` uses deterministic local similarity, not external embeddings.
- Pattern mining, encryption config, and PR workflow assets exist, but full runtime workflows are not wired yet.
- The graph depends on generated tags and summaries.

## Roadmap ideas

- Optional local embedding provider for graph vectors and search.
- Better graph diagnostics explaining why a memory routed.
- Benchmark fixtures checked into the repo for regression tracking.
- Stronger contradiction review workflow combining graph, quality-check, and archive.
- More import tests for agentmemory export variants.
- Optional external embedding provider for semantic duplicate detection.
- Repair workflows that can propose fixes after reporting invalid memory files.

## Next steps

- [Built-in agent memory](built-in-memory.md)
- [agentmemory](agentmemory.md)
- [Obsidian](obsidian.md)
- [Tolaria](tolaria.md)
- [Hermes Agent](hermes-agent.md)
