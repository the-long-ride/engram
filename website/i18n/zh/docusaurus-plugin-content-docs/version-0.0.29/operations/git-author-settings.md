---
title: Git 作者设置
sidebar_position: 2
description: 配置写入未来 Engram 记忆以及 Engram 创建的 Git 提交中的身份信息。
---

# Git 作者设置

Engram 维护一份作者资料，使记忆的署名明确且可移植。解析出的名称会写入未来记忆的 frontmatter（仅当 `memory.include_author_email` 为 `true` 时才写入邮箱），完整身份则通过进程本地环境变量提供给 Engram 创建的 Git 提交。仓库的 Git 配置不会被更改。

<!-- future-memories-only -->
作者设置**仅影响未来的记忆**。已有记忆只能通过显式的迁移命令更改。

<a id="global-author"></a>
## 全局作者

为所有工作区设置默认的 Engram 身份：

```bash
engram author set --name "Jane Doe" --email "jane@example.com"
engram author show
engram author --help
engram author set --help
```

新的记忆文件只写入 `author_name`。邮箱保留在你的作者资料和 Git 提交中，因此不会出现在已提交的记忆文件里。如需一并写入，请启用可选键 `memory.include_author_email`（默认 `false`）：

```bash
engram config set memory.include_author_email true
```

```yaml
author_name: Jane Doe
author_email: jane@example.com   # opt-in: only with memory.include_author_email: true
```

更新现有记忆会重写其作者字段，因此除非启用了该选项，否则旧版的 `author_email` 会在下一次更新时被移除。

旧版的 `author: jane@example.com` 仍可读取，但新记忆不会再写入它。

<a id="workspace-override"></a>
## 工作区覆盖

工作区可以覆盖全局 Engram 资料，而不影响其他工作区：

```bash
engram author set --scope workspace --name "Workspace Jane" --email "jane@work.com"
engram author show --scope workspace
```

<!-- workspace-never-syncs-global-git -->
工作区覆盖绝不会更改全局 Git 配置。它存储在该工作区中，仅用于该工作区内的记忆和 Engram 创建的提交。

<a id="resolution-order"></a>
## 解析顺序

Engram 按以下顺序解析身份：

1. 工作区 Engram 作者。
2. 全局 Engram 作者。
3. 只读的有效 Git `user.name` 和 `user.email` 回退值。
4. 未解析。

```bash
engram author show
engram author show --json
engram author show --help
```

写入记忆之前，必须提供完整且有效的名称和邮箱。Engram 创建的提交会获得 `GIT_AUTHOR_NAME`、`GIT_AUTHOR_EMAIL`、`GIT_COMMITTER_NAME` 和 `GIT_COMMITTER_EMAIL`；本地和全局 Git 配置保持不变。

在 Entry 中，解析出的名称后面会跟一个紧凑的来源徽章：`WORKSPACE` 表示工作区覆盖，`GLOBAL` 表示 Engram 全局资料，`GIT` 表示 Git 回退，`UNRESOLVED` 表示不存在完整身份。

<a id="remove-an-author-profile"></a>
## 移除作者资料

```bash
engram author unset --scope workspace
engram author unset --scope global
engram author unset --help
```

Web UI 需要确认。CLI 在执行显式的 `unset` 命令后会立即移除该资料。移除之后，解析顺序中的下一个来源将生效。

<a id="global-git-configuration"></a>
## 全局 Git 配置 {#global-git-configuration}

Entry **仅在 Global 标签页**的 **Settings → Git** 下提供现有的全局记忆 Git 设置。它们继续使用共享的配置后端；移动这些控件不会创建第二个 Git 配置存储。

Global 标签页可以编辑 `global_git.enabled`、`global_git.remote`、`global_git.remote_url`、`global_git.branch`、`global_git.auto_sync` 和 `global_git.auto_resolve`。这些字段存在风险，因此 Entry 会校验补丁、显示确切变更的键，并要求在保存前进行审阅。Workspace 标签页绝不会渲染这些全局控件。

<a id="sync-to-global-git"></a>
## 同步到全局 Git

只有全局 Engram 资料可以复制到全局 Git 配置。先预览，再显式确认：

```bash
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author sync-git-global --help
```

确认后的操作会写入 `git config --global user.name` 和 `git config --global user.email`，校验这两个值，并在任一写入或校验失败时恢复先前的确切值。工作区资料永远不符合此操作的条件。

<a id="migrate-existing-memories"></a>
## 迁移现有记忆

在能够得到完整且确定的身份时，回填 `author_name`（仅当 `memory.include_author_email` 为 `true` 时才回填 `author_email`）：

```bash
engram author migrate-memories --plan
engram author migrate-memories --scope workspace --confirm
engram author migrate-memories --scope both --confirm
engram author migrate-memories --help
```

迁移会保留 Markdown 正文，在 `backups/author-v3/` 下写入 `.pre-author-v3.bak` 备份，跳过归档和无效文件，并且是幂等的。它绝不会猜测缺失的名称。在任何写入之前，预览输出会列出符合条件、已是最新、已跳过和无效的文件。

如需移除早期版本已写入记忆文件的邮箱，请使用清除功能。`--strip-email` 默认只做计划，仅在加上 `--confirm` 时才写入；它会保留 `author_name`，移除 `author_email` 以及旧版 `author:` 中的邮箱，刷新哈希和索引，并将原文件备份到 `backups/author-strip-email-<date>/`：

```bash
engram author migrate-memories --strip-email --scope both
engram author migrate-memories --strip-email --scope both --confirm
```

本版本写入的记忆带有名称但不含邮箱，因此较旧版本的 Engram 无法为其建立索引；在依赖仅含名称的记忆之前，请先升级每一位团队成员。

## Entry Web UI

打开 `engram entry`，然后选择 **Settings → Git**。Global 和 Workspace 标签页会显示已存储的资料、解析出的来源徽章、保存前审阅对话框以及记忆迁移预览。Global 标签页另外包含 **Global Git configuration** 和显式的 Git 同步预览；这些控件在 Workspace 中不可见。每个信息按钮都会在新标签页中打开这个本地化页面，并显示对应的 CLI `--help` 命令。

## 隐私与故障排查

名称会成为 Markdown 和 Git 历史中的持久元数据；除非启用 `memory.include_author_email`，否则邮箱地址不会出现在记忆文件中。Engram 创建的提交仍会携带你的作者邮箱，因此请使用与仓库可见性相匹配的地址。如果保存时提示作者未解析，请运行 `engram author show`，设置全局或工作区资料，或配置 Git 回退值。全局 Git 同步绝不会自动执行。
