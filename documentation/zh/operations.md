# 操作指南

## 常用命令

| 需求 | 命令 |
| --- | --- |
| 加载任务记忆 | `engram load "<task>"` |
| 搜索记忆 | `engram search "<topic>"` |
| 保存一个记忆 | `engram save [rule|workflow|knowledge] "<text>"` |
| 保存会话记忆 | `engram save-session` 或 `engram ss` |
| 接受全部候选 | `engram ss -a` |
| 捕获原始笔记 | `engram observe --file session.md` |
| 导入 docs/guidance | `engram take-control --all` |
| 预览 takeover | `engram take-control --plan` |
| 查看 graph routing | `engram graph "<topic>"` |
| 检查 hash | `engram verify` |
| 查找无效文件 | `engram repair` |
| 归档错误记忆 | `engram archive --reason "<why>" <id-or-file>` |
| 调整规则强度 | `engram set-rule-variant strict|balanced|light|off` |

Legacy `autosave`、`as`、`at` 仍会路由到 `save-session`。新文档应使用 `save-session` 和 `ss`。

## Save Session

```text
TYPE: rule | TEXT: Always run tests before release.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

没有 `--accept-all` 时，Engram 会询问保存哪些候选。`ss -a` 会保存全部，因为人类明确批准。

## Take Control

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
```

保存的记忆会记录 `source_files` 和 `source_hashes`。

## Observe

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`inbox/` 笔记在转换前不是 active memory。

## Repair And Review

```bash
engram repair
engram rebuild-index
engram verify
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

下一页：[对比与路线图](comparison.md)。

