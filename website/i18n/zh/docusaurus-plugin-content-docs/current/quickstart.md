---
title: "AI 智能体快速入门"
sidebar_position: 2
description: "开始通过您的 AI 智能体使用 Engram。加载内存，执行工作，然后在出现有用的信息时建议持久内存。"
---

# AI 智能体快速开始

## AI 聊天审批

在 AI 代理聊天中，Engram 的审批是对话式的。代理会先展示整理后的 `TYPE: ... | TEXT: ...` 候选内容；如果是规则记忆，还会同时展示 Light/Balanced/Strict 变体。回复 `yes` 表示按当前候选原样保存，回复 `audit` 表示继续修改，回复 `cancel` 表示取消。收到 `yes` 后，代理会使用 `engram save-session --accept-all` 写入刚刚获批的候选内容。直接在 CLI 中保存时，除非明确调用了 accept-all 命令，否则仍然使用 A/B/C。


首先请通过您的智能体来使用 Engram。虽然 CLI 存在，但最好的体验是：要求智能体加载内存、执行工作，然后当产生有用的内容时由智能体提议持久内存。

## 新会话中的第一条消息

询问：

```text
在此任务中使用 Engram。加载关于以下内容的内存：<我们正在做的事情>。
```

如果安装了斜杠命令适配器：

```text
/engram load "<当前任务>"
```

智能体应当仅概括相关的内存标识符 (IDs) 和规则，而不是粘贴每个文件。

当代理需要独立的 Engram 使用指南时，运行：

```bash
engram llm
```

这会打印打包的 `llm.txt` 指南，并且不需要 `engram inject`。

## 推荐的设置对话

询问智能体：

```text
为此工作区初始化 Engram，为此智能体安装正确的技能集（skillset），并告诉我下一步应该使用什么命令。
```

智能体可以运行：

```bash
engram inject
engram help link
engram link <智能体名称>
```

要在全局范围内教授相同的智能体，以便新工作区可以在不先运行 `engram inject` 的情况下加载 Engram 全局内存：

```bash
engram link --global <智能体名称>
```


若要在聊天中直接使用，询问：

```text
安装斜杠支持，以便我可以直接从此智能体使用 /engram。
```

## 日常循环

开始：

```text
/engram load "当前任务"
```

工作期间：

```text
/engram search "我可能遗漏的主题"
```

当智能体学习到一条持久的事实时：

```text
/engram save knowledge
```

当会话产生了几个有用的规则、事实或工作流时：

```text
/engram save-session
```

简写形式：

```text
/engram ss
```

若要包含智能体实际可访问的最近聊天历史：

```text
/engram save-session --query-level 3
```

`--query-level` 必须是正整数。智能体最多只能使用该数量的最近人类-智能体聊天（包括当前会话），并且不得编造不可访问的历史。

仅在您确实需要时才使用一键批准（accept-all）快捷方式：

```text
/engram ss -a
```

`-a` 表示人类明确批准智能体推荐的每个候选。智能体绝不能自己私自添加它。

要在一次请求中提取可访问的最近聊天并接受所有生成候选：

```text
/engram ss -a last 50 sessions
```

它会规范化为 `engram save-session --query-level 50 --accept-all`。

## 导入现有知识

对于已经有 `AGENTS.md`、`CLAUDE.md`、Cursor 规则、笔记或文档的仓库：

```text
/engram take-control --plan
/engram take-control --all
```

如果您想查看选定的文件、跳过的文件、Token 估计以及可能的内存类型，请先使用 `--plan`。

## 全局内存

将全局内存用于应该跨仓库跟随您的偏好设置：

```text
在 <path> 设置全局 Engram 内存，然后全局保存此偏好：
Use pnpm for package management.
```

智能体可以使用：

```bash
engram inject --global-only --global-path <路径>
engram save --scope global "使用 pnpm 进行包管理。"
engram link --global <智能体名称>
```

当 init 检测到配置好的全局内存时，它会为该全局根目录创建或选择一个用户默认的 profile，以便未来的工作区可以重复使用它。

## 保持健康状态

在有意义的工作结束时询问智能体：

```text
检查 Engram 健康状况，报告无效的内存，并提议此会话中任何值得保存的内容。
```

常用命令：

```bash
engram upgrade
engram upgrade --plan
engram verify
engram repair
engram graph "<主题>"
engram quality-check
engram archive --reason "<原因>" <id 或文件>
```

下一步：[人类拥有的内存协议](concepts/write-path.md)。
