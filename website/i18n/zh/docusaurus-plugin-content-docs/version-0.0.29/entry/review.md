---
title: Review 标签页
sidebar_position: 5
description: 解决审查发现的问题、指引 AI agent，并明确确认后备记忆写入。
---

import RiskCallout from '@site/src/components/RiskCallout';

# Review 标签页

Review 是处理审查发现和暂缓候选记忆的受控路径。它本身从不调用 AI 服务商。你可以查看上下文，复制受控 prompt 给 AI agent，然后让该 agent 通过终端保存，或者明确确认粘贴的响应。

## 队列与上下文

队列整合了审查发现与收件箱暂缓候选内容。选择一项以查看其摘要、关联记忆元数据及完整内容。空文件或不可用的关联文件会被如实报告，而不会中断队列中其余内容的审查。

## AI 审查 Prompt

选择任意关联记忆作为依赖或替代项，然后点击 **Copy AI review prompt**。Prompt 仅包含选中的候选记忆、可见记忆上下文、关系指令以及要求的写入作用域。

当 AI agent 拥有终端访问权限并获准写入时，它应使用 prompt 中内嵌的命令保存经过脱敏的结果。应用内的路径是后备方案，而非自主写入路径。

## 粘贴、Diff 与确认

仅粘贴经过 AI 审查的记忆提议。Review 会显示只读行 diff：删除行显示为红色，新增行显示为绿色。点击 **Approve & write** 会在 Engram 验证并写入提议之前打开确认对话框。

<RiskCallout level="risky">
确认后会立即写入工作区或全局记忆。确认前请仔细审查提议、作用域以及任何替换指令。
</RiskCallout>

只能选择一个替换关系。依赖关系可以独立选择。保存后刷新队列即可载入最新状态。

## 后续步骤

- [Construct 标签页](construct.md)
- [Memories 标签页](memories.md)
- [CLI: save-session](../cli/save-session.md)
