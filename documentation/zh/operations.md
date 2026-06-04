# 操作指南

本页面包含详细的用法，以便 README 可以保持简短。

## 命令面板

| 需求 | 命令 |
| --- | --- |
| 加载任务内存 | `engram load "<任务>"` |
| 搜索内存 | `engram search "<主题>"` |
| 保存一条内存 | `engram save [rule\|workflow\|knowledge] "<文本>"` |
| 保存多次会话内存 | `engram save-session` 或 `engram ss` |
| 从可访问的最近聊天中提取 | `engram save-session --query-level 3` |
| 接受全部会话候选 | `engram ss -a` |
| 提取并接受最近聊天候选 | `engram ss -a last 50 sessions` |
| 捕获原始笔记 | `engram observe --file session.md` |
| 转换已有的智能体指导/文档 | `engram take-control --all` |
| 预览接管计划 | `engram take-control --plan` |
| 检查图谱路由 | `engram graph "<主题>"` |
| 校验哈希 | `engram verify` |
| 查找损坏的内存文件 | `engram repair` |
| 归档错误的内存 | `engram archive --reason "<原因>" <id-或-文件>` |
| 调整规则强度 | `engram set-rule-variant strict\|balanced\|light\|off` |

对于较长时间会话的内存建议，请使用 `save-session`。简写形式：`ss`。
当人类希望智能体从最多 n 个可访问的最近人类-智能体聊天中提取候选，而不是只使用当前会话时，请使用 `--query-level <n>`。自然写法 `engram ss -a last 50 sessions` 会规范化为 `engram save-session --query-level 50 --accept-all`。

当超过 8 条内存匹配同一查询时，`load` 会将更大的候选池细化为 top 8 上下文包。`load --dry-run` 会显示候选数量和用于缩小范围的标签；`load --all` 会有意返回所有可见的已路由内存。

## 保存会话 (Save Session)

当长时间的交互产生了多个候选条目时，请使用 `save-session`：

```text
TYPE: rule | TEXT: Always run tests before release.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

如果不带 `--accept-all` 运行，Engram 会询问要保存哪些候选。带有 `ss -a` 时，每个生成的候选都会被直接保存，因为人类显式批准了该快捷操作。
`--query-level` 必须是正整数。智能体只应包含它真正可以访问的聊天，并且不得编造不可访问的历史。`engram ss -a last 50 sessions` 使用 `50` 作为 query level，并将 `-a` 作为人类显式的一键批准。

## 接管控制 (Take Control)

`take-control` 帮助在现有的仓库中采用 Engram。它会扫描智能体指导原则、笔记、文档和选定的文件，然后请求智能体提议简明的内存候选。

常用的筛选器：

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
```

由 take-control 保存的内存会记录 `source_files` 和 `source_hashes`，因此未更改的源文件在以后会被自动跳过。

## 观察记录 (Observe)

`observe` 将清洗过的原始笔记存储在 `inbox/` 中。收件箱（inbox）笔记不是激活的内存。

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<笔记>.md
```

当您在决定哪些应该成为持久内存之前，希望保留粗糙的草稿笔记时，请使用此命令。

## 修复与评审

在手动编辑或导入后使用 `repair`：

```bash
engram repair
engram rebuild-index
engram verify
```

在归档前使用图谱和质量检查：

```bash
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

下一步：[对比与路线图](comparison.md)。
