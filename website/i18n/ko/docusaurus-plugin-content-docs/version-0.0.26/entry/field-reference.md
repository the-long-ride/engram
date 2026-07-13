---
title: 전체 필드 참조
sidebar_position: 10
description: 모든 Entry Web UI 입력 및 컨트롤에 대한 검색 가능한 참조.
---

# 전체 필드 참조

이 페이지는 모든 Entry Web UI 입력 및 컨트롤에 대한 최종 사용자 표준 필드 참조 문서입니다.

## 이 참조 문서를 읽는 방법

각 필드 정보 항목:

- **설정 키** — 설정 파일 및 CLI에서 사용되는 키
- **컨트롤** — 입력 타입
- **기본값** — 안전한 기본값
- **위험도** — `normal`, `caution` 또는 `risky`
- **비고** — 필드가 수행하는 역할 및 설정을 변경해야 하는 시점

## Core

| 설정 키 | 컨트롤 | 기본값 | 위험도 | 비고 |
| --- | --- | --- | --- | --- |
| `enabled` | 토글 | `true` | risky | 마스터 스위치. 비활성화 시 Engram 동작이 중단됩니다. |
| `scope` | 선택 | `both` | risky | 저장 대상 범위: `workspace`, `global`, `both`. |
| `read` | 선택 | `auto` | normal | 훅이 메모리를 주입하는 시점: `auto`, `startup`, `always`, `manual`, `off`. |
| `proof` | 선택 | `off` | normal | 훅 증명 행 표시 여부: `off`, `compact`. |
| `global_path` | 텍스트 | 비어 있음 | risky | 글로벌 메모리용 파일 시스템 경로. |
| `default_profile` | 선택 | 비어 있음 | risky | 명시적으로 설정되지 않았을 때 사용되는 기본 프로필. |
| `roles` | 역할 | 비어 있음 | normal | 라우팅용 역할 이름 목록 (쉼표 구분). |
| `theme` | 선택 | `dark` | hidden | 내부용/숨김 설정. 사용자에게 보이지 않습니다. |

## Load Routing (로드 라우팅)

| 설정 키 | 컨트롤 | 기본값 | 위험도 | 비고 |
| --- | --- | --- | --- | --- |
| `load.limit` | 숫자 1–32 | `8` | normal | 일반 로드 시 반환되는 최대 메모리 개수. |

## Memory Limits (메모리 제한)

| 설정 키 | 컨트롤 | 기본값 | 위험도 | 비고 |
| --- | --- | --- | --- | --- |
| `memory.rule_line_target` | 숫자 50–200, 10단위 | `70` | normal | 규칙 메모리에 권장되는 줄 수. |
| `memory.rule_line_hard_limit` | 숫자 50–200, 10단위 | `100` | risky | 규칙 메모리에 허용되는 엄격한 최대 줄 수. |

## Graph (그래프)

| 설정 키 | 컨트롤 | 기본값 | 위험도 | 비고 |
| --- | --- | --- | --- | --- |
| `graph.enabled` | 토글 | `true` | normal | 종속성 및 관계 기반 라우팅을 활성화합니다. |
| `graph.max_related` | 숫자 1–20 | `4` | normal | 그래프 엣지로부터 검색되는 관련 메모리 제한 개수. |
| `graph.min_related_score` | 숫자 0–1, 0.01단위 | `0.22` | normal | 관련 엣지의 최소 유사도 기준 점수. |

## Vector Search (벡터 검색)

| 설정 키 | 컨트롤 | 기본값 | 위험도 | 비고 |
| --- | --- | --- | --- | --- |
| `vector.enabled` | 토글 | `true` | normal | 로컬 벡터 라우팅을 활성화합니다 (선택 사항). |
| `vector.auto_threshold` | 숫자 10–1000 | `100` | normal | 벡터 검색이 활성화되는 기준 메모리 개수. |
| `vector.candidate_pool` | 숫자 8–100 | `24` | normal | 재순위를 매기기 전에 필터링할 후보의 수. |
| `vector.dimensions` | 숫자 16–512 | `64` | normal | 임베딩 차원; 변경 시 재생성이 필요합니다. |

## Rule Variants (규칙 변형)

| 설정 키 | 컨트롤 | 기본값 | 위험도 | 비고 |
| --- | --- | --- | --- | --- |
| `rule_variants.enabled` | 토글 | `false` | normal | 역할/엄격성 기준 변형 규칙을 활성화합니다. |
| `rule_variants.active` | 선택 | `balanced` | normal | 활성화된 변형: `light`, `balanced`, `strict`. |

## Live Sync (라이브 동기화)

| 설정 키 | 컨트롤 | 기본값 | 위험도 | 비고 |
| --- | --- | --- | --- | --- |
| `live_sync.enabled` | 토글 | `false` | normal | 메모리 저장 시 실시간으로 에이전트 컨텍스트 파일을 동기화합니다. |

## Global Git (글로벌 Git)

| 설정 키 | 컨트롤 | 기본값 | 위험도 | 비고 |
| --- | --- | --- | --- | --- |
| `global_git.enabled` | 토글 | `true` | risky | 글로벌 메모리에 대해 Git 동작을 연동합니다. |
| `global_git.remote` | 텍스트 | `origin` | risky | Git 원격저장소 이름; 공백은 사용할 수 없습니다. |
| `global_git.remote_url` | 텍스트 | 비어 있음 | risky | 공유되는 글로벌 메모리의 Git 원격 주소. |
| `global_git.branch` | 텍스트 | `main` | risky | 동기화 대상 원격 브랜치. |
| `global_git.auto_sync` | 토글 | `true` | risky | 자동으로 pull 및 push를 수행합니다. |
| `global_git.auto_resolve` | 토글 | `true` | risky | 충돌 자동 해결; 변경점을 상시 검토하십시오. |

## Pattern Mining (패턴 마이닝)

| 설정 키 | 컨트롤 | 기본값 | 위험도 | 비고 |
| --- | --- | --- | --- | --- |
| `pattern_mining.enabled` | 토글 | `false` | normal | 실험적인 반복 패턴 추출 기능. |
| `pattern_mining.threshold` | 숫자 1–20 | `3` | normal | 패턴으로 등록되기 위해 요구되는 최소 반복 횟수. |
| `pattern_mining.lookback_sessions` | 숫자 1–100 | `20` | normal | 탐색 대상인 최근 세션 개수. |

## PR Workflow (PR 워크플로우)

| 설정 키 | 컨트롤 | 기본값 | 위험도 | 비고 |
| --- | --- | --- | --- | --- |
| `pr_workflow.enabled` | 토글 | `false` | risky | 팀 단위의 실험적 PR 기반 메모리 관리 기능. |
| `pr_workflow.target_branch` | 텍스트 | `main` | risky | 메모리 PR 대상 브랜치. |

## Encryption (암호화)

| 설정 키 | 컨트롤 | 기본값 | 위험도 | 비고 |
| --- | --- | --- | --- | --- |
| `encryption.enabled` | 토글 | `false` | risky | 향후 개발 적용될 고급 암호화 모드. |
| `encryption.scope` | 선택 | `global` | risky | 암호화 범위: `workspace`, `global`. |
| `encryption.key_source` | 선택 | `portable-file` | risky | 키 관리 전략; 백업 파일 유실 시 복구가 어렵습니다. |

## 비설정 요소 컨트롤

설정 필드 외 기능 제어는 아래의 각 탭 안내 페이지를 참조하십시오:

- [Connections 탭](connections.md)
- [Profiles 탭](profiles.md)
- [Workspaces 탭](workspaces.md)
- [Core 탭](core.md)
- [Memories 탭](memories.md)
- [Runtime 탭](runtime.md)

## 다음 단계

- [Construct 탭](construct.md)
- [필드 작성 가이드라인](field-authoring-guidelines.md)
