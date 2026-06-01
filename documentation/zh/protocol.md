# 人类拥有的记忆协议

Engram 不只是 "agent memory"。它是一套让记忆可检查、可迁移、由人类治理的协议。

## 核心契约

Markdown 是持久记忆。

JSON index 和 graph 是加速层。

Approval 是信任边界。

Hashes 是完整性检查。

Ignore rules 是隐私控制。

Git 是可移植性和审计历史。

Agent adapters 是便利层，不是权威。

agent 可以建议记忆，但人类决定什么成为记忆。

## 记忆类型

| 类型 | 用途 |
| --- | --- |
| Rule | 偏好、纠正、约束、always/never 指令 |
| Skill | 可重复流程、检查清单、procedure、runbook |
| Knowledge | 客观事实、决定、实现细节 |

每个 active memory 都包含 `Context`、`Content`、`Example`。

## 写入流程

1. agent 提出候选。
2. Engram 解析类型和 scope。
3. 检查 schema、secret、prompt injection、路径安全。
4. 人类查看 preview。
5. 人类回复 `A`、`A 1,3`、`B <note>` 或 `C`。
6. 只写入已批准内容。
7. 刷新 index、graph、hashes 和 changelog。

## 读取流程

1. Engram 加载 workspace 和 global index。
2. Workspace 覆盖 global duplicate。
3. Ignore rules 和 role filters 过滤噪音。
4. Graph-aware routing 选择紧凑上下文。
5. 输出前进行 hash 和安全检查。

没有协议时，记忆会变成不可见状态。Engram 把它变回 files、diffs、hashes 和 review。

下一页：[操作指南](operations.md)。

