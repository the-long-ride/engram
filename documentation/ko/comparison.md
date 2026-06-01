# Comparison, Pros, Cons, Roadmap

Engram은 human ownership, reviewability, portability를 최적화합니다.

## Strengths

- Markdown source of truth.
- Durable write 전 human approval.
- Git-native audit history와 sync.
- Workspace-first, global-fallback.
- Agent-agnostic.
- Safety layers: schema, secret scan, injection scan, hashes, ignore rules.
- daemon, database, cloud account 필수 아님.
- import, observe, archive, graph, benchmark, repair로 long-term maintenance 지원.

## Tradeoffs

- daemon 기반 시스템보다 덜 자동적입니다.
- 기본 search는 lexical이며 `search --semantic`은 로컬 deterministic similarity를 사용하고 semantic embedding-backed는 아닙니다.
- Graph vectors는 local hashed word vectors입니다.
- Contradiction detection은 heuristic/advisory입니다.
- `deduplicate --semantic`은 로컬 deterministic similarity를 사용하며 외부 embeddings에 의존하지 않습니다.
- Pattern mining, encryption config, PR workflow는 아직 full runtime workflow가 아닙니다.

## Agentmemory와 비교

[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory)는 coding agents용 automatic memory engine입니다. README는 server memory, MCP/hooks/REST, adapters, benchmarks, viewer, replay, hybrid retrieval, Hermes integration을 강조합니다.

automatic capture, replay, vector retrieval, many MCP tools가 필요하면 agentmemory가 좋습니다.

repo-readable protocol, Markdown-first, human-approved, Git-reviewed, server 없이 agent 간 portability가 필요하면 Engram이 맞습니다.

| Dimension | Engram | agentmemory |
| --- | --- | --- |
| Source | Approved Markdown | Memory server/store |
| Trust | Human A/B/C approval | Auto-capture + governance |
| Default | File protocol | Service recommended |
| Review | Git diff + Markdown | Viewer/API/sessions |
| Best fit | ownership/audit | automatic recall/replay |

## Built-In Agent Memory와 비교

내장 메모리는 편하지만 host에 묶입니다. Engram은 authority를 인간이 소유한 files에 둡니다.

## Roadmap

- Optional local embeddings.
- Clearer graph routing diagnostics.
- Versioned benchmark fixtures.
- Better contradiction review workflow.
- More agentmemory import variants.
- Optional external embedding provider for semantic dedupe.
- Repair that can propose fixes.
