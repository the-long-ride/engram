---
title: 字段编写指南
sidebar_position: 11
description: 维护人员记录新 Entry UI 字段的规则。
---

# 字段编写指南

维护人员记录新 Entry UI 字段的规则。

## 当您添加字段时

1. 将字段添加到 `src/core/web/config-schema.ts` 中的 `CONFIG_FIELDS`，附带简短的 `description`、`options`、`min`/`max`/`step` 和 `risk`（风险）。
2. 在 `website/src/data/entryFields.ts` 中至少添加包含 `shortDescription`、`useCases` 和 `guidelines` 的文档条目。
3. 在 [Construct 标签页](construct.md)页面和[完整字段参考](field-reference.md)中记录该字段。
4. 运行字段文档覆盖率检查：

   ```bash
   npm --prefix website run check:entry-fields
   ```

5. 如果该字段有风险，请添加至少一条恢复/疑难解答说明。

## 每个字段所需的文档条目

| 条目 | 是否必填 |
| --- | --- |
| 通俗易懂的描述 | 是 |
| 使用场景 | 是 (1+) |
| 推荐的默认值 | 是 |
| 允许的值 / 范围 | 是 |
| 风险等级 | 是 |
| 副作用 | 相关时提供 |
| CLI 等效命令 | 相关时提供 |
| 示例值 | 适用于文本/路径字段 |
| 疑难解答说明 | 适用于有风险的字段 |

## 编写规则

- 面向配置 AI 智能体内存系统的用户编写，而不是阅读源码的维护者。
- 指明对内存所有权、路由、上下文大小、隐私或 Git 同步的实际影响。
- 优先选择来自 Engram 工作流的示例：Codex、Claude、Gemini、Cursor、OpenCode、个人内存、客户配置文件、团队仓库。
- 默认情况下不推荐高限制；解释上下文膨胀的权衡。
- 当设置会禁用 Engram、更改保存位置、更改 Git 同步、归档内存或影响加密/安全时，将其标记为 risky（有风险）。
- 为有风险的设置提供恢复命令。
- 保持应用内描述简短；在 Docusaurus 中放入详细指南。

## CI 覆盖率

在以下情况下 `website/scripts/check-entry-field-docs.mjs` 会失败：

1. 显示的 `CONFIG_FIELDS` 键缺少文档条目。
2. 文档条目引用了不再存在于 `CONFIG_FIELDS` 中的字段。
3. 字段缺少 `shortDescription`、`useCases` 或 `guidelines`。
4. 有风险的字段缺少至少一条疑难解答说明。
5. 数值字段在渲染的文档中省略了允许的范围。

## 后续步骤

- [完整字段参考](field-reference.md)
- [Construct 标签页](construct.md)
