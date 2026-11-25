---
title: 配置升级
sidebar_position: 3
description: 预览、审阅并安全地升级由 Engram 管理的记忆与已连接 agent 的配置。
---

# 配置升级

Engram 为 CLI 和 Entry Web UI 使用同一个升级清单引擎。它会扫描已配置的**工作区（workspace）**和**全局（global）**作用域，对由 Engram 管理的工件进行分类，生成确定性的计划，并利用哈希/指纹来防止过期写入。

```bash
engram upgrade --latest --plan
engram upgrade --latest --review
engram upgrade --latest
engram upgrade --latest --yes
engram upgrade --help
```

`--plan` 是只读的。面向人类的输出按工件类型分组，顺序为：Config、Instructions、Memories、Skillsets、Hooks、Plugins。`--plan --json` 会输出同样的分组计划、其指纹、审阅状态以及 `pendingReviewCount`。UI 的类型标签页使用确切的标签：`All`、`Config`、`Instructions`、`Memories`、`Skillsets`、`Hooks`、`Plugins`。

## Engram 检测什么

清单涵盖已知 Engram 位置或已注册的已连接 agent 安装中的 `memory`、`instruction`、`skillset`、`config`、`hook` 和 `plugin` 工件。工作区和全局根目录会分别扫描；Engram 不会递归遍历任意的主目录树。

Engram 首先信任显式的 schema/版本元数据和已注册的安装元数据。没有标记的旧版文件则回退到已知的受管结构和预期内容。每个条目都会被分类为 `current`、`outdated`、`conflict` 或 `invalid`。

## 类型感知的替换与合并

冲突意味着**需要审阅**，而不是永久被阻止。在用户确认替换/合并决定之前，Engram 会保留用户的编辑。

- **Instructions（指令）：**Engram 提议最新的受管块，同时保留 Engram 标记之外的用户文本。由 Engram 拥有的整个指令文件可以被替换。
- **Skillsets：**Engram 提议最新的 Engram 管理内容。当格式支持时，明确属于用户的部分会被保留。
- **Config（配置）：**Engram 解析配置并提议合并后的迁移：已知的 Engram 键被升级，在需要时补充新的默认值，无关的用户键/值会被保留。
- **Memories（记忆）：**Engram 执行 schema 迁移，而不是模板替换。
- **Hooks/plugins：**仅当所有权可被证明时，生成的工件才会被替换。含义不明的用户代码仅供审阅，并可确认为 **Keep current**。

## Entry Web UI 冲突审阅

Updates 页面现在采用紧凑的仪表盘：**状态横幅**报告配置是否已是最新、需要更新，或需要冲突审阅；**Workspace**、**Global** 和 **Conflicts** 摘要卡片一目了然地显示关键数量。预览之后，每个可操作的条目都出现在一个**可操作工件表**中，其列为 Artifact、Scope、Agent(s)、Status、Review 和 Actions。该表在窄屏上保持结构完整，并使用一个共享的**水平滚动**容器，而不是每行各自的滚动条。

打开 `engram entry`，然后进入 **Settings → Updates**。侧边栏的**复制命令**操作会复制 `engram upgrade --latest --plan`，且无需离开当前页面。预览包含 `All` 以及仅限可操作类型的标签页：`Config`、`Instructions`、`Memories`、`Skillsets`、`Hooks` 和 `Plugins`。

每个冲突都有一个 **Review** 操作。弹窗提供 **Current**、**Proposed** 和 **Diff** 视图。**Current** 是只读的。对于可替换的 Config/Instruction/Skillset 条目，**Proposed** 是可编辑的，并以 Engram 类型感知的合并/替换结果为起点。**Diff** 默认为 **Inline**，可切换为 **Parallel**。Inline 用红色背景上的 `-` 标记删除的行，用绿色背景上的 `+` 标记新增的行；Parallel 将 **Current** 和 **Proposed** 的行对齐，并使用相同的红/绿高亮。可使用 **Use latest**、**Reset proposed**、**Keep current**，或者——当 Engram 能证明所有权时——使用 **Force upgrade**，然后点击 **Confirm change**。

**Open in editor** 会打开由服务器解析出的确切当前工件，依次使用 `$VISUAL`、`$EDITOR`，然后是平台回退项。浏览器绝不会提供文件系统路径。对于 **Instructions**，**Proposed** 只包含受管的 `<!-- engram:start -->` 块；完整的全局 skillset 仍保留在配套的 `.agents/engram.md` 指南中。如果外部编辑改变了该文件，预览/源哈希（source hash）就会过期，必须在确认之前刷新审阅。

符合条件的待处理可替换冲突带有选择复选框。**Select all visible** 会选中当前类型标签页中符合条件的行；切换标签页时选择会保持。**Confirm selected changes** 对已勾选的行接受 **Use latest**，而 **Confirm all changes** 则对完整预览中所有符合条件的待处理冲突接受 **Use latest**。不可替换、已过期以及已审阅的行无法被选中。在进行一次原子性的审阅存储写入之前，服务器会对照预览指纹、当前源哈希、审阅状态和生成的提案校验整个批次。如果任何一个已选条目校验失败，则不会保存任何批量决定。

Entry 在整个升级审阅中使用相同的自定义复选框样式：选中、键盘焦点和禁用状态在视觉上有明显区别。结果提示（toast）在成功时使用绿色边框/光晕，在错误时使用红色边框/光晕。

页面会显示审阅进度。在每个冲突都被明确解决为接受最新版、编辑后的提案、**Force upgrade** 或 **Keep current** 之前，最终的 Upgrade 操作保持禁用。最后的确认会汇总自动更新、已接受的提案、已编辑的提案、强制替换、保持当前的文件以及备份。

## 感知所有权的强制升级

Engram 按**物理文件**规范化已连接 agent 的升级清单，因此即使 Codex、Claude、Gemini 或其他已注册宿主都指向同一个共享指南（例如 `.agents/engram.md`），它也只会被表示一次。宿主列表仍作为元数据可见，但一个物理文件只会获得一份规范的渲染输出和一次写入事务。

**Force upgrade** 有意比 **Use latest** 更窄。只有当 Engram 能证明所有权边界时才会出现：

- **受管区域（Managed region）：**Engram 只替换带标记的 Engram 块，并保留其之外所有用户编写的字节，包括文件的 CRLF/LF 换行风格。
- **生成的文件（Generated file）：**Engram 可以替换整个已注册/生成的 Engram 文件，包括该 Engram 拥有的文件内部的手动编辑。
- **所有权未知（Unknown ownership）：**不提供 Force upgrade 操作；请使用 **Keep current**，或先解决所有权上的歧义。

批量控件绝不会强制。**Confirm selected changes** 和 **Confirm all changes** 仅限于安全的 **Use latest** 决定。强制决定需逐项审阅，并且如果预览之后源哈希、所有权证据或强制模式发生变化，就会被拒绝。

写入完成后，Engram 会重新扫描已升级的物理工件。预期已更新的条目必须收敛到 `current`；失败或已回滚的事务，或仍为 `outdated`/`conflict` 的条目，会使整个应用报告错误，而不是显示成功提示。明确的 **Keep current** 条目不在该收敛要求之列。

## CLI 冲突审阅

运行：

```bash
engram upgrade --latest --review
```

交互式审阅器会逐个处理未解决的冲突：

```text
[V] View diff
[E] Edit proposed content
[L] Accept latest proposal
[K] Keep current
[Q] Save and quit
```

`E` 会依次使用 `$VISUAL`、`$EDITOR`，然后是平台回退项，打开一个临时的提案文件。Engram 在接受编辑后的提案之前会先校验它。决定会按计划指纹持久化在 Engram 状态目录下，因此 `Q` 可以停止会话，之后的 `--review` 会恢复已保存的决定。

用于自动化：

```bash
engram upgrade --latest --yes
```

`--yes` 绝不会自行编造冲突决定。如果仍有任何冲突处于待处理或已过期状态，Engram 会以非零状态退出，并提示你运行 `engram upgrade --latest --review`。

## 过期审阅保护

每个已审阅的条目都会记录其源哈希。应用之前，Engram 会将当前源哈希与已审阅的源哈希进行比较。如果文件在审阅之后发生变化，该决定就会变为过期/待处理，必须重新审阅。计划指纹还能防止应用与已审阅清单不同的另一份清单。

## 事务组、备份与回滚

已接受的替换和合并与安全的自动升级使用相同的事务路径。Engram 会捕获原始字节和权限，在需要时创建备份，校验提议的内容，通过临时文件写入，并原子地重命名到位。一次失败的持久转换会回滚其所在的事务组。**Keep current** 不执行任何写入。

## 向量索引失败时放行（fail-open）

向量搜索是可选的加速层。Engram 使用与整数兼容的 `BigInt` 值绑定 `sqlite-vec` 的 `memory_vectors` 主键。如果向量重建失败，Engram 会移除不完整的向量 sidecar/WAL/SHM，报告降级警告，并继续持久的词法/图升级。仅向量的失败不会中止原本有效的配置升级。

## 软件包版本与配置状态

新的 npm 软件包与过期的本地配置是两个独立的信号。推荐的发布流程：

```bash
npm install -g @the-long-ride/engram@latest
engram upgrade --latest --plan
engram upgrade --latest --review
engram upgrade --latest
```

对于已是最新的工件，重新运行升级是幂等的。已审阅的 `Keep current` 文件会保持不动，除非其状态发生变化并需要新的审阅。
