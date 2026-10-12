---
title: 发布与升级流程
sidebar_position: 2
description: 安全地升级 Engram 软件包并协调记忆根目录。
---

# 发布与升级流程

## npm 软件包更新之后

下一次正常的 Engram 命令会针对新版本，静默地对已初始化的工作区/全局根目录进行一次协调。当检测到较旧的元数据时，通过刷新生成的帮助、记忆索引、图文件以及符合条件的向量 sidecar，来覆盖从 v0.0.8 起各版本之间的记忆 schema 变更。

首次运行之后，该启动检查被刻意设计得很轻量：当已记录当前版本时，它只读取少量配置标记。它不会在 npm postinstall 中运行，不会创建新的记忆根目录，也不会替换人工编写的文件。使用 `--no-auto-upgrade` 或 `ENGRAM_NO_AUTO_UPGRADE=1` 可在某条命令中跳过它。

## 显式升级

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

`engram upgrade` 会刷新生成的工作区帮助、记忆索引、图文件、符合条件的向量 sidecar、已有的 Engram 生成的工作区 skillset 文件以及已注册的全局 skillset，同时保留人工编写的文件。

`engram upgrade --latest` 更为彻底：它会覆盖已关联的工作区 agent 和已注册全局安装中当前由 Engram 管理的关联 agent 工件，包括指令文件、规则、MCP/插件配置和受管 hook，使关联的宿主立即获得新软件包的输出。

仅在有意替换生成的 Engram 适配器文件时才使用 `--force`。

## 感知所有权的配置协调

latest 升级清单会按物理文件对已注册的集成去重。如果多个宿主共用同一份 Engram 指南，Engram 只会渲染并写入该文件一次，而不会让各宿主对应的条目相互改写。

当手动编辑使某个已知的 Engram 工件无法安全地进行常规替换时，只有在所有权可被证明的情况下，Entry 才会提供 **Force upgrade**。对于带标记的 Engram 块，强制操作只替换该块并保留周围的用户文本。对于已注册/生成的 Engram 文件，强制操作可以替换整个生成的文件。所有权未知的内容永远不可强制升级，批量确认也绝不会执行强制操作。

写入之后会通过重新扫描来验证应用是否成功。已回滚或失败的事务，以及预期已更新却未收敛到 `current` 的工件，都会被报告为错误；在这些情况下，Entry 不会显示升级成功的提示。

## Skillset 渲染配置

对于具备运行时能力的宿主，Engram 安装的是精简的引导指令，而不是完整协议。hook 提供经过路由的任务上下文，MCP 工具提供加载/搜索/提案行为，一份配套指南承载详细的工作流程，斜杠适配器和 Agent Skills 则作为指向它的简短指引。缺少可靠运行时上下文注入的回退目标，仍会收到精简的手动指令。

## SQLite 配置数据库回退

Engram 的 SQLite 配置数据库是针对工作区/资料管理的一项优化。如果该数据库无法打开或初始化，常规的读/写命令会回退到 JSON 配置快照。与数据库相关的命令会报告 SQLite 不可用，而不会阻碍正常的记忆使用。


## 宿主原生版本中的变化

在现有安装上执行 `engram upgrade --latest`（或 `engram link <host>`）之后：

- **Hooks**：Claude 和 Codex 新增 `SubagentStart`，Gemini 新增 `AfterTool`，且新的 hook 条目遵守各宿主的载荷上限。Claude 移除受管的 `PreToolUse` 条目，新增 `InstructionsLoaded` 以及生成的 `.claude/rules/engram/` 规则文件；如需保留旧行为，请先运行 `engram config set hooks.path_rules hook && engram link claude`。普通的 `engram upgrade` 不会刷新 hook 配置。
- **指令**：`link claude` 将受管块写入 `AGENTS.md`，不再创建 `CLAUDE.md`；已有的 `CLAUDE.md` 块会保留。生成的 `SKILL.md` 文件现在遵循 Agent Skills 规范。
- **MCP**：服务器支持 MCP 2026-07-28 以及旧版握手，并且 `engram_commit` 在 Claude Code 和 Codex 中需要逐次调用确认（`engram upgrade` 会重写受管的 Codex 块）。
- **记忆文件**：新记忆省略 `author_email`（运行 `engram author migrate-memories --strip-email --confirm` 可清理旧记忆），规则只存储其 Content，迁移备份存放在被 gitignore 的 `backups/` 文件夹中（`engram repair --move-backups` 可迁移较早的备份）。
- **配置**：新配置中 `vector.enabled` 默认为 `false`；已存储 `true` 的配置保持开启。`cursorrules` 在一个版本内作为 `cursor-rules` 导出格式的已弃用别名。

完整列表以及尚未完成的内容，请参阅[变更日志](changelog.md)中的 Unreleased 部分。

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

- [故障排查](troubleshooting.md)
- [CLI：inject / link / upgrade](../cli/inject-link-upgrade.md)


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

请阅读完整的 [Git 作者设置指南](git-author-settings.md)。


<!-- configuration-upgrade-inventory -->

冲突审阅在 CLI 和 Entry 中使用同一份共享计划。运行 `engram upgrade --latest --review` 可接受最新的类型感知提案、通过 `$VISUAL`/`$EDITOR` 编辑它，或确认 **Keep current**。Entry 提供 **Current**、**Proposed** 和 **Diff** 视图；**Diff** 默认为 **Inline**，可切换为 **Parallel**，删除的内容以红色高亮，新增的内容以绿色高亮。只要 `pendingReviewCount` 不为零，最终应用就会被阻止，而 `engram upgrade --latest --yes` 会拒绝未解决或已过期的决定。每个决定在写入前都会对照其源哈希进行检查。

## 配置升级清单

软件包更新之后，请先运行 `engram upgrade --latest --plan`，再运行 `engram upgrade --latest`。共享清单会扫描工作区和全局中由 Engram 管理的记忆、指令、skillset、配置、hook 和插件。用户编写的字节会被保留；含义不明的混合文件会被报告为冲突，应用前需要显式审阅。参见[配置升级](configuration-upgrades.md)。
