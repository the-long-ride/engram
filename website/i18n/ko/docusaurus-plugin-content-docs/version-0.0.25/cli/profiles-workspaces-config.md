---
title: profiles / workspaces / config
sidebar_position: 5
description: 프로필, 저장 대상, 로드 제한, 읽기/교정 모드, 역할 및 런타임 구성 관리.
---

# profiles / workspaces / config

프로필, 저장 대상, 로드 제한, 읽기/교정 모드, 역할 및 런타임 구성을 관리합니다.

## profile

```bash
engram profile status
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

프로필 확인 순서는 명시적인 `--profile` 또는 `ENGRAM_PROFILE`, 작업 공간 `default_profile`, 활성 사용자 프로필 순입니다. 사용자 기본값이 프로필 `A`로 유지되는 동안 작업 공간 `W`가 프로필 `B`로 고정된 경우, `W`에 대한 모든 일반 로드, MCP 로드 및 에이전트 hook 주입은 프로필 `B` 글로벌 메모리를 읽고 프로필 `A`는 읽지 않습니다. 작업 공간 기본값과 다른 명시적 프로필은 해당 프로필의 글로벌 메모리를 사용하고 해당 명령에 대한 작업 공간 메모리를 비활성화합니다.

## set-save-target

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

## set-load-limit

```bash
engram set-load-limit 1..32
engram set-load-limit status
engram set-load-limit reset
```

## set-read

```bash
engram set-read startup|auto|always|manual|off
engram set-read status
```

## set-proof

```bash
engram set-proof off|compact
engram set-proof status
```

## set-role

```bash
engram set-role frontend
engram set-role backend security
engram set-role
```

`engram set-role ...` 또는 `engram set-rule-variant ...`가 성공하면 CLI는 `Agent action:` 라인을 반환합니다. Engram을 인식하는 슬래시 어댑터와 MCP 호스트는 즉시 `engram load "<current task/request>"`를 다시 실행해야 합니다.

## set-rule-variant

```bash
engram set-rule-variant strict|balanced|light|off
```

## config

```bash
engram config view
engram config set <key> <value>
```

### 주요 설정 참조

| 키 | 설명 | 기본값 | 범위 / 옵션 |
| --- | --- | --- | --- |
| `memory.rule_line_target` | 규칙 메모리에 권장되는 줄 수 목표 | `70` | `50` ~ `200` |
| `memory.rule_line_hard_limit` | 규칙 메모리에 허용되는 최대 줄 수 | `100` | `50` ~ `200` |
| `load.limit` | 일반 로드에서 반환되는 최대 메모리 수 | `8` | `1` ~ `32` |
| `rule_variants.enabled` | 규칙 변형 생성 활성화 또는 비활성화 | `true` | `true`, `false` |
| `rule_variants.active` | 활성 규칙 변형 모드 | `balanced` | `light`, `balanced`, `strict` |
| `graph.enabled` | 그래프 인식 라우팅 활성화 또는 비활성화 | `true` | `true`, `false` |
| `graph.max_related` | 그래프 에지에서 가져올 최대 관련 메모리 수 | `8` | `1` ~ `20` |
| `graph.min_related_score` | 그래프 에지를 추가하기 위한 최소 유사도 점수 | `0.3` | `0.0` ~ `1.0` |
| `vector.enabled` | 벡터 검색 폴백 활성화 또는 비활성화 | `true` | `true`, `false` |
| `live_sync.enabled` | 저장 시 생성된 에이전트 컨텍스트 파일 동기화 | `true` | `true`, `false` |
| `global_git.enabled` | 글로벌 Git 저장소 동기화 자동화 활성화 | `false` | `true`, `false` |
| `global_git.remote` | 글로벌 동기화용 Git 원격 이름 | `origin` | 문자열 |
| `global_git.branch` | 글로벌 동기화용 Git 브랜치 이름 | `main` | 문자열 |

이러한 설정은 `engram entry` 내의 **Construct** 탭에서 시각적으로 관리할 수도 있습니다.

## 다음 단계

- [verify / repair / quality-check](verify-repair-quality.md)
- [Entry Web UI: Construct 탭](../entry/construct.md)
