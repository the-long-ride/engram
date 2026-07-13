---
title: Runtime 标签页 (运行时)
sidebar_position: 9
description: 只读的解析后配置和路径，以及关闭服务器操作。
---

import RiskCallout from '@site/src/components/RiskCallout';

# Runtime 标签页

Runtime 标签页是只读的解析后配置和路径报告。将其视为疑难解答的第一站。

## 运行时报告组

该报告将解析后的值分组为：

- **Profile** — 活动配置文件和解析来源
- **Memory roots** — 工作区和全局内存路径
- **Core config** — 启用状态、范围、读取、凭证、角色
- **Routing** — 加载限制、图、向量设置
- **Graph** — 启用状态、最大关联数、最低分数
- **Git detection** — 远程仓库、远程 URL、分支、自动同步

每个输出都解释了 Engram 实际解析的内容，而不仅仅是配置的内容。使用它来调试配置文件、根路径、Git、路由和 hook 行为。

## 关闭服务器 (Close server)

停止本地 Entry 服务器。在完成配置工作后使用，以保证安全。

<RiskCallout level="risky">
该面板仅限本地访问。完成后从 Runtime 标签页关闭服务器，以免使其处于打开状态。
</RiskCallout>

## CLI 等效命令

```bash
engram config view
engram entry
```

## 后续步骤

- [完整字段参考](field-reference.md)
- [操作故障排除](../operations/troubleshooting.md)
