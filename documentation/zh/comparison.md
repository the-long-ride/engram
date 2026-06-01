# 对比、优缺点与路线图

Engram 优化的是人类所有权、可审查性和可移植性。

## 优点

- Markdown 是事实来源。
- 持久写入前需要人类批准。
- Git 原生日志和同步。
- Workspace-first, global-fallback。
- 与 agent 无关。
- 安全层：schema、secret scan、injection scan、hashes、ignore rules。
- 不强制 daemon、database 或 cloud account。
- import、observe、archive、graph、benchmark、repair 支持长期维护。

## 代价

- 自动化程度低于 daemon 系统。
- 默认 search 是 lexical；`search --semantic` 使用本地确定性相似度，不是 embedding-backed semantic search。
- Graph vectors 是本地 hashed word vectors。
- Contradiction detection 是 heuristic/advisory。
- `deduplicate --semantic` 使用本地确定性相似度，不依赖外部 embeddings。
- Pattern mining、encryption config、PR workflow 还不是完整运行时流程。

## 与 Agentmemory 对比

[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) 是面向 coding agents 的自动记忆引擎，强调 server memory、MCP/hooks/REST、多个 adapter、benchmark、viewer、replay、hybrid retrieval 和 Hermes integration。

如果你想要自动捕获、replay、vector retrieval 和大量 MCP tools，选择 agentmemory。

如果你想要 repo 可读协议：Markdown first、human approved、Git reviewed、无需 server 也能跨 agent 使用，选择 Engram。

| 维度 | Engram | agentmemory |
| --- | --- | --- |
| Source of truth | Approved Markdown | Memory server/store |
| Trust boundary | Human A/B/C approval | Auto-capture + governance |
| Default mode | File protocol | Service recommended |
| Review | Git diff + Markdown | Viewer/API/sessions |
| Best fit | ownership 和 auditability | automatic recall 和 replay |

## 与内置 Agent Memory 对比

内置记忆很方便，但常绑定某个 host。Engram 把权威放回人类控制的文件。

## Roadmap

- 可选本地 embedding provider。
- 更清晰的 graph routing diagnostics。
- 版本化 benchmark fixtures。
- 更强 contradiction review workflow。
- 更多 agentmemory export import tests。
- 可选外部 embedding provider 用于 semantic duplicate detection。
- Repair 报告错误后可提出修复建议。
