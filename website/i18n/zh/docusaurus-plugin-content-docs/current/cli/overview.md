---
title: 命令概览
sidebar_position: 1
description: 所有 Engram CLI 命令及其用途的一览表。
---

# 命令概览

运行 `engram -h` 可查看精简的命令列表。运行 `engram help <topic>` 或 `engram -h <topic>` 可查看特定命令的示例和使用场景。

## 命令一览

| 需求 | 命令 |
| --- | --- |
| 加载任务记忆 | `engram load "<task>"` |
| 加载精简的任务记忆 | `engram load "<task>"` |
| 打印 AI agent 使用指南 | `engram llm` |
| 预览经过路由的记忆文件 | `engram load --dry-run "<task>"` |
| 带 token 上限加载 | `engram load --budget-tokens 800 "<task>"` |
| 打印所有打包的正文 | `engram load --disclosure full "<task>"` |
| 按 id 获取卡片 | `engram load --id <id>,<id>` |
| 搜索记忆 | `engram search "<topic>"` |
| 保存一条记忆 | `engram save [rule\|workflow\|knowledge] "<text>"` |
| 保存多条会话记忆 | `engram save-session` 或 `engram ss` |
| 挖掘最近可访问的聊天 | `engram save-session --query-level 3` |
| 强制保存会话候选 | `engram ss -f` |
| 挖掘并强制保存最近的聊天 | `engram ss -f last 50 sessions` |
| 捕获原始笔记 | `engram observe --file session.md` |
| 处理可选的 SessionEnd 会话记录队列 | `engram observe --queue --dry-run` |
| 转换现有文档/指导内容 | `engram take-control --all` |
| 预览来源接管 | `engram take-control --plan` |
| 摘要代码或配置 | `engram take-control --kind code --objective "<text>"` |
| 刷新过时的代码派生记忆 | `engram take-control --refresh` |
| 检查来源新鲜度 | `engram verify --sources` |
| 保留一条工作记忆 | `engram promote <id>` |
| 保存任务笔记 | `engram working note "<text>"` |
| 清理已过期的工作记忆 | `engram working prune [--dry-run]` |
| 查看获取与注入次数 | `engram stats --usage` |
| 重构现有记忆文件夹 | `engram metacognize --workspace\|--global\|--all` |
| 解决冲突并执行 metacognize | `engram resolve-conflicts --metacognize` |
| 检查图路由 | `engram graph "<topic>"` |
| 检查哈希 | `engram verify` |
| 查找格式错误的记忆文件 | `engram repair` |
| 归档错误的记忆 | `engram archive --reason "<why>" <id-or-file>` |
| 调整规则强度 | `engram set-rule-variant strict\|balanced\|light\|off` |
| 设置默认保存目标 | `engram set-save-target workspace\|global\|both\|status` |
| 设置精简加载上限 | `engram set-load-limit 1..32\|status\|reset` |
| 设置 hook 自动读取 | `engram set-read startup\|auto\|always\|manual\|off\|status` |
| 设置 hook 证明行可见性 | `engram set-proof off\|compact\|status` |
| 安装 agent hook | `engram link codex\|claude\|gemini\|opencode\|cursor\|windsurf` |
| 管理全局资料 | `engram profile status\|list\|create\|use\|merge` |
| 克隆工作区/全局记忆 | `engram clone-memory workspace global [--metacognize]` |

## 命令发现

```bash
engram help save-session
engram help set-role
engram -h set-rule-variant
```

帮助中列出的所有命令都带有简短别名。别名与其规范命令路由到相同的 CLI 行为和审批关卡。

## Shell 补全

```bash
engram completion bash
engram completion zsh
engram completion powershell
```

## 后续步骤

- [load / search / graph](load-search-graph.md)
- [save / save-session / observe](save-session.md)
- [inject / link / upgrade](inject-link-upgrade.md)


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
