---
title: 证据追踪与来源
sidebar_position: 7
description: Engram 如何保存不可变的证据、将已批准的记忆关联到其来源，并在 CLI 和 Web UI 中呈现相同的元数据。
---

# 证据追踪与来源

Engram 将证据与已批准的记忆分开。追踪记录（trace）保存经过清理的来源记录；记忆则仍是经人工批准的指令或参考资料，并引用该证据。

## 已批准记忆的契约

新的已批准记忆使用 schema v3。旧版 v1 和 v2 文件仍可读取，且不会被悄悄改写。

```yaml
schema_version: 3
authority: instruction | reference
evidence_refs: [tr_...]
derived_from: [session-id]
revision: 1
supersedes: [older-memory-id]
superseded_by: newer-memory-id
valid_from: YYYY-MM-DD
valid_until: YYYY-MM-DD | null
last_confirmed: YYYY-MM-DD
```

契约字段包括 `schema_version`、`authority`、`evidence_refs`、`derived_from`、`revision`、`supersedes`、`superseded_by`、`valid_from`、`valid_until` 和 `last_confirmed`。

## 不可变追踪契约

每个 `traces/<trace-id>.jsonl` 文件恰好包含一条规范记录，并以独占方式创建，因此已有的 trace ID 无法被覆盖。`trace_id`、`session_id`、`source_hash`、`trust_level`、`sensitivity` 和 `retention` 这些字段分别保留身份、来源、完整性、信任、隐私和生命周期信息。`authority: evidence` 仅是数据，绝不会作为指令执行。

```json
{
  "trace_id": "tr_...",
  "authority": "evidence",
  "session_id": "session-id",
  "source_hash": "sha256:...",
  "trust_level": "human",
  "sensitivity": "private",
  "retention": "30d"
}
```

## CLI 与 Web UI 保持同步

`engram observe` 和会话记录（transcript）hook 会在持久化之前先进行清理。CLI 会输出所创建的 trace ID，`save-session` 会将 `evidence_refs` 和 `derived_from` 带入已批准的记忆。Entry Web UI 读取同一份索引，并在记忆详情面板中显示权限（authority）、证据 ID、会话来源、修订版本、有效期以及取代关系链接。

## 安全与迁移

除非另行配置，默认的人工采集使用 `trust_level: human`、`sensitivity: private` 和 `retention: 30d`。证据过期或缺失时，将阻止新的已批准写入。现有的观察（observation）包装文件仍作为指向 trace 的审阅辅助，初始化时会一次性迁移符合条件的旧版包装文件。

## 提升的完整性与作用域

inbox 包装文件是可编辑的审阅材料，而不是证据来源。执行 `save-session --file` 时，Engram 会重新打开不可变的 trace，在存在包装文件哈希时对其进行校验，并使用 trace 的文本、会话和来源元数据。编辑 `## Raw Note` 无法改变被提升的内容。基于 trace 的保存会绑定到该 trace 的工作区或全局作用域；与之冲突的显式 `--scope` 会被拒绝。旧版 trace 和会话标识符按作用域加命名空间，以避免来源冲突。
