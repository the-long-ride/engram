---
title: 설치 및 구성
sidebar_position: 3
description: Engram CLI 설치, 작업 공간 초기화, 글로벌 메모리 구성 및 AI 에이전트 연결.
---

# 설치 및 구성

## 요구 사항

- Node.js `>=20`
- 지원되는 AI 에이전트 (Codex, Claude, Gemini, Cursor, Windsurf, OpenCode, Copilot, Cline 또는 모든 AGENTS.md 호환 호스트)

## CLI 설치

```bash
npm install -g @the-long-ride/engram
```

확인:

```bash
engram --version
```

두 개의 바이너리가 설치됩니다:

- `engram` — 메인 CLI
- `engram-mcp` — 외부 도구 프로세스를 등록하는 호스트용 MCP 서버 바이너리

## 작업 공간 (workspace) 초기화

프로젝트 루트에서 실행:

```bash
engram inject
```

이 명령은 `.agents/.engram/`을 생성하고 기본적으로 컴팩트 Codex 타겟을 설치합니다: `AGENTS.md` 및 `.agents/skills/engram/SKILL.md`.

에이전트 파일을 건너뛰려면 `engram inject --no-skillset`을 사용하고, 설치 중에 지원되는 모든 어댑터를 설치하려면 `engram inject --skillset all`을 사용합니다. 인간이 작성한 기존 파일은 건너뜁니다.

## Entry Web UI로 구성

가장 친숙한 구성 방법:

```bash
engram entry
```

이 명령은 로컬 전용 제어판을 시작합니다. JSON을 직접 편집하지 않고도 메모리 루트를 구성하고 에이전트를 연결하고 라우팅을 조정할 수 있습니다. 각 탭과 필드에 대한 내용은 [Entry Web UI](entry/index.md)를 참조하십시오.

## 글로벌 메모리 구성

글로벌 메모리는 선택 사항이며 구성한 위치에 저장됩니다. 프로젝트 전반에 걸쳐 유지되어야 하는 기본 설정과 팀 컨텍스트를 보관합니다.

```bash
engram inject --global-only --global-path ~/Documents/engram
```

또는 나중에 글로벌 폴더 업데이트:

```bash
engram update-global-folder ~/Documents/engram
engram ugf ~/Documents/engram
```

`engram set global memory path to <new-path>` 및 `engram move global folder from <old-path> to <new-path>`와 같은 대화형 양식은 동일한 명령으로 표준화됩니다. 이전 글로벌 루트 전체를 새 위치로 이동하려는 경우 `--move-from-path <old-path>`를 추가합니다.

## AI 에이전트 연결

호스트에 에이전트 hook 및 MCP 등록 설치:

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

`engram link all`은 하나의 통합 설치 내에서 공개 타겟 세트를 설치하고 기술 세트 지침 파일, MCP 구성, 슬래시 어댑터 및 에이전트 hook에 대한 부분 호스트의 결정론적 `SKIPPED` 이유를 보고합니다. `engram unlink`는 이들을 모두 함께 제거합니다.

전체 타겟 매트릭스는 [에이전트 통합](integrations/overview.md)을 참조하십시오.

## 서브모듈 워크플로우 (Submodule)

인간이 `.agents/.engram`을 별도의 저장소로 관리하려는 경우:

```bash
engram inject --submodule
```

인간이 URL을 제공한 후에만 `--submodule-remote <git-url>`을 추가합니다. Engram은 URL을 확인하고, `main`에서 서브모듈을 초기화하고, 첫 번째 서브모듈 커밋을 `Initialize engram`으로 생성합니다.

## 공유 글로벌 Git 원격 저장소

`engram entry`에 `global_git_detected.remote_url`이 감지되지 않는 경우, 글로벌 메모리를 Git을 통해 공유해야 하는지 인간에게 문의하십시오. URL이 제공되면 다음을 실행합니다:

```bash
engram inject --global-remote <git-url>
```

## 설치 확인

```bash
engram verify
engram load --dry-run "setup"
engram llm
```

`engram llm`은 패키지된 AI 에이전트 사용 가이드를 인쇄하며 초기화된 작업 공간이 필요하지 않습니다.

## 다음 단계

- [일일 워크플로우](daily-workflow.md)
- [Entry Web UI](entry/index.md)
- [에이전트 통합](integrations/overview.md)
