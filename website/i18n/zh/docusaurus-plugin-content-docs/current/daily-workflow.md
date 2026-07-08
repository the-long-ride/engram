---
title: 日常工作流
sidebar_position: 4
description: Engram 日常循环 — 加载、工作、搜索、保存并保持内存健康。
---

# 日常工作流

Engram 日常循环故意设计得很简单：在开始时加载内存，在需要时进行搜索，在出现持久内容时保存，并在结束时进行审计。

## 启动会话

```text
/engram load --for-agents "当前任务"
```

或者从终端运行：

```bash
engram load --for-agents "<任务>"
```

Agent 应当回复一条紧凑的计数行，例如 `Engram loaded: 8 memories / 24 total related memories.`，除非人类要求提供 ID、规则或原始输出。

## 在工作期间

当任务改变或你怀疑缺少项目知识时进行搜索：

```text
/engram search "我可能缺失的主题"
```

预览哪些内存文件将被路由而不打印其内容：

```bash
engram load --dry-run "<查询>"
```

返回每个可见的路由匹配，而不是紧凑限制：

```bash
engram load --all "<查询>"
```

## 保存一个持久事实

```text
/engram save knowledge
```

`engram save` 捕获最佳的单个内存候选，自动更新匹配的内存或创建新内存，并在写入前始终显示 A/B/C 审批门。

## 保存一个会话的多个内存

```text
/engram save-session
/engram ss
```

提供此形式的候选：

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` 是可选的。仅在解释内存存在的原因时添加它。

## 挖掘最近的聊天记录

```text
/engram save-session --query-level 3
/engram ss -a last 50 sessions
```

`--query-level` 必须是正整数。Agent 可以使用多达该数量的最近的人与 Agent 的聊天会话（包括当前会话），且不得编造不可用的历史记录。

## 接受全部快捷方式

```text
/engram ss -a
```

`-a` 意味着人类明确批准 Agent 推荐的每个候选。除非人类要求，否则 Agent 不得添加 `--accept-all`。

当“接受全部”运行在写入前报告相关内存时，说明尚未保存任何文件。Agent 应当使用结构化候选重新运行：

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## 角色路由 (Role routing)

保存特定角色的内存：

```bash
engram save --role frontend ...
engram save-session --role backend ...
```

调整角色路由：

```bash
engram set-role frontend
engram set-role backend security
engram set-role
```

当 `engram set-role ...` 或 `engram set-rule-variant ...` 成功时，CLI 返回一行 `Agent action:`。支持 Engram 的斜杠适配器和 MCP 主机应立即重新运行 `engram load "<当前任务/请求>"` 并将该结果视为替换先前加载的 Engram 上下文。

## 结束有意义的工作

```text
Check Engram health, report invalid memories, and propose anything worth saving from this session.
```

常用命令：

```bash
engram upgrade
engram verify
engram repair
engram graph "<主题>"
engram quality-check
engram archive --reason "<原因>" <id或文件>
```

## 下一步

- [CLI 参考](cli/overview.md)
- [运行故障排除](operations/troubleshooting.md)
- [Entry Web UI](entry/index.md)
