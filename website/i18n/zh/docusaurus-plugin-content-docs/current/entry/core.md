---
title: Core 标签页 (核心)
sidebar_position: 7
description: 使用范围和类型过滤器审查重复和冲突的内存。
---

# Core 标签页

Core 标签页用于审查重复和冲突的内存。它是 Entry 面板内部的元认知（metacognition）工作区。

## 范围标签 (Scope chips): profile / global / workspace

按内存来源过滤重复/冲突分析。审计单一范围或比较跨范围重复。保持至少选择一个范围。

## 类型标签 (Type chips): rule / skill / workflow / knowledge

按内存类型过滤重复候选对象。优先清理规则（rules），或优先清理知识事实（knowledge）。在线记录类型含义，以便用户理解何时重复是无害的。

## 包含语义候选对象 (Include semantic candidates)

添加语义重复搜索，而不仅仅是精确/词法匹配。在清理成熟的内存库时使用；会有更多的假阳性。

## 复制提示词 (Copy prompt)

复制一个 `/engram` 提示词，以便更强大的智能体或模型解决重复问题。用于人类引导的清理和审查。提醒用户通过审批门槛来审查生成的更改。

## 预览 (Preview)

在复制前显示提示词。鼓励对高风险清理操作进行预览。

## CLI 等效命令

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
engram metacognize --workspace --accept-all
```

## 后续步骤

- [Memories 标签页](memories.md)
- [CLI: verify / repair / quality-check](../cli/verify-repair-quality.md)
