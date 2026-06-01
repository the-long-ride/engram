# AI 智能体快速开始

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

智能体应该只总结相关的内存 ID 和规则，而不是粘贴每一个文件的内容。

## 推荐的设置对话

询问智能体：

```text
为此工作区初始化 Engram，为此智能体安装正确的技能集（skillset），并告诉我下一步应该使用什么命令。
```

智能体可以运行：

```bash
engram init
engram help install-skillset
engram install-skillset <智能体名称>
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

仅在您确实需要时才使用一键批准（accept-all）快捷方式：

```text
/engram ss -a
```

`-a` 表示人类明确批准智能体推荐的每个候选。智能体绝不能自己私自添加它。

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
engram init --global-only --global-path <path>
engram save --scope global "Use pnpm for package management."
```

## 保持健康状态

在有意义的工作结束时询问智能体：

```text
检查 Engram 健康状况，报告无效的内存，并提议此会话中任何值得保存的内容。
```

常用命令：

```bash
engram verify
engram repair
engram graph "<主题>"
engram quality-check
engram archive --reason "<原因>" <id-或-文件>
```

下一步：[人类拥有的内存协议](protocol.md)。
