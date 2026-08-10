---
title: Git 作者设置
sidebar_position: 2
description: 配置将写入未来 Engram 记忆和 Git 提交的身份。
---

# Git 作者设置

Engram 拥有作者配置文件，使记忆归属明确且具可移植性。

<!-- future-memories-only -->
作者设置**仅影响未来的记忆**。

<a id="global-author"></a>
## 全局作者

为所有工作区设置默认 Engram 身份：

```bash
engram author set --name "Jane Doe" --email "jane@example.com"
engram author show
engram author --help
engram author set --help
```

新文件使用独立的 `author_name` 和 `author_email` 字段。

<a id="workspace-override"></a>
## 工作区覆盖

工作区可以覆盖全局 Engram 配置文件：

```bash
engram author set --scope workspace --name "Workspace Jane" --email "jane@work.com"
engram author show --scope workspace
```

<!-- workspace-never-syncs-global-git -->
工作区覆盖绝不同步全局 Git 配置。

<a id="resolution-order"></a>
## 解析顺序

```bash
engram author show
engram author show --json
engram author show --help
```

Engram 按以下顺序解析身份：
1. 工作区 Engram 作者。
2. 全局 Engram 作者。
3. 只读 Git 回退值。
4. 未解析。

在 Entry 中，解析出的源带有 `WORKSPACE`、`GLOBAL`、`GIT` 或 `UNRESOLVED` 徽章。

<a id="remove-an-author-profile"></a>
## 删除作者配置文件

```bash
engram author unset --scope workspace
engram author unset --scope global
engram author unset --help
```

使用 `engram author unset --scope workspace` 或 `--scope global`。

<a id="global-git-configuration"></a>
## 全局 Git 配置

Entry 仅在 **设置 → Git** 的全局选项卡中显示 Git 设置。

<a id="sync-to-global-git"></a>
## 同步到全局 Git

```bash
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author sync-git-global --help
```

仅全局配置文件可以复制。先预览，然后使用 `--confirm` 执行。

<a id="migrate-existing-memories"></a>
## 迁移现有记忆

```bash
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

使用 `engram author migrate-memories --plan` 和 `--confirm` 填充 `author_name` 和 `author_email`。
