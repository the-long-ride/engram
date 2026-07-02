# 运维指南

## AI 聊天审批

在 AI 代理聊天中，Engram 的审批是对话式的。代理会先展示整理后的 `TYPE: ... | TEXT: ...` 候选内容；如果是规则记忆，还会同时展示 Light/Balanced/Strict 变体。回复 `yes` 表示按当前候选原样保存，回复 `audit` 表示继续修改，回复 `cancel` 表示取消。收到 `yes` 后，代理会使用 `engram save-session --accept-all` 写入刚刚获批的候选内容。直接在 CLI 中保存时，除非明确调用了 accept-all 命令，否则仍然使用 A/B/C。


本页面包含详细的用法，以便 README 可以保持简短。

## 命令集

| 需求 | 命令 |
| --- | --- |
| 加载任务内存 | `engram load "<任务内容>"` |
| 加载智能体紧凑内存 | `engram load --for-agents "<任务内容>"` |
| 打印 AI 智能体使用指南 | `engram llm` |
| 预览路由的内存文件 | `engram load --dry-run "<任务内容>"` |
| 搜索内存 | `engram search "<主题>"` |
| 保存单条内存 | `engram save [rule\|workflow\|knowledge] "<内容>"` |
| 保存多条会话内存 | `engram save-session` 或 `engram ss` |
| 提取近期可访问的聊天 | `engram save-session --query-level 3` |
| 接受所有会话候选 | `engram ss -a` |
| 提取并接受近期会话 | `engram ss -a last 50 sessions` |
| 捕获原始笔记 | `engram observe --file session.md` |
| 转换现有文档/指南 | `engram take-control --all` |
| 预览源接管计划 | `engram take-control --plan` |
| 导入并重构现有指南 | `engram take-control --all --metacognize --accept-all` |
| 重构现有内存文件夹 | `engram metacognize --workspace\|--global\|--all` |
| 解决冲突并进行重构 | `engram resolve-conflicts --metacognize` |
| 检查图路由 | `engram graph "<主题>"` |
| 检查哈希 | `engram verify` |
| 寻找损坏的内存文件 | `engram repair` |
| 归档错误的内存 | `engram archive --reason "<原因>" <id 或文件>` |
| 调整规则强弱度 | `engram set-rule-variant strict\|balanced\|light\|off` |
| 配置默认保存目标 | `engram set-save-target workspace\|global\|both\|status` |
| 配置加载上限 | `engram set-load-limit 1..32\|status\|reset` |
| 配置自动 Hook 读取 | `engram set-read startup\|auto\|always\|manual\|off\|status` |
| 配置证明行显示 | `engram set-proof off\|compact\|status` |
| 安装智能体 Hooks | `engram link codex\|claude\|gemini\|opencode\|cursor\|windsurf` |
| 管理全局隔离配置文件 | `engram profile status\|create\|use\|merge` |
| 克隆工作区/全局内存 | `engram clone-memory workspace global [--metacognize]` |

对于长会话的内存提议，请使用 `save-session`。简写：`ss`。
当人类希望智能体挖掘多达 n 个近期可访问的人类-智能体聊天，而不是仅当前会话时，使用 `--query-level <n>`。自然语言表述如 `engram ss -a last 50 sessions` 会被标准化为 `engram save-session --query-level 50 --accept-all`。

当您想检查哪些内存文件会被路由而不打印其内容时，请使用 `load --dry-run`。
对于 AI 智能体上下文，请使用 `load --for-agents`：它仅保留 frontmatter 中的 `id`、`type`、`tags` 和 `confidence`，渲染一个选定的规则变体，并标注为 `## Rule variants (1/3 based on current: <active>)`。
`load` 默认为面向智能体的主机使用相同的紧凑路由。MCP `engram_load` 方法默认使用 `--for-agents`，因此智能体主机无需重复该标志即可接收紧凑形式。SessionStart hook 在启动时调用相同的路由加载路径，当路由签名未变化时则复用或跳过。
`load` 首先在有意义的查询词上定位路由，忽略如 `rule`、`knowledge` 等通用内存词汇以及常见停用词 (stopwords)。然后它将更广泛的候选池提炼为紧凑的上下文包。正常加载会报告选定和相关的总数，例如 `loaded 8 memory files / 14 total related memories`。`load --dry-run` 显示候选数量、收窄标签和匹配原因；`load --all` 返回每个可见的路由匹配，而不是应用紧凑限制。
`workflow` 和 `workflows` 仍会路由 to 技能内存，但通用类型词汇本身不会创建广泛匹配。

## 依赖层 (Dependency Layers)

当一个内存应该建立在另一个内存之上而不是重复它时，使用 frontmatter `depends_on`：

```yaml
depends_on: [release-foundation]
level: advanced
```

手动编辑后运行 `engram graph --rebuild`。图会报告依赖层，并且 `engram load` 会在更深的内存之前，将路由的先决条件拉入同一个紧凑的上下文包中。图相关的边和向量命中本身不能加载无关的内存；它们只能帮助重新排序或扩展已经与有意义的查询词重叠的内存。显式的 `depends_on` 先决条件仍然可以在没有它们自己的关键词重叠的情况下加载。

## 升级对账 (Upgrade Reconciliation)

安装较新的 Engram 包后使用 `engram upgrade`。该命令会将自 v0.0.8 起初始化的内存根目录与当前发布版本模式进行比较，并刷新生成的 HELP.md、内存索引、图文件、合格的向量侧车、生成的工空间技能集、全局内存脚手架和注册的全局智能体技能集，同时保留人类编写的文件。正常命令也会在每个包版本安静地运行相同的根目录对账，除非设置了 `--no-auto-upgrade` 或 `ENGRAM_NO_AUTO_UPGRADE=1`。
当 `engram save` 发现相关的活动内存时，审批预览会报告它们，并带有建议 of `depends_on` 或可能重复的警告。接受将按原样保存预览；如果要在保存前重构依赖关系或归档重复项，请先拒绝。
对于 `save-session --accept-all`，当这些相关的内存提示出现时，Engram 会在写入前暂停。智能体应使用该响应来构思有结构的重新运行：对于依赖关系添加 `DEPENDS_ON: memory-id` 为依赖关系，当内存比其先决条件更深时添加 `LEVEL: advanced`，或者当候选应合并到可能的重复项中时添加 `UPDATE: memory-id`。

## 配置文件、保存目标和克隆

使用 `set-save-target` 选择常规保存的去向：

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

当个人、公司或团队的全局内存必须保持隔离时，使用 `profile`：

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

使用 `clone-memory` 在工作区和全局范围之间复制活动的 `rules/`、`skills/` 和 `knowledge/` Markdown 文件：

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
```

当您希望通过 `save-session` 审批流提议克隆的内存，而不是逐字复制时，添加 `--metacognize`。

## 重构内存 (Metacognize Memory)

当您希望 AI 智能体审查现有的 Engram 内存文件夹，并通过相同的 `save-session` 审批流提议更安全的结构时，使用 `metacognize`：

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --accept-all
```

该命令在选定范围内验证活动的 `rules/`、`skills/` 和 `knowledge/` 内存，在未提供候选时返回紧凑的源包，然后在批准后仅写入生成的 `TYPE: ... | TEXT: ...` 行。智能体应使用 `UPDATE: memory-id` 进行巩固或词句清理，使用 `DEPENDS_ON: memory-id` 进行分层内存。自然表述如 `engram restructure workspace memory accept all` 会标准化为 `engram metacognize --workspace --accept-all`。

## 保存会话 (Save Session)

当长时间的交互产生了多个候选时，使用 `save-session`：

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` 是可选的。仅当它解释内存存在的原因、来源情况、预期用途或边界时才添加它。简单的客观事实内存可以省略它并使用 Engram 的默认批准上下文。

如果不带 `--accept-all`，Engram 会询问要保存哪些候选。带有 `ss -a` 时，每个生成的候选都会被保存，因为人类显式批准了该快捷方式。
当 accept-all 运行在写入前报告相关内存时，尚未保存任何文件。智能体应使用结构化的候选重新运行，例如：

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

`--query-level` 必须是正整数。智能体应仅包含它们实际可以访问的聊天，且不得虚构不可用的历史记录。`engram ss -a last 50 sessions` 使用 `50` 作为查询级别，并将 `-a` 作为显式的人类 accept-all 批准。

## 接管控制 (Take Control)

`take-control` 有助于在现有仓库中采用 Engram。它扫描智能体指南、笔记、文档和选定的文件，然后向智能体请求简练的候选。

常用选择器：

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --accept-all
```

保存的 take-control 内存会记录 `source_files` 和 `source_hashes`，因此未更改的源在以后会被跳过。
在人类请求的 accept-all 中使用 `--metacognize`，当相关内存提示出现时暂停写入，并让智能体使用 `UPDATE` 或 `DEPENDS_ON` 重新运行。

## 通过重构解决冲突 (Resolve Conflicts With Metacognition)

使用 `resolve-conflicts` 来预览或仅解决属于 Engram 的工作区内存冲突。当智能体应在冲突处理后审查内存文件夹时，添加 `--metacognize`：

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
engram resolve conflicts and metacognize
```

该命令将确定性的冲突处理保持在 `.agents/.engram/` 范围内，然后追加工作区重构源包以获得简练的 `TYPE/TEXT` 候选。

## 观察记录 (Observe)

`observe` 将清理过敏感信息的原始笔记存储在 `inbox/` 中。收件箱笔记不是活动内存。

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<笔记名称>.md
```

当您想在决定哪些内容应成为持久内存之前保留粗略笔记时，请使用此功能。

## 修复和审查

手动编辑或导入后使用 `repair`：

```bash
engram repair
engram rebuild-index
engram verify
```

在归档之前使用图和质量检查：

```bash
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

下一步：[对比与路线图](comparison.md)。
