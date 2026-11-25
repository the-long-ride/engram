---
title: 记忆类型
sidebar_position: 2
description: Engram 的记忆带有类型——Rule（规则）、Skill（技能）和 Knowledge（知识）——使路由和审阅保持聚焦。
---

# 记忆类型

每条处于活动状态的 Engram 记忆都有一个类型。类型决定了路由、审阅，以及记忆如何呈现给 agent。

| 类型 | 用途 |
| --- | --- |
| Rule | 用户偏好、纠正、约束、始终/绝不做的指导 |
| Skill | 可重复的工作流、检查清单、流程、运行手册 |
| Knowledge | 客观的项目事实、决策、实现细节 |

新文件使用 `schema_version: 3`。规则和技能记忆默认为 `authority: instruction`；知识默认为 `authority: reference`。`revision` 从 1 开始，每次更新递增。Trace ID 属于 `evidence_refs`，而会话或来源标识属于 `derived_from`。

## 好的记忆

好的 Engram 记忆应当：

- 足够稳定，下周依然有意义
- 足够具体，便于日后路由
- 足够简短，可以加载进 agent 上下文
- 足够安全，可以在预期的作用域内共享
- 以规则、工作流或知识条目的形式书写

不好的记忆包括：临时的聊天噪音、secret、凭据、一次性的猜测，或是没有人批准过的事实。

## 规则变体

Engram 在渲染时根据规则的 `## Content` 推导出 light、balanced 和 strict 三种规则措辞（balanced 就是原样的 Content），因此新的和被重写的规则文件只存储 Content。只有当候选通过 `LIGHT:`/`BALANCED:`/`STRICT:` 提供了自定义措辞时，才会保留 `## Rule Variants` 部分。规则变体模式是面向 agent 的记忆的一种渲染视角：

- **Strict** 有助于较低档位的模型保持受控。
- **Light** 或 **balanced** 措辞通常对更强的模型有帮助，使规则不会限制其推理。

当变体关闭时，Engram 默认渲染 balanced 的规则措辞。可通过以下命令调整：

```bash
engram set-rule-variant strict|balanced|light|off
```

## 默认的精简输出

运行 `engram load "<task>"` 时，输出默认会为 AI agent 做分层和精简：

| 方面 | 默认（`engram load`） | 完整（`engram load --full`） |
| --- | --- | --- |
| Frontmatter | 不渲染；正文标题为 `### <id> [<type>, <authority>]`，外加 `requires: <ids>` | 完整的 schema v3 及旧版字段，包括来源、修订版本、取代关系和有效期 |
| 披露方式 | 排名靠前的 `load.expand_top` 条命中以正文呈现，其他命中以单行卡片呈现（`- <id> [<type>] <directive-or-summary>`），随后是 `fetch:` 提示 | 每一条打包的正文 |
| 规则正文 | 一个选定的变体 | Content，仅当文件带有自定义变体时才附带已存储的 `## Rule Variants` 部分 |
| 其他部分 | 不渲染 `## Context`、`## Example` 和 `## Origin` | 内容相同，标题不变 |

MCP `engram_load` 和 hook 默认使用分层输出。当需要更广泛的旧版输出时，请在 MCP 工具上传入 `full: true`，或使用 `engram load --full "<task>"`。

## 可选的路由字段

这些 frontmatter 字段是可选的；不带它们的记忆行为与以前相同，`schema_version` 仍为 3。

| 字段 | 含义 |
| --- | --- |
| `directive` | 最多 160 个字符的一行文字；显示在卡片上，并在排名中被加权 |
| `applies_to` | glob 列表；当匹配的文件被读取或编辑时注入该记忆，并计为强锚点 |
| `tier` | `durable`（默认）或 `working`（限于任务范围、被 gitignore、会过期） |
| `objective` | 最多 200 个字符；工作记忆所针对的目标 |
| `valid_until` | 过期日期；工作记忆获得 今天 + `load.working_ttl_days` |

<!-- evidence-foundation:v3:start -->
## 证据支持的记忆

新文件使用 `schema_version: 3`。规则和技能记忆默认为 `authority: instruction`；知识默认为 `authority: reference`。`revision` 从 1 开始，每次更新递增。Trace ID 属于 `evidence_refs`，而会话或来源标识属于 `derived_from`。旧版 v1（`Context` + `Content` + `Example`）和 v2（`Content`，可选的 `Origin`）仍然可读。
<!-- evidence-foundation:v3:end -->

## 后续步骤

- [工作区记忆与全局记忆](scopes.md)
- [读取路径与路由](read-path.md)


## Git 作者身份

Engram 可以存储一个全局作者以及可选的工作区覆盖。解析顺序依次为工作区、全局，然后是只读的 Git 回退。设置仅影响未来的记忆；工作区覆盖绝不会更改全局 Git 配置。全局 Git 同步或旧版记忆迁移需要显式的计划与确认。

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

请阅读完整的 [Git 作者设置指南](../operations/git-author-settings.md)。


<!-- configuration-upgrade-inventory -->
## 配置升级清单

软件包更新之后，请先运行 `engram upgrade --latest --plan`，再运行 `engram upgrade --latest`。共享清单会扫描工作区和全局中由 Engram 管理的记忆、指令、skillset、配置、hook 和插件。用户编写的字节会被保留；含义不明的混合文件会被报告为冲突。参见[配置升级](../operations/configuration-upgrades.md)。
