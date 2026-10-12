---
title: save / save-session / observe
sidebar_position: 3
description: 쓰기 명령 — 메모리 하나 저장, 세션에서 여러 개 저장, 원시 노트 캡처.
---

# save / save-session / observe

쓰기 명령은 승인 게이트를 거쳐 메모리를 제안합니다.

## save

```bash
engram save [rule|workflow|knowledge] "<text>"
engram save --role frontend "<text>"
engram save --scope global "<text>"
```

`engram save`는 가장 적합한 단일 메모리 후보를 캡처하고, 일치하는 메모리가 있으면 자동으로 업데이트하거나 새로 만들며, 쓰기 전에 항상 A/B/C 승인 게이트를 표시합니다.

`engram save`가 관련된 활성 메모리를 찾으면, 승인 미리 보기에 권장 `depends_on` 또는 중복 가능성 경고와 함께 해당 메모리를 알려 줍니다.

## save-session

```bash
engram save-session
engram ss
engram save-session --query-level 3
engram ss -f
engram ss -f last 50 sessions
engram save-session --file transcript.md
engram save-session --force
```

긴 상호작용에서 여러 후보가 나왔을 때 `save-session`을 사용하세요.

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...`는 선택 사항입니다. 메모리가 존재하는 이유를 설명해야 할 때만 추가하세요. 관련 메모리를 재구성할 때는 후보에 `DEPENDS_ON`, `LEVEL`, `UPDATE` 필드를 추가할 수도 있습니다.

- `--query-level <n>` — 접근 가능한 최근 사람-에이전트 채팅을 최대 n개까지 분석합니다. 양의 정수여야 하며, 에이전트는 사용할 수 없는 기록을 지어내서는 안 됩니다
- `--force` / `-f` — 사람이 해당 단축 경로를 명시적으로 승인한 것으로 보고, 생성된 모든 후보를 저장합니다
- `--file <path>` — 이미 디스크에 있는 트랜스크립트나 긴 요약용

### 저장 판정 {#save-verdicts}

모든 후보 미리 보기(CLI, MCP, Entry)는 `File:` 바로 다음에 `Verdict:` 줄을 하나 출력합니다. 값은 `ADD`, `UPDATE <id>`, `SUPERSEDE <id>`, `NOOP duplicate of <id>` 중 하나입니다. 판정은 결정적입니다(기존 중복 제거 및 관련 메모리 점수를 사용하며 모델 호출 없음). `A`와 `B`는 `NOOP` 후보를 건너뛰고 건너뛴 항목으로 나열하며, `A 1,3`은 번호가 매겨진 후보만 정확히 기록합니다. `SUPERSEDE`를 승인하면 새 메모리에 `supersedes: [old]`가, 이전 메모리에 `lifecycle: superseded`가 기록되어 `engram load`에서 제외됩니다. `--force`와 자동 저장은 `SUPERSEDE`를 적용하지 않습니다. `--force` 없이 다시 실행해서 검토할 때까지 보류됩니다.

<a id="candidate-fields"></a>
### 후보 필드 {#candidate-fields-heading}

`CONTEXT`, `DEPENDS_ON`, `LEVEL`, `UPDATE` 외에도 후보는 다음 필드를 가질 수 있습니다.

| 필드 | 의미 |
| --- | --- |
| `OBJECTIVE: task` 또는 `durable` | `task`는 [작업 계층](#working-memory-promote-and-prune)에 저장하며, 기본값은 `durable`입니다 |
| `SCOPE: workspace` 또는 `global` | 이 후보에 한해 명령의 범위를 재정의합니다. 승인 미리 보기의 `Scope:` 줄에 대상이 표시됩니다. `--force`에서는 명령 범위를 벗어난 후보가 기록되지 않고 보류됩니다 |
| `APPLIES_TO: <globs>` | 상대 glob 최대 8개. 일치하는 파일을 읽거나 편집할 때 해당 메모리가 주입됩니다 |
| `DIRECTIVE: <line>` | 최대 160자의 한 줄로, 메모리 카드에 표시됩니다 |

```text
TYPE: rule | TEXT: Route commands through MediatR. | DIRECTIVE: Route commands through MediatR | APPLIES_TO: src/Api/**
```

`|` 형식에서는 필드 이름의 대소문자를 구분하지 않습니다. 여러 줄 형식에서는 대문자로 쓴 경우에만 인식되므로, `Scope: the billing module` 같은 일반 문장은 내용으로 남습니다.

`/engram take-control --force` 또는 자연어 `/engram take control force`의 경우, 슬래시 어댑터가 표현을 정규화하고 간결한 `TYPE: ... | TEXT: ...` 후보만 생성하며, Engram이 두 번째 승인 프롬프트 없이 이를 저장하도록 합니다.

<a id="working-memory-promote-and-prune"></a>
## 작업 메모리: 승격과 정리 {#working-memory-promote-and-prune-heading}

```bash
engram promote <id>
engram promote workspace:<id>
engram working note "<text>" [--objective "<text>"] [--type knowledge|rule] [--scope workspace|global]
engram working prune --dry-run
engram working prune
```

승인된 `OBJECTIVE: task` 후보는 `tier: working`, `--objective` 텍스트, 그리고 `valid_until` = 오늘 + `load.working_ttl_days`(기본값 14, 범위 1~365)와 함께 gitignore된 `.agents/.engram/working/`(또는 `<global>/working/`)에 기록됩니다. 승인 미리 보기에는 `Tier: working (expires <date>)`가 표시됩니다. 작업 메모리는 만료될 때까지 지속 메모리처럼 로드, 검색, 라우팅되며, 만료되면 `lifecycle`이라는 제외 사유와 함께 `load`에서 빠집니다. 에이전트 카드와 본문에는 `working` 라벨이 붙습니다.

- `engram promote <id>`는 A/B/C 미리 보기를 보여 주고, 승인하면 메모리를 지속 저장소로 옮깁니다. `tier`와 `valid_until`을 제거하고 `objective`는 유지하며 `revision`을 올립니다. 만료된 작업 메모리는 승격할 수 없습니다. 두 범위에 같은 id가 있으면 `workspace:<id>` 또는 `global:<id>`를 사용하세요.
- `engram working prune`은 `valid_until`이 지난 작업 메모리를 삭제하고 인덱스, 해시, 그래프를 다시 빌드합니다. `--dry-run`은 먼저 대상을 나열합니다. 지속 메모리는 절대 건드리지 않습니다.
- `engram working note "<text>"`는 작업 노트 하나(`source: note`, 기본 유형 `knowledge`, `--type rule` 허용)를 작업 계층에 저장합니다. 텍스트는 민감 정보가 가려지고 지침처럼 보이는 줄은 거부됩니다. 쓰기는 한 번의 Y/C 프롬프트로 제어되며 취소하면 아무것도 기록되지 않습니다. 노트가 같은 id의 지속 메모리를 업데이트하는 일은 없습니다. 세션 시작 시에는 `ENGRAM_SESSION_OBJECTIVE`가 노트의 `--objective`와 일치하지 않는 한 제외되고, 그렇지 않으면 카드로 표시됩니다. `engram promote <id>`로 승격하세요.

작업 메모리는 Git에 올라가지 않으며, 인덱스, 그래프, 해시 항목은 `working/` 아래의 로컬 사이드카에 남습니다.

## observe

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe`는 정제된 원시 노트를 `inbox/`에 저장합니다. 인박스 노트는 활성 메모리가 아닙니다. 무엇을 지속 메모리로 만들지 결정하기 전에 거친 노트를 보존하고 싶을 때 사용하세요.

<!-- evidence-foundation:v3:start -->
## 증거 기반 메모리

```bash
engram observe --file session.md
# Output includes Trace: tr_... and the inbox wrapper path
engram save-session --file .agents/.engram/inbox/<observation>.md
```

변경 불가능한 원본은 `.agents/.engram/traces/<trace-id>.jsonl`에 있으며, 인박스 Markdown은 검토용 래퍼일 뿐입니다. 승격 시 추적을 다시 열고 승인된 메모리를 `evidence_refs`와 `derived_from`과 함께 기록합니다. `engram observe --propose --file session.md`는 곧바로 일반 승인 흐름에 들어갈 수 있지만, 이 경우에도 추적을 원본 증거로 사용합니다. `engram observe --queue [--dry-run] [--limit n]`은 선택 사항인 `SessionEnd` 트랜스크립트 대기열을 같은 방식으로 정제된 추적과 인박스 래퍼로 처리하며 메모리는 기록하지 않습니다.
<!-- evidence-foundation:v3:end -->

## 관련 메모리 힌트 {#related-memory-hints}

전체 수락 실행이 쓰기 전에 관련 메모리를 보고하면 아직 아무 파일도 저장되지 않은 상태입니다. 에이전트는 구조화된 후보로 다시 실행해야 합니다.

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## 다음 단계 {#next-steps}

- [inject / link / upgrade](inject-link-upgrade.md)
- [개념: 쓰기 경로와 승인](../concepts/write-path.md)


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
