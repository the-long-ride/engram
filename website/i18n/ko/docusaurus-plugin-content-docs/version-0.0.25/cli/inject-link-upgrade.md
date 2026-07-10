---
title: inject / link / upgrade
sidebar_position: 4
description: 설정 및 어댑터 명령 — 작업 공간 초기화, 에이전트 연결 및 패키지 업데이트 후 조정.
---

# inject / link / upgrade

설정 및 어댑터 명령은 작업 공간을 초기화하고 에이전트를 연결하며 패키지 업데이트 후 조정을 수행합니다.

## inject

```bash
engram inject
engram inject --global-only --global-path <path>
engram inject --submodule
engram inject --submodule-remote <git-url>
engram inject --global-remote <git-url>
engram inject --no-skillset
engram inject --skillset all
```

`engram inject`는 `.agents/.engram/`을 생성하고 기본적으로 컴팩트 Codex 타겟을 설치합니다. 인간이 작성한 기존 파일은 건너뜁니다.

대화형 inject는 다음 순서로 묻습니다: `./.agents/.engram`을 서브모듈로 추가할지 여부, 글로벌 Engram 경로를 사용할지 여부, 공유 글로벌 Git 원격 저장소를 추가할지 여부.

구성된 글로벌 경로만 업데이트하려면 `engram update-global-folder <new-path>` 또는 `engram ugf <new-path>`를 사용합니다. `engram set global memory path to <new-path>` 및 `engram move global folder from <old-path> to <new-path>`와 같은 대화형 양식은 동일한 명령으로 표준화됩니다. 이전 글로벌 루트 전체를 이동하려는 경우 `--move-from-path <old-path>`를 추가합니다.

## link

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram link all
engram unlink
```

`engram link all`은 하나의 통합 설치 내에서 공개 타겟 세트를 설치하고 기술 세트 지침 파일, MCP 구성, 슬래시 어댑터 및 에이전트 hook에 대한 부분 호스트의 결정론적 `SKIPPED` 이유를 보고합니다. `engram unlink`는 이들을 모두 함께 제거합니다. `engram unlink --global <target>`은 Engram에서 생성한 글로벌 플러그인만 제거하며, `--force`가 명시되지 않는 한 인간이 작성한 파일은 보존됩니다.

## upgrade

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

더 새로운 Engram 패키지를 설치한 후 `engram upgrade`를 사용합니다. 이 명령은 v0.0.8부터 초기화된 메모리 루트를 현재 릴리스 스키마와 비교하고 생성된 `HELP.md`, 메모리 인덱스, 그래프 파일, 적격 벡터 사이드카, 생성된 작업 공간 기술 세트, 글로벌 메모리 스캐폴딩 및 등록된 글로벌 에이전트 기술 세트를 새로 고치는 동시에 인간이 작성한 파일은 보존합니다.

일반 명령도 `--no-auto-upgrade` 또는 `ENGRAM_NO_AUTO_UPGRADE=1`이 설정되어 있지 않는 한 패키지 버전당 한 번 자동으로 루트 조정을 실행합니다.

새 패키지 출력이 Engram에서 관리하는 기존 연결 에이전트 아티팩트를 덮어써야 하는 경우 `engram upgrade --latest`를 사용합니다. 이 경로는 연결된 작업 공간 지침 파일, 규칙, MCP/플러그인 구성 및 관리되는 hook을 다시 적용하고 등록된 글로벌 에이전트 설치를 생성된 최신 파일로 새로 고칩니다.

생성된 Engram 어댑터 파일을 의도적으로 교체할 때만 `--force`를 사용하십시오.

## take-control

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --force
```

`take-control`은 기존 작업 공간 지침을 위한 에이전트 지원 인수 흐름입니다. `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Cursor 규칙, 메모리 뱅크 메모 및 최상위 `rules/`, `skills/`, `workflows/`, `knowledge/` 또는 `notes/` 폴더(.txt 메모 포함)와 같은 파일에서 간결한 소스 팩을 구축합니다.

저장된 take-control 메모리는 `source_files` 및 `source_hashes`를 기록하므로 변경되지 않은 소스는 나중에 건너뜁니다.

## metacognize

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --force
```

AI 에이전트가 기존 Engram 메모리 폴더를 검토하고 동일한 save-session 승인 흐름을 통해 더 안전한 구조를 제안하도록 하려면 `metacognize`를 사용합니다. 에이전트는 통합 또는 어구 정리를 위해 `UPDATE: memory-id`를 사용하고 레이어드 메모리를 위해 `DEPENDS_ON: memory-id`를 사용해야 합니다.

## 다음 단계

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [에이전트 통합 개요](../integrations/overview.md)

