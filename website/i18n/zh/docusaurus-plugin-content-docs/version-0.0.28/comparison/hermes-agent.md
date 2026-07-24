---
title: Hermes Agent
sidebar_position: 6
description: Engram 对比 Hermes Agent — 人类拥有的文件协议对比自主且始终活跃的内存。
---

# Hermes Agent

## TL;DR

| | Engram | Hermes Agent |
|---|---|---|
| **哲学** | 人类拥有的、文件优先的协议（自动化可选） | 自主且始终活跃的内存 |
| **存储** | `.agents/.engram/` 中有类型划分的 Markdown 文件 | `MEMORY.md` + `USER.md`（硬性字符限制） |
| **写入模型** | 默认由人类批准（A/B/C 门；可通过规则实现自动化） | Agent 自主写入 |
| **召回** | 按需：`engram load "<task>"` 注入相关文件 | 始终开启：核心文件在每次会话中冻结到 system prompt 中 |
| **向量搜索** | 可选的本地 sqlite-vec（确定性的，不由嵌入支持） | 通过外部提供商（例如 agentmemory — BM25 + 向量） |
| **跨 Agent** | 任何可读取文件的 Agent 均可消费 Engram 内存 | Hermes 核心是单 Agent 的；通过 agentmemory 插件实现跨 Agent |
| **移植性** | Git 原生、离线优先、纯 Markdown | 本地文件；外部提供商可能会增加云端绑定风险 |
| **开销** | 无守护进程，需要保存纪律（除非已自动化） | 服务端进程 + 查看器 UI、REST API、MCP 服务端 |

## 存储格式

**Engram** 将每个内存存储为带 YAML frontmatter、哈希完整性检查和可选依赖图（`depends_on`）的类型化 Markdown 文件。JSON 索引、图和 sqlite-vec 随从文件（sidecar）作为加速层 — Markdown 是信任源。

**Hermes** 将所有持久内存压缩为两个受限的文件：

- `~/.hermes/memories/MEMORY.md` — Agent 笔记，限制为 2,200 个字符
- `~/.hermes/memories/USER.md` — 用户配置文件，限制为 1,375 个字符

硬性字符限制迫使 Agent 进行挑选，而不是堆砌。会话历史记录可通过 SQLite FTS5 进行搜索。

## 写入模型

**Engram** — 默认是显式的人类审批门。Agent 提出候选；人类必须在任何内容落地到磁盘之前进行批准。秘密和 prompt-injection 扫描在保存时进行。用户可以通过保存一条规则来自动化此过程，该规则会在响应完成时自动保存新提出的内存候选。

**Hermes** — 自主的。Agent 决定写什么以及何时写，仅受字符限制。核心循环中没有人类审批。

## 召回模型

**Engram** — 按需路由。`engram load "<task>"` 根据标签、类型、时效性、图和可选的向量信号对候选进行重新排序，然后将紧凑包（默认：8 个文件）注入上下文中。

**Hermes** — 始终活跃的注入。核心文件在会话开始时冻结到 system prompt 中。可选的外部提供商（例如 agentmemory）在每次 LLM 轮次之前运行预取，并在之后进行同步。

## 何时使用哪一个

当你需要可审计的、经人类审查的内存；通过 Git 进行团队共享；隐私保证；或工具之间与 Agent 无关的移植性时，**使用 Engram**（并可选择通过自定义规则自动化保存）。

当你想自动积累内存而不需要保存纪律、始终开启的上下文注入或拥有查看器、REST API 和可插拔向量后端的更丰富运行时环境时，**使用 Hermes**。

## 下一步

- [agentmemory](agentmemory.md)
- [对比概述](overview.md)
