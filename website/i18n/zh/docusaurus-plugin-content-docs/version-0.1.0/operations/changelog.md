---
title: 更新日志
sidebar_position: 5
description: Engram 发布历史。
---

# 更新日志

Engram 发布历史保存在代码仓库的 [`CHANGELOG.md`](https://github.com/the-long-ride/engram/blob/main/CHANGELOG.md) 中。

有关当前包版本，请参阅 [`package.json`](https://github.com/the-long-ride/engram/blob/main/package.json)。

## 当前版本

当前发布的 Engram 版本为 `0.1.0`。

## 0.1.0 亮点

- **检索与分词**：三流 BM25F（`title`、`tags`、`body`）、缺少精确锚点时的 24 个概念簇与语料库共现桥接，以及 Unicode/越南语/CJK 分词。
- **新鲜度、排序与启动压缩**：`knowledgeFreshnessBoost` 时效/工作层评分、`orderForAgentConsumption` 注意力感知拓扑排序，以及 `read: auto` 模式下的 `hookStartupAuto` 启动卡片压缩。
- **闭环使用遥测**：在本地且被 gitignore 的 `usage.json` 中记录结果（`applied`、`corrected`，以及重复零效用注入后的噪声衰减），并提供 `engram stats --backfill`。
- **方案 A 会话学习与工作笔记**：提示时与会话记录的确定性学习，写入被 gitignore 且会过期的 `working/` 记忆并暂存 `inbox/r-*.json` 收据（`engram review inbox|triage|apply|dismiss`），新增 `engram working note` / `engram_note` MCP 工具，以及可选的 `SessionEnd` 会话记录入队（`engram link claude|codex --session-end`）。
- **CLI 易用性**：新增 `engram status`（`engram stat`）、`engram why <id> ["<query>"]`、`engram help --compact`、`engram graph link <parent-id> <child-id...>`、`engram review triage` 和 `engram benchmark --from-git`。
- **Entry Web 体验与安全**：升级 Entry Web UI 工作流并实现零漏洞依赖。

## 升级

```bash
npm install -g @the-long-ride/engram@latest
engram upgrade
```

有关详细信息，请参阅 [发布与升级流程](release-upgrade.md)。
