---
title: 内存类型
sidebar_position: 2
description: Engram 内存是有类型的 — Rule（规则）、Skill（技能）和 Knowledge（知识）— 从而使路由和审查保持专注。
---

# 内存类型

每个活跃的 Engram 内存都有一个类型。该类型控制路由、审查以及内存如何呈现给智能体。

| 类型 | 用途 |
| --- | --- |
| Rule | 用户偏好、修正、约束、始终/绝不指导意见 |
| Skill | 可重复的工作流、清单、步骤、操作手册 |
| Knowledge | 客观的项目事实、决策、实现细节 |

每个活跃的内存文件都有 `Context`、`Content` 和 `Example` 部分。规则内存还以简洁的行数限制为目标，以便加载的指导意见保持实用性。

## 好的内存

好的 Engram 内存是：

- 足够稳定，下周依然有用
- 足够具体，以后可以进行路由
- 足够简短，可以加载到智能体上下文中
- 足够安全，可以与预期的范围共享
- 写成规则、工作流或知识项

差的内存是临时的聊天噪音、秘密、凭据、一次性推测或未经任何人批准的事实。

## 规则变体

Engram 总是保存轻量版（light）、平衡版（balanced）和严格版（strict）的规则内存。规则变体模式是面向智能体内存的渲染滤镜：

- **Strict** 帮助低阶模型保持受控。
- **Light** 或 **balanced** 措辞通常对更强大的模型有帮助，使规则不会限制其推理能力。

当关闭变体时，Engram 默认渲染平衡版的规则措辞。使用以下命令进行调整：

```bash
engram set-rule-variant strict|balanced|light|off
```

## 面向智能体的输出 (`--for-agents`)

当运行 `engram load --for-agents "<task>"` 时，输出会针对 AI 智能体进行精简：

| 方面 | 人类 (`engram load`) | 智能体 (`--for-agents`) |
| --- | --- | --- |
| Frontmatter | 所有字段 (id, type, tags, confidence, scope, author, created, updated, depends_on 等) | 仅 `id`, `type`, `tags`, `confidence`, `depends_on` |
| 规则正文 | 包含所有三个变体的完整 `## Rule Variants` 部分 | 在 `## Rule variants (1/3 based on current: <active>)` 下选择的一个变体 |
| 非规则内容 | 完整的 `## Content` 部分 | 相同内容，标题未更改 |

MCP `engram_load` 和 SessionStart 钩子默认使用 `--for-agents`（可在 MCP 工具上通过 `forAgents: false` 选择退出）。技能集适配器在其生成的指令中硬编码了 `--for-agents`。

## 下一步

- [工作空间内存 vs 全局内存](scopes.md)
- [读取路径与路由](read-path.md)
