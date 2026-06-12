# 운영 가이드

본 페이지는 자세한 실사용 명령어 설명을 제공하여 README 파일의 전체 분량을 가볍게 유지하도록 돕습니다.

## 주요 명령어 일람

| 목표 | 명령어 |
| --- | --- |
| 작업 관련 메모리 로드 | `engram load "<task>"` |
| 저장된 메모리 검색 | `engram search "<topic>"` |
| 단일 메모리 저장 | `engram save [rule\|workflow\|knowledge] "<text>"` |
| 세션에서 도출된 여러 메모리 저장 | `engram save-session` 또는 `engram ss` |
| 접근 가능한 최근 채팅에서 후보 추출 | `engram save-session --query-level 3` |
| 세션 제안 사항 일괄 저장 승인 | `engram ss -a` |
| 최근 채팅 후보 추출 및 일괄 승인 | `engram ss -a last 50 sessions` |
| 임시 원시 노트 기록 | `engram observe --file session.md` |
| 기존 문서/가이드라인을 Engram 메모리로 이식 | `engram take-control --all` |
| 가져오기 사전 계획 및 시뮬레이션 | `engram take-control --plan` |
| 기존 메모리 폴더 재구성 | `engram metacognize --workspace\|--global\|--all` |
| 그래프 라우팅 상태 및 구조 분석 | `engram graph "<topic>"` |
| 해시 데이터 정합성 검증 | `engram verify` |
| 손상되었거나 스키마가 깨진 메모리 점검 | `engram repair` |
| 잘못되었거나 불필요해진 메모리 아카이브 | `engram archive --reason "<사유>" <id-또는-파일명>` |
| 규칙 적용 강조 강도 조정 | `engram set-rule-variant strict\|balanced\|light\|off` |
| 기본 저장 대상 설정 | `engram set-save-target workspace\|global\|both\|status` |
| 컴팩트 로드 제한 설정 | `engram set-load-limit 1..32\|status\|reset` |
| 글로벌 프로필 관리 | `engram profile status\|create\|use\|merge` |
| workspace/global 메모리 복제 | `engram clone-memory workspace global [--metacognize]` |

긴 개발 과정에서 여러 메모리 추천을 일괄 처리하고자 할 때는 `save-session`을 애용해 주십시오. 단축 형태는 `ss`입니다.
현재 세션뿐 아니라 접근 가능한 최근 인간-에이전트 채팅 최대 n개에서 후보를 추출하고 싶다면 `--query-level <n>`을 사용하십시오. 자연어 표현 `engram ss -a last 50 sessions`는 `engram save-session --query-level 50 --accept-all`로 정규화됩니다.

설정된 로드 제한보다 많은 메모리가 매칭되면 `load`는 더 넓은 후보군을 컴팩트 컨텍스트 팩으로 정제합니다. 일반 로드는 선택 수와 관련 총수를 `loaded 8 memory files / 14 total related memories`처럼 표시합니다. `load --dry-run`은 후보 수와 범위를 좁힐 수 있는 태그를 보여주며, `load --all`은 의도적으로 모든 표시 가능한 라우팅 메모리를 반환합니다.

## 프로필, 저장 대상, 복제

일반 저장이 어디에 기록될지 선택하려면 `set-save-target`을 사용하십시오:

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

개인, 회사, 팀 글로벌 메모리를 서로 분리해야 할 때는 `profile`을 사용하십시오:

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

workspace와 global 범위 사이에서 활성 `rules/`, `skills/`, `knowledge/`
Markdown을 복사하려면 `clone-memory`를 사용하십시오:

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
```

(`--metacognize` routes cloned memories through save-session-style approval
instead of raw copy.)

Use `engram metacognize --workspace|--global|--all` when an AI agent should review an existing memory folder and propose `TYPE/TEXT` restructuring candidates with `UPDATE` or `DEPENDS_ON`; natural wording such as `engram restructure workspace memory accept all` maps to this command.

## 세션 저장 (Save Session)

긴 상호작용 작업 후 규칙, 지식, 워크플로우 후보가 복수로 도출되었을 때 다음 양식처럼 추천을 식별해 제안합니다:

```text
TYPE: rule | TEXT: Always run tests before release.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`--accept-all` 없이 실행하면 각각의 추천에 대해 무엇을 승인할지 일일이 질문하지만, `ss -a` 옵션으로 실행할 경우 인간 사용자의 일괄 동의를 사전에 전제하여 모든 추천이 저장되게 됩니다.
`--query-level`은 양의 정수여야 합니다. 에이전트는 실제로 접근할 수 있는 채팅만 포함해야 하며, 접근할 수 없는 기록을 만들어내면 안 됩니다. `engram ss -a last 50 sessions`는 `50`을 query level로, `-a`를 인간의 명시적 일괄 승인으로 사용합니다.

## 테이크 컨트롤 (Take Control)

`take-control`은 기존에 운용되던 저장소에 Engram을 빠르게 셋업하고 정착하도록 돕습니다. 대상 프로젝트 폴더 내 에이전트 지침서, 메모장, 기존 설명서 파일들을 탐색해 에이전트 후보 지식을 추출하고 제안합니다.

실전 유용한 셀렉터 명령어 모음:

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
```

`take-control`을 거쳐 이미 생성된 메모리는 내부에 `source_files`와 `source_hashes`를 가지고 있으며, 나중에 똑같은 원본 파일 스캔이 반복되더라도 변동 사항이 없다면 똑똑하게 스킵합니다.

## 옵저브 (Observe)

`observe`는 디바이스/프라이버시 세정을 거친 원시 개발 일지나 로그 노트를 `inbox/` 폴더 내에 수집해 줍니다. 인박스 내에 위치한 파일들은 아직 정식 액티브 메모리로 간주되지 않습니다.

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

영속적으로 보존할 정제된 규칙을 만들기 전에 날것 그대로의 메모를 잠시 보관할 목적으로 활용하기 적합합니다.

## 수리 및 재검토 (Repair & Review)

사용자가 임의로 메모리 파일을 편집했거나 외부 데이터를 강제로 임포트했을 때 다음 명령어로 정합성을 복구하십시오:

```bash
engram repair
engram rebuild-index
engram verify
```

잘못된 메모리를 격리하기 전에 관계망을 체크하고자 할 때 유용한 명령어들:

```bash
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

다음 단계: [다른 대안과의 비교 및 향후 로드맵](comparison.md).
