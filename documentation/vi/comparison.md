# So Sanh, Uu Nhuoc Diem, Va Roadmap

Engram nam o mot vung khac voi cac automatic memory engine. No toi uu cho quyen so huu cua con nguoi, reviewability va portability.

## Diem Manh Cua Engram

- Markdown la source of truth.
- Human approval truoc moi durable write.
- Git-native audit history va sync.
- Workspace-first, global-fallback memory.
- Agent-agnostic: agent nao cung doc duoc Markdown.
- Safety layers: schema validation, secret scan, injection scan, hashes, ignore rules.
- Khong bat buoc daemon, database, hay cloud account.
- Import, observe, archive, graph, benchmark va repair giup maintenance dai han.

## Tradeoffs

- It tu dong hon cac he thong daemon-based.
- Search hien tai la lexical deterministic, chua co embedding-backed semantic search.
- Graph vectors la hashed word vectors cuc bo, khong phai semantic embeddings.
- Contradiction detection la heuristic va chi advisory.
- `deduplicate --semantic` chua implement.
- Pattern mining, encryption config va PR workflow assets da co, nhung full runtime workflow chua wire.
- Graph phu thuoc vao tags va summaries sinh ra.

## So Voi Agentmemory

[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) la automatic memory engine manh cho coding agents. README cua no nhan manh server-based memory, MCP/hooks/REST integration, nhieu adapter, benchmark, viewer, replay, hybrid retrieval va Hermes integration.

Dung agentmemory khi ban muon automatic capture, live viewer/replay, vector retrieval, nhieu MCP tools va shared memory kieu server.

Dung Engram khi ban muon memory la protocol doc duoc trong repo: Markdown truoc, human approved, Git reviewed, portable qua nhieu agent ngay ca khi khong co server.

| Chieu | Engram | agentmemory |
| --- | --- | --- |
| Source of truth | Markdown da duyet | Memory server/store |
| Trust boundary | Human A/B/C approval | Auto-capture + tool governance |
| Default mode | File protocol, khong can daemon | Nen chay service |
| Review | Git diff va Markdown review | Viewer/API va stored sessions |
| Hop voi | teams can ownership va auditability | users can automatic recall va replay |
| Rui ro | can discipline thu cong hon | de co invisible state neu governance yeu |

## So Voi Built-In Agent Memory

Built-in memory tien, nhung thuong bi khoa trong mot host. Kho diff, export, review, hoac share voi agent khac.

Engram xem built-in memory la convenience layer, khong phai authority. Authority van la file con nguoi so huu.

## Roadmap

- Optional local embedding provider cho graph vectors va search.
- Graph diagnostics ro hon: vi sao memory duoc route.
- Benchmark fixtures trong repo de theo doi regression.
- Workflow review contradiction ket hop graph, quality-check va archive.
- Them test import cho nhieu bien the agentmemory export.
- Semantic duplicate detection khi embeddings duoc cau hinh.
- Repair workflow co the de xuat fix sau khi report invalid memory files.

Tiep theo: quay lai [Home](index.md).

