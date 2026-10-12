---
title: Hook 与证明行
sidebar_position: 12
description: Engram agent hook 在会话启动和提示轮次中注入经过路由的记忆。证明行使注入过程清晰可见。
---

# Hook 与证明行 {#hooks-and-proof-lines}

Agent hook 是可选启用的宿主 hook，当宿主在提示时暴露安全的上下文通道时，它会在会话启动时以及之后的任务切换轮次中注入经过路由的 Engram 上下文。

## 安装 hook {#install-hooks}

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

使用 `--global` 进行用户级配置，使用 `engram unlink` 仅移除 Engram 管理的 hook 条目。

## 读取模式 {#read-mode}

`engram set-read startup|auto|always|manual|off` 控制运行时行为：

- `auto` 在会话启动时和之后的提示轮次中加载，仅注入该会话中尚未交付过的记忆主体。
- `startup` 仅在会话启动时加载。
- `always` 在每个符合条件的轮次中重新注入。
- `manual` 和 `off` 减少自动化程度。

Hook 缓存存储哈希值、会话 ID、宿主、当前工作目录 (cwd) 以及每个会话已交付的记忆键 — 绝不存储原始提示文本。

## 增量注入 (Delta injection) {#delta-injection}

对于每个（宿主、cwd、会话），hook 会记录已交付的键。提示轮次仅注入尚未交付的主体，并以一行 `already loaded: <ids>` 结尾表示其余部分；没有任何新内容的轮次仅注入该行（启用证明时带有证明行），未路由到任何内容的轮次则不注入记忆。`SessionStart` 和 `PreCompact` 会重置该集合，因此在新会话或上下文压缩后，记忆会再次交付。超过 7 天的记录会被清理，最多保留 200 条。OpenCode 仅保留单个系统提示插槽，因此其插件会替换或保留当前插槽，而不是发送严格的增量。

## 有效负载上限 {#payload-caps}

宿主会截断过大的 hook 输出，因此 hook 会按各宿主自身的单位测量呈现的 `additionalContext`：Codex 上最多 2,400 个 token（UTF-8 字节 / 4；Codex 将消息限制在约 2,500 个 token），Claude 上最多 9,500 个字符（限制为 10,000），其他地方为 `load.max_tokens`。当文本超出上限时，hook 会以更小的预算重新规划，因此主体降级为单行卡片，排名最低的卡片被忽略；主体绝不会在文本中途中断。同样的上限覆盖 `SubagentStart` 和路径触发器输出，并且只有实际发送的主体才会被记录为已交付。`already loaded:` ID 经过排序，证明 `sig` 对排序后的路由键进行哈希，因此相同的路由集合始终输出完全相同的字节。

## 路径范围触发器 {#path-scoped-triggers}

Claude、Codex 和 Gemini 的 hook 安装还会注册路径触发器。Codex 始终使用 `PreToolUse`，Gemini 使用 `AfterTool`。Claude 在 `hooks.path_rules native`（默认）下使用 `InstructionsLoaded`，在 `hooks.path_rules hook` 下使用 `PreToolUse`：

- Claude `InstructionsLoaded`（匹配器 `path_glob_match`，异步，忽略输出）在 Claude 加载生成的 `.claude/rules/engram/<id>.md` 文件时触发，并将该记忆记录在已交付集合和 `usage.json` 中。规则文件本身承载主体，因此不会发生重复注入。
- Claude `PreToolUse`（hook 模式）匹配 `Read`、`Edit`、`Write` 和 `MultiEdit` 并使用 `tool_input.file_path`。
- Codex 没有读取或多重编辑工具，且 `PreToolUse` 不会在读取时触发，因此只有通过 `apply_patch` 编辑的文件才会触发。
- Gemini `AfterTool`（匹配器 `read_file|write_file|replace`，超时以毫秒计）从工具输入中读取触及的路径并将记忆追加到工具结果中，因此它们在读取后一步到达。Gemini 的匹配器是未锚定的正则表达式，因此 hook 也会针对名称仅包含 `replace` 的工具启动；针对它们会以 `{}` 退出。它与 `BeforeAgent` 共享已交付集合。

当触及的路径（相对于工作目录）匹配尚未交付记忆的 `applies_to` glob 时，hook 每个事件最多注入 3 个主体作为 `additionalContext`。它从不返回权限决定，因此无法阻止工具调用，且工作目录之外的路径会被忽略。指出真实文件路径的提示文本也算作 `applies_to` 记忆的锚点。

运行一次 `engram upgrade --latest`（或再次运行 `engram link <host>`）以将路径触发器（`InstructionsLoaded` 或 `PreToolUse`）和 `PreCompact`（Gemini: `PreCompress`）添加到旧安装中；现有的 Claude 安装在刷新时会从 `PreToolUse` 切换到 `InstructionsLoaded`，因此请先运行 `engram config set hooks.path_rules hook` 以保留 `PreToolUse`；普通 `engram upgrade` 不会刷新 hook 配置。Claude、Codex 和 Cursor 以秒为单位读取 hook `timeout`；受管条目写入 `10`。

## Subagent (子代理) {#subagents}

Claude 和 Codex 的 hook 安装还会注册 `SubagentStart`（匹配器 `*`，所有代理类型）。它将路由的 `current session` 上下文作为附加上下文注入子代理，且从不返回决定。子代理 hook 携带父级的 `session_id`，因此子代理的已交付集合以 `<session_id>#agent:<agent_id>` 为键，父级的集合永远不会被触及；最多保留 100 条子代理记录，以确保它们不会逐出父会话。Codex 的 `SubagentStart` 输出省略了 `suppressOutput`，Codex 没有为该事件列出该属性。适用相同的有效负载上限。已知局限：Codex 未在 `PreToolUse` 上记录 `agent_id`，因此 Codex 子代理内部的路径触发器可能会记录在父级的已交付集合中。

## 会话转录队列（可选） {#session-transcript-queue-opt-in}

`engram link claude --session-end` 和 `engram link codex --session-end` 还会注册 `SessionEnd` 命令 hook（Claude 超时 5 秒，Codex 3 秒）。它是一个普通的命令 hook：不注入任何内容，回复 `{}`，故障开放，仅将 `{ transcript_path, host, session, at }` 追加到工作区记忆文件夹中被 gitignore 的 `session-queue.json`。条目在文件锁下写入，按宿主和会话去重，最多保留最新的 50 条。该标志默认处于关闭状态，`engram upgrade` 从不添加它（保留现有条目），`engram unlink` 会将其移除，且未注册 Gemini。存储的路径是绝对路径并包含您的操作系统用户名，因此该文件绝不会离开您的计算机。

使用 `engram observe --queue` 清空队列（`--dry-run` 仅检查，`--limit n` 限制每次运行的条目数）。每个转录文件必须存在、是常规文件（非符号链接或硬链接），且大小最多为 5 MiB。它会经过密级处理、剔除类似注入的行，并作为跟踪信息加上绝不提及绝对路径的收件箱包装进行存储。跳过或存储的条目离开队列；达到收件箱配额（可选 `.agents/engram.transcripts.json` 中的 `max_files`）的条目留在队列中。不写入任何记忆：使用 `engram save-session --file <inbox file>` 和标准审批关卡来晋升收件箱文件。请自行运行 `observe --queue` 或从普通命令 hook 运行，不要从异步 Codex hook 运行。

## 证明模式 {#proof-mode}

`engram set-proof off|compact` 控制支持的 hook 是否还在每个符合条件的轮次中追加紧凑的 `Engram proof:` 行。证明的可见性独立于 `set-read`：`compact` 可以在不改变何时注入完整 Engram 记忆的情况下报告已加载、重用或跳过的轮次。

## Hook 能力矩阵 {#hook-capability-matrix}

| 宿主 | 配置路径 | 事件 |
| --- | --- | --- |
| `codex` | `.codex/hooks.json`; 全局 `~/.codex/hooks.json` | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PreCompact`, `SubagentStart`（可选 `SessionEnd`） |
| `claude` | `.claude/settings.json`; 全局 `~/.claude/settings.json` | `SessionStart`, `UserPromptSubmit`, `InstructionsLoaded`（当 `hooks.path_rules hook` 时为 `PreToolUse`）, `PreCompact`, `SubagentStart`（可选 `SessionEnd`） |
| `gemini` | `.gemini/settings.json`; 全局 `~/.gemini/settings.json` | `SessionStart`, `BeforeAgent`, `AfterTool`, `PreCompress` |
| `cursor` | `.cursor/hooks.json`; 全局插件 `hooks/hooks.json` | `sessionStart` |
| `windsurf` / `cascade` | `.windsurf/hooks.json`; 全局 `~/.codeium/windsurf/hooks.json` | `pre_user_prompt` |
| `opencode` | `~/.config/opencode/plugins/engram.js` | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | 未写入 | 不适用 |
| `cline` | 未写入 | 不适用 |

## 后续步骤 {#next-steps}

- [Agent 集成概览](overview.md)
- [CLI: inject / link / upgrade](../cli/inject-link-upgrade.md)
