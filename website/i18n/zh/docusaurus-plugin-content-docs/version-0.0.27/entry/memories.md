---
title: Memories 标签页 (内存)
sidebar_position: 8
description: 检查内存图谱、预览内存、编辑和归档。
---

import RiskCallout from '@site/src/components/RiskCallout';

# Memories 标签页

Memories 标签页用于检查内存图谱并执行内存维护操作。

## 范围标签 (Scope chips)

按内存来源过滤图谱。比较工作区与全局内存。当图谱显得嘈杂时，可以先仅关注当前工作区。

## 类型标签 (Type chips)

按内存类型过滤图谱。分别检查规则、技能或知识。

## 语义链接开关

显示语义图边缘。当图谱在视觉上很嘈杂时请将其关闭。

## 刷新 / 重建 (Refresh / rebuild)

重新加载或重建图数据。在编辑、导入、归档操作或配置更改后使用。

## 内存预览

读取所选内存的内容。有助于审计智能体将收到的内容。

<RiskCallout level="caution">
敏感的本地内容可能会在浏览器中可见。在预览时将面板视为公开状态。
</RiskCallout>

## 编辑内存

在编辑器中打开文件并复制路径。用于手动纠正或审查。事实来源是 Markdown 文件。

## 归档内存

从活动路由中删除内存，同时将其保存在 `archive/` 下。使用归档而不是删除以保证可审计性。

<RiskCallout level="caution">
归档会立即更改路由。使用归档，而不是手动删除，以便保留历史记录。
</RiskCallout>

## CLI 等效命令

```bash
engram graph "<topic>"
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

## 后续步骤

- [Core 标签页](core.md)
- [Runtime 标签页](runtime.md)
