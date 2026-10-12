---
title: save / save-session / observe
sidebar_position: 3
description: 写入命令——保存一条记忆、从会话中保存多条记忆，并捕获原始笔记。
---

# save / save-session / observe

写入命令通过审批关卡来提出记忆。

## save

```bash
engram save [rule|workflow|knowledge] "<text>"
engram save --role frontend "<text>"
engram save --scope global "<text>"
```

`engram save` 会捕获最佳的单条记忆候选，自动更新匹配的记忆或创建新记忆，并且在写入之前始终显示 A/B/C 审批关卡。

当 `engram save` 发现相关的活动记忆时，审批预览会报告它们，并附带建议的 `depends_on` 或可能重复的警告。

## save-session

```bash
engram save-session
engram ss
engram save-session --query-level 3
engram ss -f
engram ss -f last 50 sessions
engram save-session --file transcript.md
engram save-session --force
```

当一次较长的交互产生了多个候选时，请使用 `save-session`：

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` 是可选的。仅当它能说明该记忆存在的原因时才添加。在重构相关记忆时，候选还可以添加 `DEPENDS_ON`、`LEVEL` 或 `UPDATE` 字段。

- `--query-level <n>` — 挖掘最多 n 条最近可访问的人类与 agent 的聊天；必须是正整数；agent 不得编造无法获得的历史记录
- `--force` / `-f` — 保存每一个生成的候选，因为人类已显式批准该快捷方式
- `--file <path>` — 用于磁盘上已有的会话记录或较长的摘要

### 保存裁决

每个候选预览（CLI、MCP 和 Entry）都会在 `File:` 之后紧接着输出一行 `Verdict:`：`ADD`、`UPDATE <id>`、`SUPERSEDE <id>` 或 `NOOP duplicate of <id>`。该裁决是确定性的（基于现有的去重和相关记忆分数，不调用模型）。`A` 和 `B` 会跳过 `NOOP` 候选，并将其列为已跳过；`A 1,3` 只写入所列编号的候选。批准 `SUPERSEDE` 时，会在新记忆上写入 `supersedes: [old]`，并在旧记忆上写入 `lifecycle: superseded`，因此 `engram load` 会将其排除。`--force` 和自动保存绝不会应用 `SUPERSEDE`：它会被推迟，直到你不带 `--force` 重新运行并审阅它。

<a id="candidate-fields"></a>
### 候选字段

除了 `CONTEXT`、`DEPENDS_ON`、`LEVEL` 和 `UPDATE` 之外，候选还可以带有：

| 字段 | 含义 |
| --- | --- |
| `OBJECTIVE: task` 或 `durable` | `task` 保存到[工作层](#working-memory-promote-and-prune)；默认为 `durable` |
| `SCOPE: workspace` 或 `global` | 为该候选覆盖命令的作用域。审批预览会在其 `Scope:` 行中指明目标。在 `--force` 下，作用域超出命令作用域的候选会被推迟，而不会被写入 |
| `APPLIES_TO: <globs>` | 最多 8 个相对 glob；当匹配的文件被读取或编辑时，会注入该记忆 |
| `DIRECTIVE: <line>` | 最多 160 个字符的一行文字，显示在该记忆的卡片上 |

```text
TYPE: rule | TEXT: Route commands through MediatR. | DIRECTIVE: Route commands through MediatR | APPLIES_TO: src/Api/**
```

在 `|` 格式中，字段名不区分大小写。在多行格式中，它们仅在大写时才会被识别，因此诸如 `Scope: the billing module` 这样的普通文字行仍然作为内容保留。

对于 `/engram take-control --force` 或自然语言的 `/engram take control force`，斜杠适配器会规范化措辞，仅生成简明的 `TYPE: ... | TEXT: ...` 候选，并让 Engram 无需第二次审批提示即可保存它们。

<a id="working-memory-promote-and-prune"></a>
## 工作记忆：提升与清理

```bash
engram promote <id>
engram promote workspace:<id>
engram working note "<text>" [--objective "<text>"] [--type knowledge|rule] [--scope workspace|global]
engram working prune --dry-run
engram working prune
```

已批准的 `OBJECTIVE: task` 候选会被写入被 gitignore 的 `.agents/.engram/working/`（或 `<global>/working/`），带有 `tier: working`、`--objective` 文本，以及 `valid_until` = 今天 + `load.working_ttl_days`（默认 14，范围 1 到 365）。审批预览会显示 `Tier: working (expires <date>)`。工作记忆在过期之前会像持久记忆一样被加载、搜索和路由；过期后它们会退出 `load`，省略原因为 `lifecycle`。Agent 卡片和正文会被标注为 `working`。

- `engram promote <id>` 会显示 A/B/C 预览，并在批准后将该记忆移到持久存储：它会去掉 `tier` 和 `valid_until`，保留 `objective`，并递增 `revision`。已过期的工作记忆无法被提升。当两个作用域都存在相同 id 时，请使用 `workspace:<id>` 或 `global:<id>`。
- `engram working prune` 会删除 `valid_until` 已过的工作记忆，并重建索引、哈希和图；`--dry-run` 会先将它们列出。持久记忆绝不会被触及。
- `engram working note "<text>"` 会将一条任务笔记（`source: note`，默认类型为 `knowledge`，允许 `--type rule`）保存到工作层。文本会被脱敏，类似指令的行会被拒绝。写入由一次 Y/C 提示把关，取消则不会写入任何内容。笔记绝不会更新具有相同 id 的持久记忆。会话启动时会省略它，除非 `ENGRAM_SESSION_OBJECTIVE` 与该笔记的 `--objective` 匹配；否则它会以卡片形式显示。使用 `engram promote <id>` 提升它。

工作记忆绝不会进入 Git，其索引、图和哈希条目保留在 `working/` 下的本地 sidecar 中。

## observe

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` 会将经过清理的原始笔记存入 `inbox/`。Inbox 笔记不是活动记忆。当你想在决定哪些内容应成为持久记忆之前先保留粗略笔记时，请使用它。

<!-- evidence-foundation:v3:start -->
## 证据支持的记忆

```bash
engram observe --file session.md
# Output includes Trace: tr_... and the inbox wrapper path
engram save-session --file .agents/.engram/inbox/<observation>.md
```

不可变的来源位于 `.agents/.engram/traces/<trace-id>.jsonl`；inbox Markdown 只是一个审阅包装。提升时会重新打开该 trace，并写入带有 `evidence_refs` 和 `derived_from` 的已批准记忆。`engram observe --propose --file session.md` 可以立即进入正常的审批流程，但它仍然以该 trace 作为来源证据。`engram observe --queue [--dry-run] [--limit n]` 会将可选的 `SessionEnd` 会话记录队列处理为同样经过清理的 trace 和 inbox 包装，且不会写入任何记忆。
<!-- evidence-foundation:v3:end -->

## 相关记忆提示

当“全部接受”的运行在写入之前报告了相关记忆时，说明尚未保存任何文件。Agent 应使用结构化候选重新运行：

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## 后续步骤

- [inject / link / upgrade](inject-link-upgrade.md)
- [概念：写入路径与审批](../concepts/write-path.md)


## Git 作者身份

Engram 可以存储一个全局作者以及可选的工作区覆盖。解析顺序依次为工作区、全局，然后是只读的 Git 回退。设置仅影响未来的记忆；工作区覆盖绝不会更改全局 Git 配置。全局 Git 同步或旧版记忆迁移需要显式的计划与确认。

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

请阅读完整的 [Git 作者设置指南](../operations/git-author-settings.md)。
