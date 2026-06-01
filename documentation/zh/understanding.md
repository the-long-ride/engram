# 理解 Engram

先读这一页，再看命令指南。Engram 的价值不在于命令数量，而在于谁拥有记忆。

## 一句话模型

Engram 是一个文件协议，让 AI agent 可以使用长期记忆，同时由人类决定什么可以成为长期记忆。

## Engram 是什么

Engram 是一个 knowledge memory center，用来保存：

- 项目规则
- 团队决策
- 可重复工作流
- 长期事实
- 需要跨项目使用的个人偏好

记忆本身是普通 Markdown。index、graph、hash 和 adapter 只是让这些 Markdown 更容易、更安全地使用。

## Engram 不是什么

Engram 不是：

- agent 的隐藏大脑
- 某个供应商拥有的记忆孤岛
- 项目文档的替代品
- 把自己当权威的向量数据库
- 自动记录并永久保存一切的系统

agent 可以提出记忆。人类负责批准、拒绝、编辑、归档和拥有记忆。

## 核心承诺

Engram 希望 AI 记忆具备：

- 可审查：普通编辑器即可阅读
- 可移植：可用 Git 同步，并被不同 agent 使用
- 可修正：错误记忆可以带原因归档
- 默认保护隐私：ignore rules 和 approval gate 避免误保存
- 刻意简单：Markdown 比平台里的不可见状态更容易信任

## 层级

| 层 | 含义 |
| --- | --- |
| Markdown | 持久事实来源 |
| JSON index | 快速查找层 |
| JSON graph | 主题和关系路由层 |
| Hashes | 完整性检查 |
| Approval | 写入前的信任边界 |
| Ignore rules | 隐私控制 |
| Git | 历史、移植、审查、恢复 |
| Agent adapters | 面向 Codex、Claude、Cursor、Gemini 等 agent 的便利层 |

生成的 JSON 帮助 agent 更快找到记忆，但它不是权威。如果 JSON 与 Markdown 不一致，以 Markdown 为准。

## 记忆生命周期

1. 一次会话、一个文件或一条人工笔记包含有用知识。
2. agent 提出简洁的记忆候选。
3. 人类批准全部、选择部分、添加备注，或拒绝。
4. Engram 写入已批准的 Markdown 记忆。
5. Engram 刷新 hash、index、graph 和 changelog。
6. 未来的 agent 只加载与当前任务相关的记忆。
7. 如果记忆变错，Engram 会带原因归档。

这个生命周期让记忆持续可用，但不会变成不可见状态。

## 人类、Agent、Engram、Git

| 角色 | 职责 |
| --- | --- |
| 人类 | 决定什么成为长期记忆 |
| Agent | 发现模式并提出候选 |
| Engram | 执行 schema、安全、路由、批准和维护 |
| Git | 在设备之间携带记忆，并保留审查历史 |

agent 是助手，但不是所有者。

## 好记忆

好的 Engram 记忆应该：

- 稳定到下周仍然有用
- 具体到之后能被路由命中
- 简短到可以放入 agent context
- 对目标 scope 足够安全
- 明确属于 rule、workflow 或 knowledge

坏记忆包括临时聊天噪音、secret、credential、一次性猜测，或未经批准的事实。

## Scope

Workspace memory 位于：

```text
<project>/.agents/.engram/
```

Global memory 是可选的，位于用户配置的位置。

Workspace 优先。Global 是可复用偏好、个人习惯或团队默认规则的 fallback。

## 为什么不只用内置 Agent Memory

内置记忆很方便，但通常难以检查、diff、导出、分享或修正。它也常常属于某个 app 或账号。

Engram 让长期层变得可见。内置记忆仍然可以有用，但当知识重要时，Engram 应该是人类拥有的来源。

## 需要知道的限制

默认搜索是确定性的词法搜索。`engram search --semantic` 增加本地确定性相似度，不是 embedding-backed semantic search。graph vector 是本地 hashed word vector，不是语义 embedding。矛盾检测是建议性信号。已有 encryption config，但加密存储尚未实现。

这些限制需要明确告诉用户。Engram 应该说明今天真实可用的能力，也说明未来工作。

下一页：[AI agent 快速开始](quickstart.md)。
