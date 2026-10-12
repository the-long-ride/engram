---
title: 증거 추적과 출처
sidebar_position: 7
description: Engram이 변경 불가능한 증거를 보존하고, 승인된 메모리를 출처와 연결하며, CLI와 Web UI에서 동일한 메타데이터를 보여 주는 방식을 설명합니다.
---

# 증거 추적과 출처

Engram은 증거와 승인된 메모리를 분리합니다. 추적(trace)은 정제된 원본 기록을 보존하고, 메모리는 해당 증거를 인용하는, 사람이 승인한 지침 또는 참고 자료로 남습니다.

## 승인된 메모리 계약

새로 승인되는 메모리는 스키마 v3를 사용합니다. 기존 v1 및 v2 파일은 계속 읽을 수 있으며 조용히 다시 쓰이는 일은 없습니다.

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

계약 필드는 `schema_version`, `authority`, `evidence_refs`, `derived_from`, `revision`, `supersedes`, `superseded_by`, `valid_from`, `valid_until`, `last_confirmed`입니다.

## 변경 불가능한 추적 계약

각 `traces/<trace-id>.jsonl` 파일에는 정확히 하나의 표준 레코드가 들어 있으며 배타적으로 생성되므로 이미 존재하는 추적 ID는 덮어쓸 수 없습니다. `trace_id`, `session_id`, `source_hash`, `trust_level`, `sensitivity`, `retention` 필드는 각각 식별, 출처, 무결성, 신뢰, 개인정보 보호, 수명 주기를 보존합니다. `authority: evidence`는 데이터일 뿐이며 지침으로 동작하지 않습니다.

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

## CLI와 Web UI의 동기화

`engram observe`와 트랜스크립트 훅은 저장하기 전에 내용을 정제합니다. CLI는 생성된 추적 ID를 출력하고, `save-session`은 `evidence_refs`와 `derived_from`을 승인된 메모리로 전달합니다. Entry Web UI는 동일한 인덱스를 읽어 메모리 상세 패널에 권한, 증거 ID, 세션 출처, 리비전, 유효 기간, 대체 관계 링크를 표시합니다.

## 안전성과 마이그레이션

기본 사람 캡처는 별도로 설정하지 않는 한 `trust_level: human`, `sensitivity: private`, `retention: 30d`를 사용합니다. 증거가 만료되었거나 없으면 새로운 승인 쓰기가 차단됩니다. 기존 관찰 래퍼는 추적을 가리키는 검토용 편의 수단으로 남으며, 초기화 시 대상이 되는 기존 래퍼를 한 번 마이그레이션합니다.

## 승격 무결성과 범위

인박스 래퍼는 편집 가능한 검토 자료이며 증거 원본이 아닙니다. `save-session --file`을 실행하는 동안 Engram은 변경 불가능한 추적을 다시 열고, 래퍼 해시가 있으면 이를 검증한 뒤 추적의 텍스트, 세션, 출처 메타데이터를 사용합니다. `## Raw Note`를 편집해도 승격되는 내용은 바뀌지 않습니다. 추적 기반 저장은 해당 추적의 워크스페이스 또는 글로벌 범위에 묶이며, 이와 충돌하는 명시적 `--scope`는 거부됩니다. 기존 추적 및 세션 식별자는 출처 충돌을 피하기 위해 범위별로 네임스페이스가 부여됩니다.
