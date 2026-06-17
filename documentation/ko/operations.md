# 운영 가이드

이 페이지는 README 파일을 간결하게 유지하기 위한 상세 설명서입니다.

## 지원 명령어 목록

| 필요 작업 | 명령어 |
| --- | --- |
| 태스크 메모리 로드 | `engram load "<태스크>"` |
| 에이전트용 컴팩트 메모리 로드 | `engram load --for-agents "<태스크>"` |
| AI 에이전트 가이드 인쇄 | `engram llm` |
| 로드 예정 메모리 파일 미리보기 | `engram load --dry-run "<태스크>"` |
| 메모리 검색 | `engram search "<주제>"` |
| 단일 메모리 저장 | `engram save [rule\|workflow\|knowledge] "<텍스트>"` |
| 여러 세션 메모리 저장 | `engram save-session` 또는 `engram ss` |
| 최근 대화 내용 마이닝 | `engram save-session --query-level 3` |
| 모든 세션 후보 승인 | `engram ss -a` |
| 최근 대화 마이닝 및 승인 | `engram ss -a last 50 sessions` |
| 임시 노트 캡처 | `engram observe --file session.md` |
| 기존 문서/지침 이식 | `engram take-control --all` |
| 소스 이식 계획 미리보기 | `engram take-control --plan` |
| 지침 가져오기 및 메타인지 제안 | `engram take-control --all --metacognize --accept-all` |
| 기존 메모리 폴더 재구성 | `engram metacognize --workspace\|--global\|--all` |
| 충돌 해결 및 재구성 제안 | `engram resolve-conflicts --metacognize` |
| 그래프 라우팅 진단 | `engram graph "<주제>"` |
| 해시 검증 | `engram verify` |
| 손상된 메모리 파일 확인 | `engram repair` |
| 잘못된 메모리 아카이브 | `engram archive --reason "<사유>" <id 또는 파일>` |
| 규칙 강도 튜닝 | `engram set-rule-variant strict\|balanced\|light\|off` |
| 기본 저장 위치 설정 | `engram set-save-target workspace\|global\|both\|status` |
| 압축 로드 제한 설정 | `engram set-load-limit 1..32\|status\|reset` |
| 자동 훅 읽기 설정 | `engram set-read startup\|auto\|always\|manual\|off\|status` |
| 훅 증명 표시 여부 설정 | `engram set-proof off\|compact\|status` |
| 에이전트 훅 설치 | `engram install-agent-hooks codex\|claude\|gemini` |
| 글로벌 프로파일 관리 | `engram profile status\|create\|use\|merge` |
| 메모리 복제 (워크스페이스/글로벌) | `engram clone-memory workspace global [--metacognize]` |

긴 세션에서 나온 여러 메모리 제안에는 `save-session`을 사용하십시오. 단축형: `ss`.
사용자가 현재 세션뿐만 아니라 최근 접근 가능한 n개의 인간-에이전트 대화까지 탐색하기를 원하면 `--query-level <n>`을 사용하십시오. `engram ss -a last 50 sessions`와 같은 자연스러운 표현은 `engram save-session --query-level 50 --accept-all`로 자동 변환됩니다.

내용을 인쇄하지 않고 어떤 메모리 파일이 라우팅되는지 확인하려면 `load --dry-run`을 사용하십시오.
AI 에이전트용 컨텍스트에는 `load --for-agents`를 사용하십시오. 이 옵션은 frontmatter에 `id`, `type`, `tags`, `confidence`만 남기고, 선택된 규칙 변형을 하나 렌더링하며 `## Rule variants (1/3 based on current: <active>)`로 표시합니다.
`load`는 에이전트 대상 호스트에도 기본적으로 같은 컴팩트 경로를 유지합니다. MCP `engram_load` 메서드는 기본적으로 `--for-agents`를 사용하므로 에이전트 호스트는 플래그를 반복하지 않고도 컴팩트 형식을 받습니다. SessionStart 훅은 시작 시 같은 라우팅 로드 경로를 호출하고, 라우팅 서명이 변하지 않으면 재사용하거나 건너뜁니다.
`load` 명령어는 먼저 의미 있는 검색어에 의존하여 라우팅을 진행하며, `rule`, `knowledge` 같은 일반적인 단어와 불용어(stopwords)는 무시합니다. 그 후 더 넓은 후보군을 정밀 정제하여 컴팩트한 컨텍스트 팩으로 만듭니다. 일반적인 로드는 선택된 개수와 연관 메모리 총수를 `loaded 8 memory files / 14 total related memories` 형태로 보고합니다. `load --dry-run`은 후보 수, 좁히기 태그 및 매칭 이유를 표시하며, `load --all`은 컴팩트 한도를 우회하여 로드 가능한 모든 매칭 결과를 반환합니다.
`workflow` 및 `workflows`는 여전히 스킬 메모리로 라우팅되지만, 일반적인 타입 단어만으로는 광범위한 매칭을 만들지 않습니다.

## 의존성 계층 (Dependency Layers)

메모리가 다른 메모리를 반복하지 않고 상위에 빌드되어야 할 때 frontmatter `depends_on`을 사용하십시오.

```yaml
depends_on: [release-foundation]
level: advanced
```

수동으로 메모리를 편집한 뒤에는 `engram graph --rebuild`를 실행하십시오. 그래프 파일에 의존성 계층이 작성되며, `engram load` 시 더 깊은 메모리에 앞서 관련 선행 조건들을 동일한 컴팩트 컨텍스트 팩에 함께 적재합니다. 그래프 의존성 관계와 벡터 일치만으로는 연관 없는 메모리를 단독 로드하지 않으며, 오직 의미 있는 키워드가 겹치는 메모리들을 재랭킹하거나 확장할 때 도움을 줍니다. 명시적으로 지정한 `depends_on` 선행 조건은 키워드가 직접 겹치지 않더라도 로드될 수 있습니다.

## 업그레이드 및 정합성 조율 (Upgrade Reconciliation)

새 버전의 Engram 패키지를 설치한 뒤에는 `engram upgrade`를 사용하십시오. 이 명령어는 v0.0.8 버전부터 초기화된 메모리 루트들을 현재 릴리스 스키마와 비교하여 자동으로 생성된 HELP.md, 메모리 인덱스, 그래프 파일, 유효한 벡터 사이드카, 생성된 워크스페이스 스킬셋, 글로벌 메모리 스캐폴딩 및 등록된 글로벌 에이전트 스킬셋을 갱신하면서도 사용자가 작성한 고유 메모리 파일은 손상 없이 보존합니다. 일반적인 명령어들도 `--no-auto-upgrade` 또는 `ENGRAM_NO_AUTO_UPGRADE=1` 환경변수가 구성되지 않았다면 패키지 버전당 최초 1회 자동으로 이 정합성 조율 과정을 조용히 처리합니다.
`engram save` 실행 중 연관된 기존 메모리가 감지되면 승인 미리보기 창에 제안 의존성(`depends_on`)이나 중복 위험 경고가 표시됩니다. 승인하면 미리보기 상태대로 저장되므로, 의존성을 다르게 구조화하거나 중복 메모리를 아카이브하려면 먼저 거절(reject)하십시오.
`save-session --accept-all` 실행 시 이러한 연관 메모리 힌트가 탐지되면 쓰기 전에 잠시 대기합니다. 에이전트는 이 응답을 토대로 구조화된 재요청을 준비해야 합니다. 의존 관계에는 `DEPENDS_ON: memory-id`, 선행 조건보다 깊은 메모리에는 `LEVEL: advanced`, 기존 중복 후보에 합병할 때는 `UPDATE: memory-id`를 조합해 보완하십시오.

## 프로파일, 저장 대상 및 복제

일반적인 저장이 기록될 기본 대상을 구성하려면 `set-save-target`을 사용하십시오.

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

개인용, 회사용 또는 프로젝트 팀용 글로벌 메모리를 논리적으로 분리해야 할 때는 `profile`을 활용하십시오.

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

워크스페이스와 글로벌 범위 간에 활성화된 `rules/`, `skills/`, `knowledge/` 마크다운 파일을 복사하려면 `clone-memory`를 실행하십시오.

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
```

단순 복사 대신 복제된 메모리들을 `save-session` 검토 흐름을 거쳐 등록하고 싶다면 `--metacognize` 플래그를 추가하십시오.

## 메모리 메타인지 재구성 (Metacognize Memory)

AI 에이전트에게 기존 Engram 메모리 폴더를 감사하게 하고, `save-session` 승인 흐름과 동일하게 더 안전한 정제 구조 제안을 생성하도록 하려면 `metacognize`를 활용하십시오.

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --accept-all
```

선택한 범위 내의 `rules/`, `skills/`, `knowledge/` 메모리를 진단하고, 후보 리스트가 주어지지 않았다면 컴팩트 소스 팩을 출력하며, 승인 후 생성된 `TYPE: ... | TEXT: ...` 지침 줄만 기록합니다. 에이전트는 중복 정리 및 문구 보완에 `UPDATE: memory-id`, 레이어 구조 형성에는 `DEPENDS_ON: memory-id`를 써야 합니다. `engram restructure workspace memory accept all`과 같은 자연스러운 문장은 내부적으로 `engram metacognize --workspace --accept-all`로 표준화됩니다.

## 세션 저장 (Save Session)

대화 세션이 길어져 다양한 메모리 후보가 도출되었을 때 `save-session`을 활용하십시오.

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` 입력은 선택 사항입니다. 메모리가 존재하는 상세 이유, 생성된 당시 상황, 의도된 활용 경계 등을 부연하고 싶을 때만 추가하십시오. 단순한 사실 중심 메모리는 생략하고 Engram 기본 승인 컨텍스트를 사용해도 좋습니다.

`--accept-all` 플래그가 없으면 Engram은 승인할 후보를 사용자에게 개별 확인 요청합니다. `ss -a`를 쓰면 사용자가 사전에 이 지름길을 승인한 것으로 간주해 모든 추천 후보를 즉시 자동 저장합니다.
자동 저장 시 연관 메모리가 탐지되어 쓰기가 보류되었다면 아직 파일이 기록되지 않은 상태입니다. 에이전트는 다음과 같이 구조화된 지침 후보군을 조합하여 재실행을 요청해야 합니다.

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

`--query-level` 파라미터는 항상 양의 정수여야 합니다. 에이전트는 실제 접근이 허용된 대화 이력만 반영해야 하며 거짓 이력을 허구로 지어내선 안 됩니다. `engram ss -a last 50 sessions`는 쿼리 레벨 `50`과 자동 저장 플래그 `-a`로 작동합니다.

## 통제권 인수 (Take Control)

기존 리포지토리에 Engram 메모리를 신속히 도입할 수 있도록 `take-control`이 지원합니다. 에이전트 지침 파일, 노트, 문서 및 선택한 파일을 스캔하여 컴팩트한 후보 제안을 사용자에게 보고합니다.

대표적인 필터들:

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --accept-all
```

저장된 이식 메모리들은 `source_files` 및 `source_hashes`를 기록해 두므로, 차후 스캔 시 변경되지 않은 원본 파일은 자동으로 검사 제외되어 효율적입니다.
연관 기존 메모리 감지 시 쓰기를 중단하고 에이전트에게 `UPDATE` 또는 `DEPENDS_ON` 형태로 다시 제안하게 만드려면 `--metacognize`와 사용자 승인 자동 저장 조합을 사용하십시오.

## 충돌 해결 및 재구성 (Resolve Conflicts With Metacognition)

Engram이 관리하는 워크스페이스 메모리 간 충돌 상황을 조율하고 진단하려면 `resolve-conflicts`를 실행하십시오. 충돌 조율이 끝난 직후 메모리 폴더를 바로 재구성 진단하도록 만드려면 `--metacognize`를 추가하십시오.

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
engram resolve conflicts and metacognize
```

이 명령어는 `.agents/.engram/` 내의 결정론적 충돌 해소 작업을 실행한 뒤, 워크스페이스 메타인지 팩을 연결하여 정교한 `TYPE/TEXT` 후보군을 제공합니다.

## 관찰 및 임시 보관 (Observe)

`observe` 명령어는 개인정보나 중요 시크릿이 정제된 생 임시 노트를 `inbox/` 디렉토리에 보관합니다. 이 임시 보관함 노트들은 활성화된 정식 메모리가 아닙니다.

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<파일명>.md
```

완전한 지속 메모리로 등록하기 전에 가벼운 임시 초안을 안전히 갈무리해 두고 싶을 때 사용하십시오.

## 검증 및 복구

수동으로 마크다운을 수정했거나 파일을 강제로 배치한 경우 `repair`를 통해 인덱스를 맞추십시오.

```bash
engram repair
engram rebuild-index
engram verify
```

아카이브(보관 제외) 처리를 하기 전에 의존성 구조와 품질을 확인하십시오.

```bash
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

다음 단계: [비교 및 로드맵](comparison.md).
