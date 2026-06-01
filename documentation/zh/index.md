# Engram

Engram 是面向 AI agent 的人类拥有型记忆协议。它把项目、团队和个人偏好的长期知识放在可阅读、可审查、可同步、可修复的文件里。

Engram 不是 agent 的隐藏大脑。agent 可以提出记忆候选，但真正的事实来源是 `.agents/.engram/` 或可选全局目录中的已批准 Markdown。

## 解决什么问题

AI agent 会忘记项目决定，重复询问环境设置，也可能把旧上下文和新指令混在一起。内置记忆通常绑定在某个平台、应用或设备里。

Engram 提供稳定契约：

- 已批准的事实、规则、工作流存为 Markdown
- index 和 graph 只是加速层
- 写入必须经过人类批准
- hash 检查完整性
- ignore rules 控制隐私
- Git 提供历史、可移植性和团队审查

## 心智模型

| 层 | 作用 |
| --- | --- |
| Markdown | 持久事实来源 |
| JSON index | 快速查找 |
| JSON graph | 主题和关系路由 |
| Approval gate | 信任边界 |
| Hashes | 读取前完整性检查 |
| Ignore rules | 隐私控制 |
| Git | 审计历史和同步 |
| Agent adapters | 便利层，不是权威 |

## Scope 优先级

1. Workspace memory: `<project>/.agents/.engram/`
2. Global memory: `$ENGRAM_GLOBAL_DIR` 或 `engram init --global-path <path>`

Workspace 优先。Global 只是跨仓库复用偏好和团队上下文的 fallback。

## 当前能力

- `save` 保存一个已批准记忆
- `save-session` / `ss` 从一个会话保存多个记忆
- `observe` 保存尚未激活的原始笔记
- `take-control` 导入已有 agent guidance 和文档
- `graph` 与 `quality-check` 提供审查信号
- `archive` 移出错误或过期记忆
- `repair` 报告 rebuild index 跳过的无效记忆文件
- `benchmark` 检查检索回归
- agent skillset、slash adapter、MCP proposal 工具

使用命令之前，先读概念页：[理解 Engram](understanding.md)。

下一页：[AI agent 快速开始](quickstart.md)。
