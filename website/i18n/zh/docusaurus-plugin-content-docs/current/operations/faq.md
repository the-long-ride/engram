---
title: 常见问题解答
sidebar_position: 4
description: 关于 Engram 的常见问题。
---

# 常见问题解答 (FAQ)

## Engram 是一个向量数据库吗？

不是。默认的 Engram 搜索是确定性词法搜索。`engram search --semantic` 增加了确定性局部相似度，而不是基于嵌入的语义搜索。图向量是本地哈希词向量，而不是语义嵌入。可选的本地 sqlite-vec 是一个加速层，而不是单一事实来源。

## Engram 会自动写入内存吗？

不会。智能体提出候选方案；人类进行审批。终端 CLI 直接使用 A/B/C。AI 智能体聊天使用 `yes`/`audit`/`cancel`。只有显式的全部接受请求 (`ss -a`) 才会保存所有候选方案，并且除非人类要求，否则智能体绝不能添加 `--accept-all`。

## 内存保存在哪里？

- 工作空间内存：`<project>/.agents/.engram/`
- 全局内存：用户配置的任何地方（在配置之前默认空）

工作空间内存优先。全局内存是可复用偏好和团队上下文的备用方案。

## 支持哪些智能体？

Codex, Claude, Gemini（以及 Antigravity 兼容 Gemini 的界面）, Cursor, Windsurf/Cascade, OpenCode, Copilot, Cline，通用兼容 AGENTS.md 的宿主，支持 MCP 的宿主以及斜杠命令宿主。参见 [智能体集成概述](../integrations/overview.md)。

## 加密功能实现了吗？

加密配置存在，但加密存储尚未实现。明确说明当前的局限性。

## 我可以在没有 Git 的情况下使用 Engram 吗？

可以。Git 是可选的，但建议用于审计历史记录、可移植性和团队审查。

## 我如何归档错误的内存？

```bash
engram archive --reason "<理由>" <id-或-文件>
```

该文件仅在审批通过后才会离开活跃路由，并依然保存在 `archive/` 目录下。为了便于审计，请使用归档而不是删除。

## 我该如何移动全局内存？

```bash
engram update-global-folder <新路径>
engram ugf <新路径>
engram move global folder from <旧路径> to <新路径>
```

如果他们还希望 Engram 将整个旧的全局根目录移动到新位置，请加上 `--move-from-path <旧路径>`。

## 下一步

- [故障排除](troubleshooting.md)
- [对比与路线图](../comparison/overview.md)
