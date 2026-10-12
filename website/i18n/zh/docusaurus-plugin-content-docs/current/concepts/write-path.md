---
title: 写入路径与审批
sidebar_position: 6
description: Agent 提出，人类批准。只有获批的记忆才会被写入，随后索引、图、哈希和变更日志会刷新。
---

# 写入路径与审批

写入流程是信任边界。Agent 提出，人类批准。

## 写入流程

1. Agent 提出一个或多个候选。
   使用 `save-session --query-level <n>` 时，agent 可以参考最多 n 条最近可访问的人类与 agent 的聊天，但仅作为提案的上下文。
   自然语言的 `/engram ss -f last 50 sessions` 是相同的范围外加显式的强制批准：`engram save-session --query-level 50 --force`。
2. Engram 解析候选的类型和目标作用域。
3. Engram 检查 schema、secret、提示注入模式和路径安全。
4. 人类看到预览。每个候选都带有一行确定性的 `Verdict:`：`ADD`、`UPDATE <id>`、`SUPERSEDE <id>` 或 `NOOP duplicate of <id>`（不调用模型）。
5. 直接使用 CLI 时，回复 `A`、`A 1,3`、`B <note>` 或 `C`。
6. 在 AI agent 聊天中，针对所显示的确切候选，回复 `yes`、`audit` 或 `cancel`。
7. 只有获批的记忆才会被写入。`A` 和 `B` 会跳过 `NOOP` 候选，而批准 `SUPERSEDE` 会将旧记忆标记为已被取代；`--force` 和自动保存绝不会应用 `SUPERSEDE`，而是将其推迟以供审阅。
8. 索引、图、哈希和变更日志会被刷新。

## 批准用语

批准用语为 `yes`、`approve`、`confirm` 或 `save`。审阅用语为 `audit`、`revise`、`correct`，或编辑后的替换文本。取消用语为 `cancel`、`stop`，或拒绝。只有在确切候选被显示之后给出的批准，才会授权对这些候选执行 `engram save-session --force`。

直接使用终端 CLI 时仍为 A/B/C。MCP 提案工具仍然不写入。

## 相关记忆提示

当 `engram save` 发现相关的活动记忆时，审批预览会报告它们，并附带建议的 `depends_on` 或可能重复的警告。接受会原样保存预览内容；如果你想在保存之前重构依赖关系或归档重复项，请先拒绝。

对于 `save-session --force`，当出现这些相关记忆提示时，Engram 会在写入前暂停。Agent 应当利用该响应来构思一次结构化的重新运行：为依赖关系添加 `DEPENDS_ON: memory-id`，当某条记忆比其前置条件更深入时添加 `LEVEL: advanced`，或当某个候选应合并到可能重复的记忆时添加 `UPDATE: memory-id`。

<!-- evidence-foundation:v3:start -->
## 证据支持的记忆

对于在成为活动记忆之前需要先审阅的来源材料：

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<observation>.md
```

第一条命令会清理来源，并写入一个由 `trace_id` 标识的不可变 trace，外加一个可编辑的 inbox 包装文件。第二条命令会将包装文件解析到其 trace，校验哈希和作用域，然后仅写入带有 `evidence_refs` 且经人类批准的 schema v3 记忆。编辑 `## Raw Note` 无法替换 trace 证据。
<!-- evidence-foundation:v3:end -->

## 保存时的安全检查

- Schema 校验
- Secret 扫描
- 提示注入扫描
- 路径安全
- 哈希完整性

## 为什么这很重要

没有协议，记忆就可能变成不可见的状态。不可见的状态难以审阅、难以共享，而且很容易被 agent 无意中污染。

Engram 有意让记忆变得“无聊”：文件、diff、哈希、审阅关卡，以及人类可以重新运行的命令。

## 后续步骤

- [隐私、忽略规则与安全](safety.md)
- [CLI：save / save-session / observe](../cli/save-session.md)
