---
title: inject / link / upgrade
sidebar_position: 4
description: 设置与适配器命令——初始化工作区、关联 agent，并在软件包更新后进行协调。
---

# inject / link / upgrade

设置与适配器命令用于初始化工作区、关联 agent，并在软件包更新后进行协调。

## inject

```bash
engram inject
engram inject --scope workspace|global|both
engram inject --global-only --global-path <path>
engram inject --submodule
engram inject --submodule-remote <git-url>
engram inject --global-remote <git-url>
engram inject --global-branch <branch>
engram inject --no-skillset
engram inject --skillset all
engram inject --no-global
```

`engram inject` 会创建 `.agents/.engram/`，并默认安装精简的 Codex 目标。已有的人工编写文件会被跳过。

交互式 inject 按以下顺序询问：是否将 `./.agents/.engram` 添加为子模块、是否使用全局 Engram 路径，以及是否添加共享的全局 Git origin。

使用 `engram update-global-folder <new-path>` 或 `engram ugf <new-path>` 仅更新已配置的全局路径。聊天风格的写法，例如 `engram set global memory path to <new-path>` 和 `engram move global folder from <old-path> to <new-path>`，会被规范化为同一条命令。如果还希望 Engram 移动整个旧的全局根目录，请添加 `--move-from-path <old-path>`。

## link

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram link all
engram link list
engram link --all-supported
engram unlink
```

`engram link all` 会安装公开的目标集合，并在一次统一安装中，针对 skillset 指令文件、MCP 配置、斜杠适配器和 agent hook 方面的部分支持宿主，报告确定性的 `SKIPPED` 原因。`engram unlink` 会将这些内容一并移除。`engram unlink --global <target>` 只移除由 Engram 生成的全局插件；人工编写的文件会被保留，除非显式指定 `--force`。

`engram link claude --session-end`（或 `codex`）还会额外注册一个可选的 `SessionEnd` 命令 hook，它将会话记录（transcript）路径排入被 gitignore 的 `session-queue.json` 队列；该选项默认关闭，且 `engram upgrade` 绝不会添加它。使用 `engram observe --queue` 来处理该队列；参见 [Hooks](../integrations/hooks.md)。

## upgrade

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
engram upgrade --self
engram upgrade --memory-only
engram upgrade --global-skillsets-only
engram upgrade --target codex
```

安装更新的 Engram 软件包之后，请使用 `engram upgrade`。该命令会将从 v0.0.8 起已初始化的记忆根目录与当前发布版本的 schema 进行比较，并刷新生成的 `HELP.md`、记忆索引、图文件、符合条件的向量 sidecar、生成的工作区 skillset、全局记忆脚手架以及已注册的全局 agent skillset，同时保留人工编写的文件。

除非设置了 `--no-auto-upgrade` 或 `ENGRAM_NO_AUTO_UPGRADE=1`，否则普通命令也会在每个软件包版本中静默运行一次相同的根目录协调。

当新软件包的输出必须覆盖当前由 Engram 管理的已关联 agent 工件时，请使用 `engram upgrade --latest`。该路径会重新应用已关联的工作区指令文件、规则、MCP/插件配置和受管 hook，并同时使用最新生成的文件刷新已注册的全局 agent 安装。

仅在有意替换生成的 Engram 适配器文件时才使用 `--force`。

## take-control

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --force
engram take-control --plan --json --kind code
engram take-control --kind code --objective "add billing export"
engram take-control --refresh
engram take-control --from claude-auto-memory --plan
engram take-control --from codex-memories --plan
```

`take-control` 是针对现有工作区指导内容的、由 agent 辅助的接管流程。它会从 `AGENTS.md`、`CLAUDE.md`、`GEMINI.md`、Cursor 规则、memory-bank 笔记，以及顶层的 `rules/`、`skills/`、`workflows/`、`knowledge/` 或 `notes/` 文件夹（包括 `.txt` 笔记）等文件构建一个精简的来源包。

已保存的 take-control 记忆会记录 `source_files` 和 `source_hashes`，因此未变化的来源以后会被跳过。

### 代码与配置摘要

`--kind docs|code|config|all`（允许逗号分隔的列表；默认 `docs`，即保持上述行为）会添加提取器，为每个来源输出一份简短摘要，而不是原始文本：

- **code**：导出的签名、文档注释的第一行以及 import，绝不包含函数体。指导内容会将它们显示为按目录组织的仓库地图，包含符号名称和一行 import。代码扫描默认使用 `--max-sources 40`。
- **config** 和构建清单：键名，仅对允许列表中的键（`scripts`、依赖名称、`TargetFramework`、`engines`、`name`）保留值，以及技术栈事实。

每份摘要都会经过脱敏。`.env*` 和凭据文件始终会以 `secret file` 为由被跳过，发现的超过 256 KB 或看起来是二进制的文件会连同原因一起被跳过，代码和配置扫描会在任意深度跳过构建输出目录（`bin`、`obj`、`build`、`out`、`target`、`venv` 及类似目录）。`--budget-tokens`（代码和配置扫描默认为 6000；docs 扫描除非指定否则没有上限）、`--max-sources` 和 `--max-chars` 用于限定来源包的大小。`--plan --json` 会以 JSON 形式输出计划，包括被跳过的文件及其原因；对于默认的 docs 扫描，其 `budgetTokens` 为 `null`。

### 目标感知的候选

`--objective "<text>"` 用于指定当前目标。随后指导内容会要求两类候选：对该目标有用的 `OBJECTIVE: task` 候选，以及之后值得保留的 `OBJECTIVE: durable` 候选。候选语法还接受 `SCOPE: workspace|global`、`APPLIES_TO: <globs>`（最多 8 个相对 glob）和 `DIRECTIVE: <line>`（最多 160 个字符）；参见 [save-session](save-session.md#candidate-fields)。已批准的 `OBJECTIVE: task` 候选会进入[工作层](save-session.md#working-memory-promote-and-prune)。

### 新鲜度

code、config 和清单类记忆会记录其摘要的哈希（`source_hash_mode: digest`），因此仅空白字符或仅正文的修改不会使其过时；docs 记忆则记录原始文件的哈希。`engram verify --sources` 会将已更改或缺失的来源记录到被 gitignore 的 `stale.json` 中，而 `engram take-control --refresh` 只重新摘要这些来源，并通过正常的审批关卡为每条过时的记忆提出一个 `UPDATE: <id>` 候选。参见 [verify](verify-repair-quality.md#verify)。

### 宿主记忆

`--from claude-auto-memory|codex-memories` 会导入宿主本地的记忆存储以供审阅，而不是扫描工作区。Claude 自动记忆（auto memory）从 `~/.claude/projects/<project>/memory/` 读取（或使用你的用户或本地 Claude 设置中的 `autoMemoryDirectory`；`CLAUDE_CONFIG_DIR` 会替换 `~/.claude`），Codex 记忆则从 `~/.codex/memories/` 读取；当无法明确找到存储位置时，`--dir <path>` 可覆盖该存储。`type: feedback` 会提出规则，`project` 和 `reference` 会提出知识，而 `type: user`、无类型文件以及 `MEMORY.md` 索引会被跳过。`--from` 不能与 `--file`、`--include`、`--exclude`、`--kind`、`--all`、`--budget-tokens` 或 `--refresh` 组合使用。

Engram 绝不会向宿主存储写入内容。导入内容会经过脱敏和注入过滤，走正常的审批关卡，并记录 `source: host-memory` 以及相对于预设的 `source_files`（例如 `claude-auto-memory/feedback_testing.md`，绝不会是主目录路径）。`engram verify --sources` 仅在持有该存储的机器上检查漂移（在其他机器上会报告 `host memory store not on this machine`）。没有 Gemini 预设。

## metacognize

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --force
```

当你希望 AI agent 审阅现有的 Engram 记忆文件夹，并通过同一套 save-session 审批流程提出更安全的结构时，请使用 `metacognize`。Agent 应使用 `UPDATE: memory-id` 进行整合或措辞清理，使用 `DEPENDS_ON: memory-id` 表示分层记忆。


## 旧版记忆迁移到 schema v3

`engram upgrade --latest` 还会将工作区和已配置全局根目录中处于活动状态的 v1/v2 记忆文件迁移到 schema v3。Engram 会原样保留每个 Markdown 正文，写入 `backups/schema-v3/<memory-file>.pre-v3.bak`（一个被 gitignore 的文件夹；`engram repair --move-backups` 会迁移留在记忆文件旁边的较早备份），仅填充确定性的元数据，刷新完整性哈希，并重建索引、图以及符合条件的向量 sidecar。它绝不会凭空生成 `evidence_refs`；没有经过验证的 trace 链接的记忆会被标记为 `evidence_status: unverified`。无效的记忆会被报告并跳过，已归档的记忆不会被改写，再次运行是幂等的。

无需写入即可预览所有变更：

```bash
engram upgrade --latest --plan
```

仅运行记忆迁移，而不覆盖关联的 agent 工件：

```bash
engram upgrade --migrate-memories
```

在 latest 升级期间跳过记忆迁移：

```bash
engram upgrade --latest --no-migrate-memories
```

## 后续步骤

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [Agent 集成概览](../integrations/overview.md)


<!-- configuration-upgrade-inventory -->
## 配置升级清单

软件包更新之后，请先运行 `engram upgrade --latest --plan`，再运行 `engram upgrade --latest`。共享清单会扫描工作区和全局中由 Engram 管理的记忆、指令、skillset、配置、hook 和插件。用户编写的字节会被保留；含义不明的混合文件会被报告为冲突。参见[配置升级](../operations/configuration-upgrades.md)。
