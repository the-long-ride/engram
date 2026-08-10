---
title: 发布与升级流程
sidebar_position: 2
description: 安全地升级 Engram 包并对账内存根目录。
---

# 发布与升级流程

## 在 npm 包更新后

下一次执行普通的 Engram 命令时，它会为新版本静默地在后台对已初始化的工作空间/全局根进行一次对账。当检测到旧的元数据时，这会通过刷新生成的帮助信息、内存索引、图文件以及符合条件的向量 sidecars 来涵盖从 v0.0.8 版本起的各个版本间内存模式变更。

首次运行后，启动检查的开销被有意地优化得极低：当已经记录了当前版本时，它仅读取微小的配置标记。它不会从 npm postinstall 触发运行、不会创建新的内存根目录，也不会替换人类撰写的文件。可使用 `--no-auto-upgrade` 或 `ENGRAM_NO_AUTO_UPGRADE=1` 针对某条命令跳过此检查。

## 显式升级

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

`engram upgrade` 会刷新生成的工作空间帮助信息、内存索引、图文件、符合条件的向量 sidecars、现有的 Engram 生成的工作空间技能集文件以及已注册的全局技能集，同时保留由人类编写的文件。

`engram upgrade --latest` 则更加强力：它会重写当前由 Engram 托管的已链接工作空间智能体以及已注册的全局安装的链接智能体生成物，包括指令文件、规则、MCP/插件配置以及托管的钩子（hooks），使已链接的宿主环境能够立即获得新版包的输出。

仅在有意替换生成的 Engram 适配器文件时使用 `--force`。

## 技能集渲染配置文件

对于具有运行时运行能力的宿主环境，Engram 会安装轻量级的引导指令（bootstrap instructions），而不是完整的协议。钩子提供路由后的任务上下文，MCP 工具提供加载/搜索/提案行为，而斜杠适配器或 Agent Skills 携带详细的命令工作流。在不具备可靠运行时上下文注入的备用目标中，仍将接受紧凑的手动指令。

## SQLite 配置数据库备用方案

Engram 的 SQLite 配置数据库是工作空间/配置文件管理的一项优化。如果无法打开或初始化该数据库，普通的读/写命令将回退到 JSON配置快照。特定于数据库的命令会报告 SQLite 不可用，而不是阻止普通的内存使用。

## 下一步

- [故障排除](troubleshooting.md)
- [CLI: inject / link / upgrade](../cli/inject-link-upgrade.md)

## Legacy memory migration to schema v3

`engram upgrade --latest` also migrates active v1/v2 memory files in the workspace and configured global roots to schema v3. Engram preserves each Markdown body exactly, creates `<memory-file>.pre-v3.bak`, fills only deterministic metadata, refreshes integrity hashes, and rebuilds the index, graph, and eligible vector sidecars. It never invents `evidence_refs`; a memory without verified trace links is marked `evidence_status: unverified`. Invalid memories are reported and skipped, archived memories are not rewritten, and a second run is idempotent.

Preview all changes without writing:

```bash
engram upgrade --latest --plan
```

Run only the memory migration, without overwriting linked agent artifacts:

```bash
engram upgrade --migrate-memories
```

Skip memory migration during a latest upgrade:

```bash
engram upgrade --latest --no-migrate-memories
```

<!-- configuration-upgrade-inventory -->

冲突评审在 CLI 和 Entry 中使用相同的共享计划。运行 ngram upgrade --latest --review 以接受最新的按类型合并/替换建议，通过 $VISUAL/$EDITOR 进行编辑，或确认 **Keep current**。Entry 提供 **Current**、**Proposed** 和 **Diff** 视图；**Diff** 默认为 **Inline** 模式，并可切换至 **Parallel**，删除的内容高亮显示为红色，新增的内容高亮显示为绿色。当 pendingReviewCount 不为零时，最终应用将被阻止，并且 ngram upgrade --latest --yes 会拒绝未解决或过期的决策。写回前会根据源哈希对每个决策进行校验。

## 具备所有权感知的配置对齐

最新升级清单按物理文件对已注册的集成进行去重。如果多个 Host 共享同一个 Engram 指南，Engram 只会渲染并写入该文件一次。

当手动编辑导致正常的替换不安全时，Entry 仅在所有权可证明时提供 **Force upgrade**。对于标记的 Engram 块，强制替换仅替换该 Engram 块并保留周围的用户文本。对于注册/生成的 Engram 文件，强制替换可以替换整个生成的文件。未知的所有权绝不能强制替换，批量确认也决不执行强制操作。

写回后的重新扫描将验证是否成功应用。未收敛至 current 的预期的更新文件将被报告为验证错误。

## Git author identity

Engram can store a global author and an optional workspace override. Resolution is workspace, global, then read-only Git fallback. Settings affect future memories only; a workspace override never changes global Git configuration. Use explicit plan and confirmation for global Git sync or legacy-memory migration.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Read the complete [Git author settings guide](git-author-settings.md).
