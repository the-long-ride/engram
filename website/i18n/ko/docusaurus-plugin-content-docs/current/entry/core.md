---
title: Core 탭 (핵심)
sidebar_position: 7
description: 범위 및 유형 필터로 중복 및 충돌하는 메모리를 검토합니다.
---

# Core 탭

Core 탭은 중복되고 충돌하는 메모리를 검토합니다. Entry 패널 내부의 메타인지(metacognition) 워크스페이스입니다.

## 범위 칩 (Scope chips): profile / global / workspace

메모리 소스별로 중복/충돌 분석 필터를 적용합니다. 단일 범위를 감사하거나 범위 간 중복을 비교할 수 있습니다. 최소한 하나의 범위는 선택된 상태를 유지해야 합니다.

## 유형 칩 (Type chips): rule / skill / workflow / knowledge

메모리 유형별로 중복 후보 필터를 적용합니다. 규칙(rule) 정리 또는 지식(knowledge) 사실 정리에 먼저 집중하십시오. 유형별 의미를 인라인 문서로 제공하여 사용자가 어떤 중복이 무해한지 이해하도록 도우십시오.

## 의미론적 후보 포함 (Include semantic candidates)

정확한 단어 일치뿐만 아니라 의미론적 중복 검색을 추가합니다. 잘 관리된 메모리 저장소를 정리할 때 사용하되, 오탐지가 더 많이 발생할 수 있음을 염두에 두십시오.

## 프롬프트 복사 (Copy prompt)

성능이 더 우수한 에이전트 또는 모델이 중복을 해결할 수 있도록 `/engram` 프롬프트를 복사합니다. 사람이 직접 검토하고 진행하는 정리에 적합합니다. 생성된 변경 사항은 승인 게이트를 통해 검토하도록 사용자에게 상기시키십시오.

## 미리보기 (Preview)

복사하기 전에 프롬프트를 보여줍니다. 위험한 정리 작업의 경우 미리보기를 권장합니다.

## CLI 동등 명령

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
engram metacognize --workspace --accept-all
```

## 다음 단계

- [Memories 탭](memories.md)
- [CLI: verify / repair / quality-check](../cli/verify-repair-quality.md)
