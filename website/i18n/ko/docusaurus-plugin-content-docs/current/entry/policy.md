---
title: 자동 저장 정책
sidebar_position: 5
description: 기본 거부 자율 쓰기, 할당량, 롤백 보존 기간, 검토 게이트 및 필수 메타데이터를 구성합니다.
---

# 자동 저장 정책

Construct 탭은 `.agents/engram.policy.json`을 편집합니다. 일반적인 `engram save` 및 `engram save-session` 흐름은 여전히 사람의 승인을 거치며, 이 정책은 정책 게이트가 명시적으로 적용된 자율 후보 항목에만 적용됩니다.

## 자율 쓰기

### 자동 저장 허용 {#autonomous-writes-enabled}

`autonomous_writes.enabled`에 매핑됩니다. 기본값: `false`. 비활성화된 경우 어떤 후보 항목도 자율적으로 쓸 수 없습니다.

### 쓰기 모드 {#autonomous-writes-mode}

`autonomous_writes.mode`에 매핑됩니다. `review_only`는 후보 항목을 검토를 위해 보류하고, `autonomous`는 나머지 모든 게이트를 통과한 후보 항목의 쓰기를 허용합니다.

### 허용된 유형 {#autonomous-writes-allowed-types}

`autonomous_writes.allowed_types`에 매핑됩니다. 허용되는 값은 `rule`, `skill`, `workflow`, `knowledge`입니다. 최소 하나의 유형이 필요합니다.

### 허용된 범위 {#autonomous-writes-allowed-scopes}

`autonomous_writes.allowed_scopes`에 매핑됩니다. 허용되는 값은 `workspace` 및 `global`입니다.

### 허용된 소스 {#autonomous-writes-allowed-sources}

`autonomous_writes.allowed_sources`에 매핑됩니다. Entry는 `autosave`, `agent-hook`, `cli`, `mcp`를 제공하며, 비어 있지 않은 사용자 지정 소스 문자열도 정책 JSON에서 유효합니다.

### 신뢰도 임계값 {#autonomous-writes-confidence-threshold}

`autonomous_writes.confidence_threshold`에 매핑됩니다. 허용되는 값은 `low`, `medium`, `high`입니다.

### 일일 쓰기 한도 {#autonomous-writes-daily-limit}

`autonomous_writes.daily_limit`에 매핑됩니다. 음수가 아닌 정수를 사용하세요. `0`은 자율 쓰기를 방지합니다.

### 롤백 보존 일수 {#autonomous-writes-rollback-retention-days}

`autonomous_writes.rollback_retention_days`에 매핑됩니다. 정책 감사 레코드가 롤백 대상 상태로 유지되어야 하는 기간과 일치하는 음수가 아닌 정수를 사용하세요.

## 검토 게이트

### 규칙 줄 수 제한 검토 {#review-max-rule-lines}

`review.max_rule_lines`에 매핑됩니다. 이 양의 정수를 초과하는 규칙 후보 항목은 검토에 실패합니다.

### 최소 재현율 벤치마크 {#review-benchmark-min-recall-at-k}

`review.benchmark_min_recall_at_k`에 매핑됩니다. `0`부터 `1` 사이의 숫자를 사용하세요.

### context 메타데이터 요구 {#review-mandatory-metadata-context}

`review.mandatory_metadata.context`에 매핑됩니다. 활성화된 경우 `context` 메타데이터가 없는 후보 항목은 검토에 실패합니다.

### triggers 메타데이터 요구 {#review-mandatory-metadata-triggers}

`review.mandatory_metadata.triggers`에 매핑됩니다. 활성화된 경우 `triggers` 메타데이터가 없는 후보 항목은 검토에 실패합니다.

### role 메타데이터 요구 {#review-mandatory-metadata-role}

`review.mandatory_metadata.role`에 매핑됩니다. 활성화된 경우 `role` 메타데이터가 없는 후보 항목은 검토에 실패합니다.

## CLI 워크플로

```bash
engram policy init
engram policy validate --json
engram autosave --policy --dry-run
engram policy audit --json
engram policy rollback <audit-id>
```

자율 모드를 활성화하기 전에 dry-run을 사용하세요. 감사 영수증에는 메모리 본문 대신 식별자가 포함되며, 롤백은 정책에 의해 기록된 메모리를 보관 처리합니다.

## 관련 페이지

- [Construct 탭](construct.md)
- [쓰기 경로 및 승인](../concepts/write-path.md)
- [개인정보 보호, 무시 규칙 및 안전성](../concepts/safety.md)
