---
title: inject / link / upgrade
sidebar_position: 4
description: 설정 및 어댑터 명령 — 워크스페이스를 초기화하고, 에이전트를 연결하며, 패키지 업데이트 후 상태를 조정합니다.
---

# inject / link / upgrade

설정 및 어댑터 명령은 워크스페이스를 초기화하고, 에이전트를 연결하며, 패키지 업데이트 후 상태를 조정합니다.

## inject

```bash
engram inject
engram inject --scope workspace|global|both
engram inject --global-only --global-path <path>
engram inject --submodule
engram inject --submodule-remote <git-url>
engram inject --global-remote <git-url>
engram inject --global-branch <branch>
engram inject --no-skillset
engram inject --skillset all
engram inject --no-global
```

`engram inject`는 `.agents/.engram/`을 만들고 기본적으로 간결한 Codex 대상을 설치합니다. 사람이 작성한 기존 파일은 건너뜁니다.

대화형 inject는 다음 순서로 묻습니다. `./.agents/.engram`을 서브모듈로 추가할지, 글로벌 Engram 경로를 사용할지, 공유 글로벌 Git origin을 추가할지입니다.

구성된 글로벌 경로만 바꾸려면 `engram update-global-folder <new-path>` 또는 `engram ugf <new-path>`를 사용하세요. `engram set global memory path to <new-path>`, `engram move global folder from <old-path> to <new-path>` 같은 채팅 형식도 같은 명령으로 정규화됩니다. 이전 글로벌 루트 전체를 Engram이 함께 옮기게 하려면 `--move-from-path <old-path>`를 추가하세요.

## link

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram link all
engram link list
engram link --all-supported
engram unlink
```

`engram link all`은 공개 대상 세트를 설치하며, 스킬셋 지침 파일, MCP 설정, 슬래시 어댑터, 에이전트 훅을 하나의 통합 설치로 처리하는 과정에서 일부만 지원하는 호스트에 대해서는 항상 같은 `SKIPPED` 사유를 보고합니다. `engram unlink`는 이 모든 항목을 함께 제거합니다. `engram unlink --global <target>`은 Engram이 생성한 글로벌 플러그인만 제거하며, 사람이 작성한 파일은 `--force`를 명시하지 않는 한 보존됩니다.

`engram link claude --session-end`(또는 `codex`)는 추가로 선택 사항인 `SessionEnd` 명령 훅을 등록하며, 이 훅은 세션 트랜스크립트 경로를 gitignore된 `session-queue.json`에 대기열로 추가합니다. 기본값은 꺼짐이며 `engram upgrade`는 이를 추가하지 않습니다. `engram observe --queue`로 대기열을 처리하세요. 자세한 내용은 [훅](../integrations/hooks.md)을 참고하세요.

## upgrade

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
engram upgrade --self
engram upgrade --memory-only
engram upgrade --global-skillsets-only
engram upgrade --target codex
```

더 새로운 Engram 패키지를 설치한 뒤에는 `engram upgrade`를 사용하세요. 이 명령은 v0.0.8 이후 초기화된 메모리 루트를 현재 릴리스 스키마와 비교하고, 사람이 작성한 파일은 보존하면서 생성된 `HELP.md`, 메모리 인덱스, 그래프 파일, 대상 벡터 사이드카, 생성된 워크스페이스 스킬셋, 글로벌 메모리 스캐폴딩, 등록된 글로벌 에이전트 스킬셋을 갱신합니다.

일반 명령도 `--no-auto-upgrade` 또는 `ENGRAM_NO_AUTO_UPGRADE=1`을 설정하지 않는 한 패키지 버전당 한 번 같은 루트 조정을 조용히 실행합니다.

새 패키지 출력이 현재 Engram이 관리하는 연결 에이전트 아티팩트를 덮어써야 할 때는 `engram upgrade --latest`를 사용하세요. 이 경로는 연결된 워크스페이스 지침 파일, 규칙, MCP/플러그인 설정, 관리되는 훅을 다시 적용하고, 등록된 글로벌 에이전트 설치도 최신 생성 파일로 갱신합니다.

`--force`는 생성된 Engram 어댑터 파일을 의도적으로 교체할 때만 사용하세요.

## take-control

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --force
engram take-control --plan --json --kind code
engram take-control --kind code --objective "add billing export"
engram take-control --refresh
engram take-control --from claude-auto-memory --plan
engram take-control --from codex-memories --plan
```

`take-control`은 기존 워크스페이스 지침을 에이전트가 도와서 넘겨받는 흐름입니다. `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Cursor 규칙, memory-bank 노트, 최상위 `rules/`, `skills/`, `workflows/`, `knowledge/`, `notes/` 폴더(`.txt` 노트 포함) 같은 파일에서 간결한 소스 팩을 만듭니다.

저장된 take-control 메모리는 `source_files`와 `source_hashes`를 기록하므로, 변경되지 않은 소스는 이후에 건너뜁니다.

### 코드 및 설정 요약 {#code-and-config-digests}

`--kind docs|code|config|all`(쉼표로 구분한 목록 허용, 기본값은 위 동작을 유지하는 `docs`)은 원문 대신 소스당 짧은 요약(digest)을 내보내는 추출기를 추가합니다.

- **code**: 내보낸 시그니처, 문서 주석의 첫 줄, import만 포함하며 본문은 절대 포함하지 않습니다. 지침에는 심볼 이름과 import 한 줄로 이루어진 디렉터리별 저장소 맵으로 표시됩니다. 코드 스캔의 기본값은 `--max-sources 40`입니다.
- **config** 및 빌드 매니페스트: 키, 그리고 허용 목록에 있는 키(`scripts`, 의존성 이름, `TargetFramework`, `engines`, `name`)의 값과 스택 정보만 포함합니다.

모든 요약은 민감 정보가 가려집니다(redacted). `.env*`와 자격 증명 파일은 항상 `secret file`로 건너뛰고, 256 KB를 넘거나 바이너리로 보이는 발견된 파일은 사유와 함께 건너뛰며, 코드와 설정 스캔은 빌드 출력 디렉터리(`bin`, `obj`, `build`, `out`, `target`, `venv` 등)를 어느 깊이에서든 건너뜁니다. `--budget-tokens`(코드 및 설정 스캔의 기본값은 6000이며, docs 스캔은 요청하지 않으면 제한이 없음), `--max-sources`, `--max-chars`가 팩의 크기를 제한합니다. `--plan --json`은 건너뛴 파일과 사유를 포함한 계획을 JSON으로 출력하며, 기본 docs 스캔에서는 `budgetTokens`가 `null`입니다.

### 목표 인식 후보 {#objective-aware-candidates}

`--objective "<text>"`는 현재 목표를 지정합니다. 그러면 지침이 두 종류의 후보를 요청합니다. 목표에 유용한 `OBJECTIVE: task` 후보와, 이후에도 보관할 가치가 있는 `OBJECTIVE: durable` 후보입니다. 후보 문법은 `SCOPE: workspace|global`, `APPLIES_TO: <globs>`(상대 glob 최대 8개), `DIRECTIVE: <line>`(최대 160자)도 허용합니다. [save-session](save-session.md#candidate-fields)을 참고하세요. 승인된 `OBJECTIVE: task` 후보는 [작업 계층](save-session.md#working-memory-promote-and-prune)으로 이동합니다.

### 최신성 {#freshness}

코드, 설정, 매니페스트 메모리는 요약의 해시(`source_hash_mode: digest`)를 기록하므로 공백만 바꾸거나 본문만 편집해도 오래된 것으로 간주되지 않습니다. docs 메모리는 원본 파일 해시를 기록합니다. `engram verify --sources`는 변경되었거나 누락된 소스를 gitignore된 `stale.json`에 기록하고, `engram take-control --refresh`는 해당 소스만 다시 요약하여 오래된 메모리마다 `UPDATE: <id>` 후보를 하나씩 일반 승인 게이트를 통해 제안합니다. [verify](verify-repair-quality.md#verify)를 참고하세요.

### 호스트 메모리 {#host-memories}

`--from claude-auto-memory|codex-memories`는 워크스페이스를 스캔하는 대신 호스트 로컬 메모리 저장소를 검토용으로 가져옵니다. Claude 자동 메모리는 `~/.claude/projects/<project>/memory/`(또는 사용자 또는 로컬 Claude 설정의 `autoMemoryDirectory`, `CLAUDE_CONFIG_DIR`이 `~/.claude`를 대체)에서, Codex 메모리는 `~/.codex/memories/`에서 읽습니다. 저장소를 모호하지 않게 찾을 수 없으면 `--dir <path>`로 저장소를 지정할 수 있습니다. `type: feedback`은 규칙을, `project`와 `reference`는 지식을 제안하며, `type: user`, 타입이 없는 파일, `MEMORY.md` 인덱스는 건너뜁니다. `--from`은 `--file`, `--include`, `--exclude`, `--kind`, `--all`, `--budget-tokens`, `--refresh`와 함께 사용할 수 없습니다.

Engram은 호스트 저장소에 절대 쓰지 않습니다. 가져온 내용은 민감 정보가 가려지고 인젝션 필터링을 거치며, 일반 승인 게이트를 통과하고, `source: host-memory`와 프리셋 기준 상대 `source_files`(예: `claude-auto-memory/feedback_testing.md`, 홈 경로는 절대 사용하지 않음)를 기록합니다. `engram verify --sources`는 저장소를 가진 머신에서만 변경 여부를 확인합니다(다른 곳에서는 `host memory store not on this machine`이라고 보고). Gemini 프리셋은 없습니다.

## metacognize

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --force
```

AI 에이전트가 기존 Engram 메모리 폴더를 검토하고 같은 save-session 승인 흐름을 통해 더 안전한 구조를 제안하게 하려면 `metacognize`를 사용하세요. 에이전트는 통합이나 표현 정리에는 `UPDATE: memory-id`를, 계층형 메모리에는 `DEPENDS_ON: memory-id`를 사용해야 합니다.


## 스키마 v3로의 기존 메모리 마이그레이션 {#legacy-memory-migration-to-schema-v3}

`engram upgrade --latest`는 워크스페이스와 구성된 글로벌 루트의 활성 v1/v2 메모리 파일도 스키마 v3(schema v3)로 마이그레이션합니다. Engram은 각 Markdown 본문을 그대로 보존하고, `backups/schema-v3/<memory-file>.pre-v3.bak`을 기록하며(gitignore된 폴더이며, `engram repair --move-backups`가 메모리 옆에 남은 이전 백업을 옮겨 줍니다), 결정적인 메타데이터만 채우고, 무결성 해시를 갱신하며, 인덱스, 그래프, 대상 벡터 사이드카를 다시 빌드합니다. `evidence_refs`를 임의로 만들어 내지 않으며, 검증된 추적 링크가 없는 메모리에는 `evidence_status: unverified`가 표시됩니다. 유효하지 않은 메모리는 보고 후 건너뛰고, 아카이브된 메모리는 다시 기록하지 않으며, 두 번째 실행은 결과가 달라지지 않습니다(멱등).

쓰기 없이 모든 변경 내용을 미리 봅니다.

```bash
engram upgrade --latest --plan
```

연결된 에이전트 아티팩트를 덮어쓰지 않고 메모리 마이그레이션만 실행합니다.

```bash
engram upgrade --migrate-memories
```

최신 업그레이드 중 메모리 마이그레이션을 건너뜁니다.

```bash
engram upgrade --latest --no-migrate-memories
```

## 다음 단계 {#next-steps}

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [에이전트 연동 개요](../integrations/overview.md)


<!-- configuration-upgrade-inventory -->
## 설정 업그레이드 인벤토리 {#configuration-upgrade-inventory}

패키지를 업데이트한 후에는 `engram upgrade --latest`를 실행하기 전에 `engram upgrade --latest --plan`을 먼저 실행하세요. 공유 인벤토리는 워크스페이스와 글로벌에서 Engram이 관리하는 메모리, 지침, 스킬셋, 설정, 훅, 플러그인을 스캔합니다. 사용자가 작성한 바이트는 보존되며, 모호하게 섞인 파일은 충돌로 보고됩니다. [설정 업그레이드](../operations/configuration-upgrades.md)를 참고하세요.
