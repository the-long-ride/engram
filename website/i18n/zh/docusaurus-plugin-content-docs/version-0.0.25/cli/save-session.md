---
title: save / save-session / observe
sidebar_position: 3
description: 写入命令 — 保存单个内存、保存会话中的多个内存并捕获原始笔记。
---

# save / save-session / observe

写入命令通过审批门提出内存建议。

## save

```bash
engram save [rule|workflow|knowledge] "<text>"
engram save --role frontend "<text>"
engram save --scope global "<text>"
```

`engram save` 捕获最佳的单个内存候选，自动更新匹配的内存或创建新内存，并在写入前始终显示 A/B/C 审批门。

当 `engram save` 发现相关的活动内存时，审批预览会报告 these 内存，并附带建议的 `depends_on` 或潜在的重复警告。

## save-session

```bash
engram save-session
engram ss
engram save-session --query-level 3
engram ss -a
engram ss -a last 50 sessions
engram save-session --file transcript.md
engram save-session --accept-all
```

当长时间的交互产生了多个候选时，使用 `save-session`：

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` 是可选的。仅在解释内存存在的原因时添加它。重构相关内存时，候选还可以添加 `DEPENDS_ON`、`LEVEL` 或 `UPDATE` 字段。

- `--query-level <n>` — 挖掘最多 n 次最近的可访问人类与 Agent 的聊天；必须为正整数；Agent 不得编造不可用的历史记录
- `--accept-all` / `-a` — 由于人类明确批准了该快捷方式，生成的每个候选都会被保存
- `--file <path>` — 针对磁盘上已有的记录或长总结

对于 `/engram take-control --accept-all` 或自然的 `/engram take control accept all`，斜杠适配器会标准化表述，仅生成简明的 `TYPE: ... | TEXT: ...` 候选，并允许 Engram 保存它们而无需第二次审批提示。

## observe

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` 将脱敏的原始笔记存储在 `inbox/` 中。收件箱（inbox）笔记不是活动内存。当你希望在决定哪些内容应该成为持久内存之前保留草稿笔记时，使用此功能。

## 相关内存提示

当“接受全部”运行在写入前报告相关内存时，说明尚未保存任何文件。Agent 应当使用结构化候选重新运行：

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## 下一步

- [inject / link / upgrade](inject-link-upgrade.md)
- [概念：写入路径和审批](../concepts/write-path.md)
