---
title: Construct 탭 (구성)
sidebar_position: 4
description: Construct 탭에서 모든 Engram 런타임 필드를 구성합니다. 각 필드에는 사용 사례, 안전한 기본값, 유효성 검사 및 위험 경고가 있습니다.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Construct 탭

Construct 탭은 Engram 런타임 구성 필드를 보여주며, UI와 완전히 동일하게 그룹화되어 있습니다. 각 필드에는 설명, 사용 사례, 안전한 기본값, 유효성 검사 및 위험 경고가 표시됩니다.

<RiskCallout level="caution">
**risky**로 표시된 필드는 Engram을 비활성화하거나, 저장 대상을 변경하거나, Git 동작을 변경하거나, 메모리 보안에 영향을 미칠 수 있습니다. 설정을 변경하기 전에 경고를 읽어보십시오.
</RiskCallout>

## Core 그룹 (핵심)

### Enabled (활성화)

**설정 키:** `enabled`  
**컨트롤:** 토글  
**기본값:** `true`  
**위험:** risky

마스터 스위치입니다. 비활성화하면 Engram 기능이 완전히 중지됩니다. 일시적인 종료 또는 테스트용으로만 사용하십시오.

### Save Target (저장 대상)

**설정 키:** `scope`  
**컨트롤:** 선택 — `workspace`, `global`, `both`  
**기본값:** `both`  
**위험:** risky

새로 승인된 메모리가 저장되는 위치를 제어합니다. 저장소별 메모리는 `workspace`로, 개인/팀 메모리는 `global`로 설정하며, 둘 다 사용하고 싶을 때는 `both`를 사용하십시오.

### Read Mode (읽기 모드)

**설정 키:** `read`  
**컨트롤:** 선택 — `auto`, `startup`, `always`, `manual`, `off`  
**기본값:** `auto`  
**위험:** normal

에이전트 훅이 메모리 컨텍스트를 주입하는 시점을 제어합니다. `auto`는 세션 시작 시 로드되고 라우팅된 컨텍스트가 변경될 때만 다시 주입합니다. `manual` 및 `off`는 자동화를 줄이는 대신 컨텍스트의 과부하를 방지합니다.

### Proof Mode (증명 모드)

**설정 키:** `proof`  
**컨트롤:** 선택 — `off`, `compact`  
**기본값:** `off`  
**위험:** normal

적격한 대화 턴마다 에이전트 훅이 간결한 `Engram proof:` 라인을 추가할지 여부입니다. 디버깅 및 감사 가시성에 유용합니다.

### Global Memory Path (글로벌 메모리 경로)

**설정 키:** `global_path`  
**컨트롤:** 텍스트/경로  
**기본값:** 설정 전까지 비어 있음  
**위험:** risky

글로벌 메모리를 위한 파일 시스템 경로입니다. `~/Documents/engram`과 같이 사용자가 소유한 안정적인 폴더를 지정하십시오. 임시 폴더, 클라우드 동기화 공용 폴더, 쓰기 권한이 없는 디렉토리는 피해야 합니다.

<RiskCallout level="risky">
클라우드로 동기화되는 공용 폴더에 비밀번호나 중요 데이터를 포함한 개인 메모리를 저장하면 노출될 위험이 있습니다. 비공개 경로 또는 프라이빗 Git 저장소를 사용하십시오.
</RiskCallout>

**CLI 동등 명령:**

```bash
engram update-global-folder ~/Documents/engram
engram ugf ~/Documents/engram
```

### Default Profile (기본 프로필)

**설정 키:** `default_profile`  
**컨트롤:** 선택  
**기본값:** 비어 있음  
**위험:** risky

명시적으로 지정되지 않았을 때 사용되는 프로필입니다. [프로필 및 범위 분석](../concepts/profiles.md)을 참조하십시오.

### Active Roles (활성 역할)

**설정 키:** `roles`  
**컨트롤:** 역할/콤마 입력  
**기본값:** 빈 목록  
**위험:** normal

역할별로 메모리를 제한하고 순위를 다시 지정합니다. `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$` 패턴에 맞는 안전한 이름을 사용하십시오.

## Load Routing 그룹 (로드 라우팅)

### Load Limit (로드 한도)

**설정 키:** `load.limit`  
**컨트롤:** 숫자 1–32  
**기본값:** `8`  
**위험:** normal

일반 로드에서 반환되는 최대 메모리 수입니다. 낮은 값은 컨텍스트가 작은 모델에서 컨텍스트 과부하를 줄여주며, 높은 값은 깊은 아키텍처 작업에 도움이 됩니다.

## Memory Limits 그룹 (메모리 제한)

### Rule Line Target (규칙 행 목표치)

**설정 키:** `memory.rule_line_target`  
**컨트롤:** 숫자 50–200, 10 단위 조정  
**기본값:** `70`  
**위험:** normal

규칙 메모리의 권장 행 수입니다. 간결한 규칙이 지나치게 긴 설명문보다 라우팅 성능이 뛰어납니다.

### Rule Line Hard Limit (규칙 행 하드 한도)

**설정 키:** `memory.rule_line_hard_limit`  
**컨트롤:** 숫자 50–200, 10 단위 조정  
**기본값:** `100`  
**위험:** risky

규칙 메모리에 허용되는 엄격한 최대 행 수입니다.

<RiskCallout level="risky">
이 한도를 높이면 컨텍스트 과부하가 심해지고 라우팅 품질이 떨어질 수 있습니다. 규칙을 항상 간결하게 유지하십시오.
</RiskCallout>

## Graph 그룹 (그래프)

### graph.enabled

**컨트롤:** 토글  
**기본값:** `true`  
**위험:** normal

`depends_on`, 연관 메모리 및 그래프 뷰를 통한 종속성/관계 라우팅을 활성화합니다.

### graph.max_related

**컨트롤:** 숫자 1–20  
**기본값:** `4`  
**위험:** normal

그래프 신호를 통해 가져오는 연관 메모리의 개수를 제한합니다.

### graph.min_related_score

**컨트롤:** 숫자 0–1, 0.01 단위 조정  
**기본값:** `0.22`  
**위험:** normal

연관 엣지의 최소 유사도 점수입니다. 정밀도를 높이려면 이 점수를 올리고, 재현율을 높이려면 내리십시오.

## Vector Search 그룹 (벡터 검색)

### vector.enabled

**컨트롤:** 토글  
**기본값:** `true`  
**위험:** normal

선택 사항인 로컬 벡터 라우팅을 활성화합니다. 클라우드 종속성이 없습니다.

### vector.auto_threshold

**컨트롤:** 숫자 10–1000  
**기본값:** `100`  
**위험:** normal

벡터 검색이 활성화되는 기준 메모리 수입니다. 규모가 작은 저장소는 벡터 검색이 필요하지 않을 수 있습니다.

### vector.candidate_pool

**컨트롤:** 숫자 8–100  
**기본값:** `24`  
**위험:** normal

벡터 검색이 재순위를 평가하기 전에 고려하는 후보의 수입니다. 높은 값은 재현율을 개선하지만 대기 시간(지연) 비용이 증가합니다.

### vector.dimensions

**컨트롤:** 숫자 16–512  
**기본값:** `64`  
**위험:** normal

로컬 벡터 사이드카의 임베딩 차원입니다. 이 설정을 변경하면 재구축이 필요합니다.

## Rule Variants 그룹 (규칙 변형)

### rule_variants.enabled

**컨트롤:** 토글  
**기본값:** `false`  
**위험:** normal

역할/엄격성 기준 변형을 활성화합니다. 팀에 가벼운/균형 잡힌/엄격한 라우팅이 필요할 때 사용합니다.

### rule_variants.active

**컨트롤:** 선택 — `light`, `balanced`, `strict`  
**기본값:** `balanced`  
**위험:** normal

로드되는 규칙의 엄격성을 제어합니다. `strict`는 낮은 사양의 모델에 도움을 주며, `light`/`balanced`는 일반적으로 성능이 더 뛰어난 모델에 적합합니다.

## Live Sync 그룹 (라이브 동기화)

### live_sync.enabled

**컨트롤:** 토글  
**기본값:** `false`  
**위험:** normal

저장 시 생성된 에이전트 컨텍스트 파일을 실시간으로 동기화합니다.

## Global Git 그룹 (글로벌 Git)

<RiskCallout level="risky">
글로벌 Git 관련 필드는 모두 위험(risky) 요소가 있습니다. 글로벌 메모리에 대한 감사 기록 및 팀 동기화 동작을 제어합니다. 활성화하기 전에 각 설정을 신중하게 검토하십시오.
</RiskCallout>

| 필드 | 컨트롤 | 기본값 | 비고 |
| --- | --- | --- | --- |
| `global_git.enabled` | 토글 | `true` | 글로벌 메모리에 대해 Git 연동을 활성화합니다 |
| `global_git.remote` | 텍스트 | `origin` | Git 원격저장소 이름; 공백을 포함할 수 없습니다 |
| `global_git.remote_url` | 텍스트 | 비어 있음 | 공유할 글로벌 메모리의 원격 URL; HTTPS/SSH 모두 허용됩니다 |
| `global_git.branch` | 텍스트 | `main` | 동기화 타겟 브랜치 |
| `global_git.auto_sync` | 토글 | `true` | 자동 pull/push 활성화 여부 |
| `global_git.auto_resolve` | 토글 | `true` | 자동 충돌 해결 활성화 여부 — 메모리 diff를 사전 검토하십시오 |

## Pattern Mining 그룹 (패턴 마이닝)

| 필드 | 컨트롤 | 기본값 | 비고 |
| --- | --- | --- | --- |
| `pattern_mining.enabled` | 토글 | `false` | 반복되는 패턴을 자동으로 추출하는 실험적 기능 |
| `pattern_mining.threshold` | 숫자 1–20 | `3` | 패턴 후보로 인정되기 위해 반복되어야 하는 최소 횟수 |
| `pattern_mining.lookback_sessions` | 숫자 1–100 | `20` | 탐색할 최근 세션 개수 |

## PR Workflow 그룹 (PR 워크플로우)

| 필드 | 컨트롤 | 기본값 | 비고 |
| --- | --- | --- | --- |
| `pr_workflow.enabled` | 토글 | `false` | 메모리 변경 건에 대한 팀 단위 PR 기반 실험적 워크플로우 |
| `pr_workflow.target_branch` | 텍스트 | `main` | 메모리 PR을 수신할 브랜치 |

## Encryption 그룹 (암호화)

<RiskCallout level="risky">
암호화 설정이 존재하지만, 암호화된 스토리지는 아직 구현되지 않았습니다. 현재 제한 사항을 사용자에게 명확히 고지하십시오.
</RiskCallout>

| 필드 | 컨트롤 | 기본값 | 비고 |
| --- | --- | --- | --- |
| `encryption.enabled` | 토글 | `false` | 향후 도입될 고급 암호화 모드 |
| `encryption.scope` | 선택 — `workspace`, `global` | `global` | 암호화가 적용되는 범위 |
| `encryption.key_source` | 선택 — `portable-file` | `portable-file` | 키 소스 전략; 백업 분실 시 복구 불가 위험이 있음 |

## 다음 단계

- [전체 필드 참조](field-reference.md)
- [Profiles 탭](profiles.md)
- [Runtime 탭](runtime.md)
