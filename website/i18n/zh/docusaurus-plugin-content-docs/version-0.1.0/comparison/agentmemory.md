---
title: agentmemory
sidebar_position: 3
description: Engram 对比 rohitg00/agentmemory — 文件协议对比自动内存引擎。
---

# agentmemory

[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) 是一个强大的编码 Agent 自动内存引擎。其 README 介绍了基于服务端的内存、MCP/hooks/REST 集成、许多 Agent 适配器、基准测试声明、查看器、重放、混合检索和 Hermes 集成。

当你想要自动捕获、实时查看器/重放、向量检索、许多 MCP 工具以及服务端风格的共享内存时，使用 agentmemory。

当你希望内存成为一种仓库可读的协议时，使用 Engram：Markdown 优先、人类批准、Git 审查，即使没有运行的服务端也可以跨 Agent 移植。

| 维度 | Engram | agentmemory |
| --- | --- | --- |
| 信任源 | 经批准的 Markdown 文件 | 内存服务端/存储 |
| 信任边界 | 人类 A/B/C 审批 | 自动捕获加上工具治理 |
| 默认模式 | 文件协议，不需要守护进程 | 推荐运行中的服务 |
| 审查 | Git diff 和 Markdown 审查 | 查看器/API 和存储的会话 |
| 最合适 | 需要所有权和可审计性的团队 | 想要自动召回和重放的用户 |
| 风险 | 更多的手动纪律 | 除非得到仔细治理，否则会有更多不可见状态 |

## 下一步

- [Hermes Agent](hermes-agent.md)
- [对比概述](overview.md)
