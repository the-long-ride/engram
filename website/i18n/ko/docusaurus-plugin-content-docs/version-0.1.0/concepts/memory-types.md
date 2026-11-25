---
title: 메모리 유형
sidebar_position: 2
description: Engram 메모리는 Rule, Skill, Knowledge로 유형이 나뉘어 있어 라우팅과 검토가 집중적으로 이루어집니다.
---

# 메모리 유형

모든 활성 Engram 메모리에는 유형이 있습니다. 유형은 라우팅, 검토, 그리고 에이전트에 메모리가 렌더링되는 방식을 결정합니다.

| 유형 | 용도 |
| --- | --- |
| Rule | 사용자 선호, 수정 사항, 제약 조건, 항상/절대 안내 |
| Skill | 반복 가능한 워크플로, 체크리스트, 절차, 런북 |
| Knowledge | 객관적인 프로젝트 사실, 결정, 구현 세부 사항 |

새 파일은 `schema_version: 3`을 사용합니다. Rule과 skill 메모리는 기본적으로 `authority: instruction`, knowledge는 `authority: reference`를 갖습니다. `revision`은 1에서 시작하며 업데이트할 때마다 증가합니다. 추적 ID는 `evidence_refs`에, 세션 또는 출처 식별자는 `derived_from`에 넣습니다.

## 좋은 메모리 {#good-memory}

좋은 Engram 메모리는 다음과 같습니다.

- 다음 주에도 의미가 있을 만큼 안정적입니다
- 나중에 라우팅할 수 있을 만큼 구체적입니다
- 에이전트 컨텍스트에 로드할 수 있을 만큼 짧습니다
- 의도한 범위와 공유해도 될 만큼 안전합니다
- 규칙, 워크플로, 지식 항목 중 하나로 작성되어 있습니다

나쁜 메모리는 일시적인 대화 잡음, 비밀 정보, 자격 증명, 일회성 추측, 또는 아무도 승인하지 않은 사실입니다.

## 규칙 변형 {#rule-variants}

Engram은 렌더링 시점에 규칙의 `## Content`에서 light, balanced, strict 규칙 문구를 도출하므로(balanced는 Content 그대로) 새로 작성되거나 다시 쓰이는 규칙 파일에는 Content만 저장됩니다. `## Rule Variants` 섹션은 후보가 `LIGHT:`/`BALANCED:`/`STRICT:`로 직접 지정한 맞춤 문구가 있을 때만 유지됩니다. 규칙 변형 모드는 에이전트에 보이는 메모리를 위한 렌더링 렌즈입니다.

- **Strict**는 하위 등급 모델이 통제된 상태를 유지하도록 돕습니다.
- **Light** 또는 **balanced** 문구는 규칙이 추론을 제한하지 않도록 하므로 보통 더 강력한 모델에 도움이 됩니다.

변형이 꺼져 있으면 Engram은 기본적으로 balanced 규칙 문구를 렌더링합니다. 다음 명령으로 조정하세요.

```bash
engram set-rule-variant strict|balanced|light|off
```

## 기본적으로 간결한 출력 {#compact-output-by-default}

`engram load "<task>"`를 실행하면 출력은 기본적으로 AI 에이전트용으로 계층화되고 간소화됩니다.

| 항목 | 기본값(`engram load`) | 전체(`engram load --full`) |
| --- | --- | --- |
| Frontmatter | 렌더링되지 않으며, 본문 헤더는 `### <id> [<type>, <authority>]`와 `requires: <ids>`입니다 | 출처, 리비전, 대체 관계, 유효 기간을 포함한 전체 스키마 v3 및 기존 필드 |
| 공개 수준 | 상위 `load.expand_top` 결과는 본문으로, 나머지는 한 줄 카드(`- <id> [<type>] <directive-or-summary>`)로 표시한 뒤 `fetch:` 힌트를 붙입니다 | 패킹된 모든 본문 |
| 규칙 본문 | 선택된 변형 하나 | Content, 그리고 파일에 맞춤 변형이 있을 때만 저장된 `## Rule Variants` 섹션 |
| 기타 섹션 | `## Context`, `## Example`, `## Origin`은 렌더링되지 않습니다 | 같은 내용, 제목 그대로 |

MCP `engram_load`와 훅은 기본적으로 계층화된 출력을 사용합니다. 더 넓은 기존 형식 출력이 필요하면 MCP 도구에 `full: true`를 전달하거나 `engram load --full "<task>"`를 사용하세요.

## 선택적 라우팅 필드 {#optional-routing-fields}

이 frontmatter 필드는 선택 사항입니다. 이 필드가 없는 메모리는 이전과 같이 동작하며 `schema_version`은 3으로 유지됩니다.

| 필드 | 의미 |
| --- | --- |
| `directive` | 최대 160자의 한 줄이며, 카드에 표시되고 순위 계산에서 가중치를 받습니다 |
| `applies_to` | glob 목록입니다. 일치하는 파일을 읽거나 편집할 때 메모리를 주입하며 강한 앵커로 취급됩니다 |
| `tier` | `durable`(기본값) 또는 `working`(작업 범위, gitignore, 만료됨) |
| `objective` | 최대 200자이며, 작업 메모리가 작성된 목표입니다 |
| `valid_until` | 만료 날짜이며, 작업 메모리는 오늘 + `load.working_ttl_days`를 받습니다 |

<!-- evidence-foundation:v3:start -->
## 증거 기반 메모리

새 파일은 `schema_version: 3`을 사용합니다. Rule과 skill 메모리는 기본적으로 `authority: instruction`, knowledge는 `authority: reference`를 갖습니다. `revision`은 1에서 시작하며 업데이트할 때마다 증가합니다. 추적 ID는 `evidence_refs`에, 세션 또는 출처 식별자는 `derived_from`에 넣습니다. 기존 v1(`Context` + `Content` + `Example`)과 v2(`Content`, 선택적 `Origin`)도 계속 읽을 수 있습니다.
<!-- evidence-foundation:v3:end -->

## 다음 단계 {#next-steps}

- [워크스페이스와 글로벌 메모리](scopes.md)
- [읽기 경로와 라우팅](read-path.md)


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


<!-- configuration-upgrade-inventory -->
## 설정 업그레이드 인벤토리 {#configuration-upgrade-inventory}

패키지를 업데이트한 후에는 `engram upgrade --latest`를 실행하기 전에 `engram upgrade --latest --plan`을 먼저 실행하세요. 공유 인벤토리는 워크스페이스와 글로벌에서 Engram이 관리하는 메모리, 지침, 스킬셋, 설정, 훅, 플러그인을 스캔합니다. 사용자가 작성한 바이트는 보존되며, 모호하게 섞인 파일은 충돌로 보고됩니다. [설정 업그레이드](../operations/configuration-upgrades.md)를 참고하세요.
