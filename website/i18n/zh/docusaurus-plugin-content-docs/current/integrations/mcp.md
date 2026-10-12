---
title: MCP 工具
sidebar_position: 11
description: Engram MCP 服务器面向支持 MCP 的宿主暴露加载、搜索和仅提案工具。
---

# MCP 工具 {#mcp-tools}

Engram 附带一个 MCP 服务器二进制文件 `engram-mcp`，用于向支持 MCP 的宿主暴露工具。

## 注册 {#registration}

默认情况下，`engram link <target>` 也会为该目标安装已知的 MCP 注册配置。

| 范围 | 路径 |
| --- | --- |
| 工作区 Claude Code 以及读取 `.mcp.json` 的其他宿主（不包括 Codex，它只读取 `~/.codex/config.toml`；参见全局 Codex） | `.mcp.json` |
| 工作区 Gemini | `.gemini/settings.json` 中的 `mcpServers.engram` |
| 工作区 Cursor | `.cursor/mcp.json` |
| 工作区 OpenCode | `opencode.json` / `opencode.jsonc` 中的 `mcp` 字段 |
| 全局 Claude | 非文件：Engram 打印 `claude mcp add --scope user engram -- engram-mcp`（Claude Code 将用户 MCP 服务器保存在 `~/.claude.json` 中） |
| 全局 Gemini | 合并到 `~/.gemini/settings.json` 中的 `mcpServers.engram` |
| 全局 Codex | `~/.codex/config.toml` 中的受管 `[mcp_servers.engram]` 块 |
| 全局 Antigravity | Gemini MCP 配置文件 |
| 全局 OpenCode | `~/.config/opencode/opencode.jsonc` / `opencode.json` 中的 `mcp` 字段 |
| 全局 Cursor | 捆绑在本地插件中 |
| 全局 Windsurf | `~/.codeium/windsurf/mcp_config.json` |

Windsurf 的工作区 MCP 被跳过，因为官方合约仅记录了用户级 MCP 配置。

当服务器命令位于 `PATH` 上时，命令为 `engram-mcp`，否则为固定到已安装版本的 `npx` 形式（`npx -y --package @the-long-ride/engram@<version> engram-mcp`）；`engram upgrade` 和 `engram link <host>` 会重新固定现有条目。Unlink 仅移除 Engram 条目或受管块，并保留其他服务器和键不受影响。

## 协议版本 {#protocol-versions}

单个 `engram-mcp` 进程服务于两个协议时代：

- **传统时代 (Legacy)**：当客户端的 `protocolVersion` 为 `2024-11-05`、`2025-03-26`、`2025-06-18` 或 `2025-11-25` 时，`initialize` 返回该值，否则返回 `2025-11-25`。未知的版本字符串绝不会原样回显。
- **MCP 2026-07-28**：其 `params._meta` 携带 `io.modelcontextprotocol/protocolVersion` 的请求以无状态方式处理（`server/discover`, `tools/list`, `tools/call`, `resources/*`, `prompts/*`）。它还必须携带 `io.modelcontextprotocol/clientCapabilities`（缺少时返回 `-32602`）。结果携带 `resultType: "complete"`，列表方法会添加 `ttlMs` 和 `cacheScope`。不受支持的现代版本返回带有 `data.supported` 和 `data.requested` 的 `-32022`；在此时代，`ping`、`initialize` 和裸工具方法返回 `-32601`。

标准输出仅承载 JSON-RPC，每行一条消息。

## 服务器指令与工具搜索 {#server-instructions-and-tool-search}

传统的 `initialize` 结果和 MCP 2026-07-28 的 `server/discover` 结果都携带相同的 `instructions` 字符串（最多 512 个字符，自包含）。它向宿主说明何时使用 Engram 工具（回忆项目规则和决策，保存项目知识）以及 `engram_commit` 需要人类介入。Codex 读取前 512 个字符；Claude Code 预先仅加载工具名称加 `instructions`，并将工具定义推迟到工具搜索之后。

`engram-mcp --always-load` 将 `engram_load` 标记为 `_meta["anthropic/alwaysLoad"]: true`，以便 Claude Code 预先加载该工具。Engram 的 Claude hook 已经注入上下文，因此 `engram link` 仅在没有安装或正在安装 Engram Claude hook 时添加该标志，并且仅添加到 Claude Code 读取的配置：`.mcp.json` 和打印的 `claude mcp add --scope user` 命令。Codex、Cursor、Gemini 和 Windsurf 配置绝不会获得该标志。`.mcp.json` 中的现有 `engram` 条目仅在使用 `--force`、`engram upgrade` 或刷新时更改。即使对于支持审批对话框的客户端（见下文），`engram-mcp --no-elicitation` 也会保持聊天 `approval_token` 流程。未知的 `engram-mcp` 选项会被忽略，并在 stderr 上附带提示。

## 工具 {#tools}

| 工具 | 用途 | 写入 |
| --- | --- | --- |
| `engram_load` | 为任务路由并返回记忆（`query`, `id`, `budget_tokens`, `disclosure`, `full`, `explain`） | 否 |
| `engram_route` | 对任务进行分类并列出其路由到的记忆 | 否 |
| `engram_search` | 按查询搜索记忆 | 否 |
| `engram_verify`, `engram_status` | 检查哈希；报告运行状况和计数 | 否 |
| `engram_save`, `engram_save_session` | 返回带编号的提案和 `approval_token` | 否 |
| `engram_commit` | 写入已批准的提案 | 是，在人类批准后 |
| `engram_set_role`, `engram_set_rule_variant` | 更新角色或规则变体模式 | 是 |
| `engram_note` | 将经过编辑的工作层任务笔记保存到工作层（`text`, `objective`, `type`, `scope`）；返回 `{id, file, valid_until}` | 是，在一次是/取消批准后 |

`engram_load` 默认采用[读取路径与路由](../concepts/read-path.md)中描述的分层输出；传递 `full: true` 可获得更广泛的传统输出。`budget_tokens` 与 `id` 一起使用时无效。

## 结构化结果 {#structured-results}

人类可读文本位于 `content[0].text` 中。`structuredContent` 是 `{contract_version, ok, data, diagnostics}` 包装，其中 `data` 携带：

- `engram_load`：`selected_keys`, `body_keys`, `card_ids`, `omitted_ids`（因 token 预算削减的 ID，可通过 `id` 获取），以及 `tokens`。
- `engram_search` 和 `engram_route`：带有 `id`, `type`, `scope`, 和 `score` 的 `entries`。路由条目按加载顺序排列，未按分数排序。

## 批准与提交 (Commit) {#approval-and-commit}

`engram_save` 和 `engram_save_session` 是**仅提案**的：它们返回预览和 `approval_token`。在人类于聊天中批准确切的候选者后，使用 `approval_token` 以及 `approve: "all"` 或从 1 开始的候选者编号列表调用 `engram_commit`。它通过与 `save-session --force` 相同的路径进行写入，因此相关或重复的候选者会照常被推迟。

- Token 是随机的，绑定到工作区，单次使用，并在 30 分钟后过期。
- 仅将 token 的哈希值存储在被 gitignore 的 `pending-approvals.json` 中；编辑待处理的候选者会导致完整性检查失败。
- 切勿在人类批准显示的候选者之前调用 `engram_commit`。
- `engram_commit` 在 `tools/list` 中携带 `_meta["anthropic/requiresUserInteraction"]: true`，这使得 Claude Code 在每次调用时都会进行提示，即使在绕过模式下也是如此。受管 Codex 块添加了带有 `approval_mode = "approve"` 的 `[mcp_servers.engram.tools.engram_commit]`，并且当 Gemini `mcpServers.engram` 条目设置了 `trust: true`（这将跳过确认）时，`engram doctor` 会发出警告 (`host.gemini_trust`)。
- 每个候选者都带有一行确定性的 `Verdict:`（`ADD`, `UPDATE <id>`, `SUPERSEDE <id>`, `NOOP duplicate of <id>`）。Token 锁定了裁定，并且 `engram_commit` 仅在重新计算的裁定仍然匹配时才应用 `SUPERSEDE`。
- `approval_token` 被返回给代理。它证明提案存在，而不是人类批准了它。人类关卡是宿主针对 `engram_commit` 的每工具权限提示，因此切勿将 `mcp__engram__engram_commit`（或您宿主的等效项）列入允许列表或自动批准。

### 审批对话框 (Elicitation) {#approval-dialog-elicitation}

当客户端声明表单引出能力时，`engram_save` 和 `engram_save_session` 会在宿主自身的对话框中询问人类，而不是返回 token：

- 表单列出带有 `ADD`/`UPDATE` 和 ID 标题的候选者编号（绝不显示记忆文本）以及保存范围；`both` 可以缩小到一个范围，绝不能扩大。
- `accept` 通过与 `engram_commit` 相同的路径准确写入所选候选者。不返回 `approval_token`。
- `decline` 撤销该提案：随后带有其 token 的 `engram_commit` 将失败并显示 `approval was declined in the approval dialog`。无效回答也会将其撤销。
- `cancel`、60 秒超时或客户端错误会回退到上面的 token 文本，前缀为 `nothing was saved`，以便声明引出但关闭对话框的宿主能够继续工作。自动拒绝的宿主需要 `engram-mcp --no-elicitation`。
- 传统客户端接收服务器到客户端的 `elicitation/create` 请求。MCP 2026-07-28 客户端接收一个 `input_required` 结果，其 `requestState` 是一个经过 HMAC 密封、具有有效期的包装，绑定到工具、工作区和参数；它们使用 `inputResponses` 和该 `requestState` 重试 `tools/call`。伪造、过期或不匹配的状态返回 `-32602` 且不写入任何内容。服务器重启会使打开的状态失效，因此代理需要重新提议。
- 没有该能力且带有 `--no-elicitation` 的调用使用未更改的 token 流程。

### 工作层笔记 {#working-tier-notes}

`engram_note` 将一条简短的任务笔记保存到被 gitignore 的 `working/` 层（`source: note`, `tier: working`, `valid_until` = 今天 + `load.working_ttl_days`）。在预览之前，文本会被编辑并拒绝类似指令的行。人类通过上述相同的对话框、`input_required` 重试或 `approval_token` 流程回答一次“是/取消”提示；`decline`、`cancel` 和超时不写入任何内容。笔记绝不会更新具有相同 ID 的持久记忆，而 `engram promote` 是使其变得持久的唯一途径。除非 `ENGRAM_SESSION_OBJECTIVE` 与笔记的目标相匹配，否则 SessionStart 会省略笔记；否则它将显示为单行卡片。该工具带有 `readOnlyHint: false` 且没有 `destructiveHint`。

## 强制规则 {#force-rule}

显式的 `/engram save-session --force` 请求（包括快捷方式 `/engram ss -f`）应使用 CLI 写入路径。计数的快捷方式 `/engram ss -f last 50 sessions` 应使用 `engram save-session --query-level 50 --force`。仅 MCP 宿主通过 `engram_commit` 提交。

## OpenCode MCP 条目 {#opencode-mcp-entry}

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

MCP 服务器实现了标准 JSON-RPC 握手（`initialize`, `notifications/initialized`, `tools/list`, 和 `tools/call`）并响应 `ping`。记忆也作为 MCP 资源公开（`engram://index` 列出单行卡片，`engram://memory/{id}` 读取与 `engram load --id` 相同的主体并计为一次提取），并且一个提示 `propose` 返回记忆提案协议。`resources/list` 返回索引加上按使用量排序的前 `mcp.resource_limit` 个记忆（JSON 配置，默认 20，0 到 200）。读取工具带有 `annotations.readOnlyHint: true`。格式错误的 JSON 行会收到 `-32700` 错误响应，服务器继续运行。没有 `id` 的请求是通知，不接收任何响应，而非 `tools/call` 的纯方法调用将返回纯文本。

## 后续步骤 {#next-steps}

- [Agent 集成概览](overview.md)
- [Hook 与证明行](hooks.md)
