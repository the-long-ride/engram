---
title: 증거 추적과 출처
sidebar_position: 7
description: How Engram preserves immutable evidence, links approved memory to its source, and exposes the same metadata in CLI and Web UI.
---

# 증거 추적과 출처

Engram은 증거와 승인된 메모리를 분리하며 추적은 정제된 변경 불가능한 원본을 보존합니다.

Engram separates evidence from approved memory. A trace preserves the sanitized source record; a memory remains a human-approved instruction or reference that cites that evidence.

## Approved memory contract

New approved memories use schema v3. Legacy v1 and v2 files remain readable and are never silently rewritten.

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

The contract fields are `schema_version`, `authority`, `evidence_refs`, `derived_from`, `revision`, `supersedes`, `superseded_by`, `valid_from`, `valid_until`, and `last_confirmed`.

## Immutable trace contract

Each `traces/<trace-id>.jsonl` file contains exactly one canonical record and is created exclusively, so an existing trace ID cannot be overwritten. The fields `trace_id`, `session_id`, `source_hash`, `trust_level`, `sensitivity`, and `retention` preserve identity, origin, integrity, trust, privacy, and lifecycle. `authority: evidence` is data only and never acts as an instruction.

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

## CLI and Web UI stay synchronized

`engram observe` and transcript hooks sanitize before persistence. The CLI prints the created trace ID, and `save-session` carries `evidence_refs` and `derived_from` into approved memory. Entry Web UI reads the same index and shows authority, evidence IDs, session origin, revision, validity, and supersession links in the memory detail panel.

## Safety and migration

Default human capture uses `trust_level: human`, `sensitivity: private`, and `retention: 30d` unless configured. Expired or missing evidence blocks new approved writes. Existing observation wrappers remain review conveniences that point to traces, and initialization migrates eligible legacy wrappers once.

## Promotion integrity and scope

The inbox wrapper is editable review material, not the evidence source. During `save-session --file`, Engram reopens the immutable trace, verifies the wrapper hash when present, and uses the trace text, session, and source metadata. Editing `## Raw Note` cannot change promoted content. A trace-backed save is bound to the trace's workspace or global scope; a conflicting explicit `--scope` is rejected. Legacy trace and session identifiers are namespaced by scope to avoid provenance collisions.
