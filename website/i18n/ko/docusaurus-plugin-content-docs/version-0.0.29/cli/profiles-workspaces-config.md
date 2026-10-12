---
title: profiles / workspaces / config
sidebar_position: 5
description: 프로필, 저장 대상, 로드 한도, 읽기/증명 모드, 역할, 런타임 설정을 관리합니다.
---

# profiles / workspaces / config

프로필, 저장 대상, 로드 한도, 읽기/증명 모드, 역할, 런타임 설정을 관리합니다.

## profile

```bash
engram profile status
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

프로필 확인 순서는 명시적인 `--profile` 또는 `ENGRAM_PROFILE`, 그다음 워크스페이스의 `default_profile`, 마지막으로 활성 사용자 프로필입니다. 워크스페이스 `W`가 프로필 `B`로 고정되어 있고 사용자 기본값은 프로필 `A`로 유지되는 경우, `W`에 대한 모든 일반 로드, MCP 로드, 에이전트 훅 주입은 프로필 `B`의 글로벌 메모리를 읽으며 프로필 `A`는 읽지 않습니다. 워크스페이스 기본값과 다른 프로필을 명시적으로 지정하면 해당 프로필의 글로벌 메모리를 사용하고, 그 명령에서는 워크스페이스 메모리를 비활성화합니다.

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

<a id="load-configuration"></a>
## 로드 설정 {#load-configuration-heading}

이 키들은 `.agents/.engram/engram.config.json`의 `load` 블록에 있으며, `engram config set`으로는 지정할 수 없습니다.

| 키 | 기본값 | 의미 |
| --- | --- | --- |
| `load.disclosure` | `auto` | `auto`는 상위 결과의 본문을 펼치고 나머지는 카드로 표시하며, `full`은 계층화하지 않은 출력을 유지합니다 |
| `load.expand_top` | `3` | `auto` 공개 방식에서 본문을 펼치는 개수 |
| `load.working_ttl_days` | `14` | 승인된 `OBJECTIVE: task` 메모리가 작업 계층에 머무는 일수(1~365). Entry의 Construct 탭에서도 편집할 수 있습니다 |

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

`engram set-role ...` 또는 `engram set-rule-variant ...`가 성공하면 CLI가 `Agent action:` 줄을 반환합니다. Engram을 인식하는 슬래시 어댑터와 MCP 호스트는 즉시 `engram load "<current task/request>"`를 다시 실행해야 합니다.

## set-rule-variant

```bash
engram set-rule-variant strict|balanced|light|off|status
```

## config

```bash
engram config view
engram config set <key> <value>
```

### 주요 설정 참조 {#key-settings-reference}

| 키 | 설명 | 기본값 | 범위 / 옵션 |
| --- | --- | --- | --- |
| `memory.rule_line_target` | 규칙 메모리의 권장 줄 수 목표 | `70` | `50` ~ `200` |
| `memory.rule_line_hard_limit` | 규칙 메모리에 허용되는 최대 줄 수 | `100` | `50` ~ `200` |
| `memory.include_author_email` | 새 메모리 frontmatter에 `author_email`을 기록합니다(`author_name`은 항상 기록) | `false` | `true`, `false` |
| `mcp.resource_limit` | 메모리 MCP `resources/list`가 `engram://index` 외에 반환하는 개수이며, 주입 + 가져오기 사용량 순으로 순위가 정해집니다(JSON 설정 전용이며 `engram config set`으로 지정하지 않음) | `20` | `0` ~ `200` |
| `load.limit` | 일반 로드가 반환하는 최대 메모리 수 | `8` | `1` ~ `32` |
| `hooks.path_rules` | `native`는 `applies_to` 메모리에 대해 Claude와 Cursor 규칙 파일을 기록하고 Claude `InstructionsLoaded`를 등록하며, `hook`은 Claude `PreToolUse` 훅을 유지합니다 | `native` | `native`, `hook` |
| `rule_variants.enabled` | 규칙 변형 생성 활성화 또는 비활성화 | `false` | `true`, `false` |
| `rule_variants.active` | 활성 규칙 변형 모드 | `balanced` | `light`, `balanced`, `strict` |
| `graph.enabled` | 그래프 인식 라우팅 활성화 또는 비활성화 | `true` | `true`, `false` |
| `graph.max_related` | 그래프 엣지에서 가져올 관련 메모리의 최대 수 | `4` | `1` ~ `20` |
| `graph.min_related_score` | 그래프 엣지를 추가하기 위한 최소 유사도 점수 | `0.22` | `0.0` ~ `1.0` |
| `vector.enabled` | 실험적인 해시 벡터 검색 대체 기능(의미 임베딩 아님) | `false` | `true`, `false` |
| `live_sync.enabled` | 저장 시 생성된 에이전트 컨텍스트 파일 동기화 | `false` | `true`, `false` |
| `global_git.enabled` | 글로벌 Git 저장소 동기화 자동화 활성화 | `true` | `true`, `false` |
| `global_git.remote` | 글로벌 동기화에 사용할 Git 원격 이름 | `origin` | 문자열 |
| `global_git.branch` | 글로벌 동기화에 사용할 Git 브랜치 이름 | `main` | 문자열 |

이 설정은 `engram entry`의 **Construct** 탭에서도 시각적으로 관리할 수 있습니다.

## 다음 단계 {#next-steps}

- [verify / repair / quality-check](verify-repair-quality.md)
- [Entry Web UI: Construct 탭](../entry/construct.md)


## Git 작성자 정보 {#git-author-identity}

Engram은 글로벌 작성자와 선택적인 워크스페이스 재정의를 저장할 수 있습니다. 확인 순서는 워크스페이스, 글로벌, 그다음 읽기 전용 Git 대체값입니다. 설정은 앞으로 작성되는 메모리에만 적용되며, 워크스페이스 재정의는 글로벌 Git 설정을 바꾸지 않습니다. 글로벌 Git 동기화나 기존 메모리 마이그레이션에는 명시적인 계획 확인과 승인 절차를 사용하세요.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

전체 내용은 [Git 작성자 설정 가이드](../operations/git-author-settings.md)를 읽어 보세요.
