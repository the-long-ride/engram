# Comparison, Pros, Cons, Roadmap

Engram は human ownership, reviewability, portability を重視します。

## Strengths

- Markdown source of truth.
- durable write 前の human approval.
- Git-native audit history と sync.
- Workspace-first, global-fallback.
- Agent-agnostic.
- Safety layers: schema, secret scan, injection scan, hashes, ignore rules.
- daemon, database, cloud account が必須ではない。
- import, observe, archive, graph, benchmark, repair で long-term maintenance。

## Tradeoffs

- daemon-based memory systems より自動化は弱い。
- 現在の search は lexical で、semantic embedding-backed ではない。
- Graph vectors は local hashed word vectors。
- Contradiction detection は heuristic/advisory。
- `deduplicate --semantic` はローカル deterministic similarity を使い、外部 embeddings に依存しません。
- Pattern mining, encryption config, PR workflow はまだ full runtime workflow ではない。

## Agentmemory との比較

[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) は coding agents 向け automatic memory engine です。README は server memory, MCP/hooks/REST, adapters, benchmarks, viewer, replay, hybrid retrieval, Hermes integration を強調しています。

automatic capture, replay, vector retrieval, many MCP tools が必要なら agentmemory。

repo-readable protocol, Markdown-first, human-approved, Git-reviewed, server なしの agent portability が必要なら Engram。

| Dimension | Engram | agentmemory |
| --- | --- | --- |
| Source | Approved Markdown | Memory server/store |
| Trust | Human A/B/C approval | Auto-capture + governance |
| Default | File protocol | Service recommended |
| Review | Git diff + Markdown | Viewer/API/sessions |
| Best fit | ownership/audit | automatic recall/replay |

## Built-In Agent Memory との比較

内蔵 memory は便利ですが host に閉じがちです。Engram は authority を人間が所有する files に置きます。

## Roadmap

- Optional local embeddings.
- Clearer graph routing diagnostics.
- Versioned benchmark fixtures.
- Better contradiction review workflow.
- More agentmemory import variants.
- Optional external embedding provider for semantic dedupe.
- Repair that can propose fixes.
