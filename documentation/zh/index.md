# Engram

Engram 是一个由人类掌控的 AI 智能体内存协议。它将持久的项目、团队和个人知识保存在人类可以检查、评审、同步和修复的文件中。

Engram 不是一个隐藏的智能体大脑。智能体可以建议内存，但事实的唯一来源（source of truth）是 `.agents/.engram/` 目录下或可选的全局内存文件夹中经过批准的 Markdown 文件。

## 它解决的问题

AI 智能体常常会遗忘项目决策、重复询问设置问题，并将旧的上下文与新的指令混淆。内置的内存往往局限于单一的厂商、单一的应用或单一的机器上。

Engram 为内存提供了一个稳定的契约：

- 经批准的事实、规则和工作流以 Markdown 文件的形式存在。
- 索引和图谱加速路由（routing）。
- 任何写入操作均需要人类批准。
- 哈希（hashes）能够发现不安全的修改。
- 忽略规则（ignore rules）保护私人上下文。
- 配置档隔离公司、客户和个人内存，避免外部 API 或公司提供的智能体在项目之间泄漏上下文。
- Git 提供变更历史、可移植性和团队评审。

## 心智模型

将 Engram 视为一个知识内存中心：

| 层级 | 职责 |
| --- | --- |
| Markdown | 持久的唯一事实来源（source of truth） |
| JSON index | 快速查找层 |
| JSON graph | 主题与关系路由层 |
| Approval gate | 写入前的信任边界 |
| Hashes | 读取前的完整性检查 |
| Ignore rules | 隐私控制 |
| Git | 审计历史与同步 |
| Agent adapters | 方便使用，而非权威来源 |

## 作用域优先级

Engram 按照以下顺序解析内存：

1. 工作区内存：`<project>/.agents/.engram/`
2. 全局内存：`$ENGRAM_GLOBAL_DIR` 或 `engram init --global-path <path>`

工作区内存优先。全局内存是跨项目的可重用偏好和团队上下文的后备（fallback）选项。

## 当前形态

Engram 包括：

- `save` 用于保存一条经过批准的内存。
- `save-session` / `ss` 用于保存单次会话中的多条内存候选，也可使用 `--query-level <n>` 从最多 n 个可访问的最近聊天中提取候选；`/engram ss -a last 50 sessions` 会规范化为 `engram save-session --query-level 50 --accept-all`。
- `observe` 用于捕获尚未成为激活内存的原始笔记。
- `take-control` 用于导入已有的智能体指导原则和文档。
- `graph` 和 `quality-check` 用于输出评审信号。
- `archive` 用于将错误或过期的内存归档，使其不再参与路由。
- `repair` 用于检测并报告重建索引时被跳过的格式错误的内存文件。
- `benchmark` 用于检索回归检查。
- 智能体技能集（skillsets）、斜杠命令适配器以及 MCP 风格的提议工具。

在使用命令之前，请阅读概念页面：[理解 Engram](understanding.md)。

下一步：[AI 智能体快速开始](quickstart.md)。
