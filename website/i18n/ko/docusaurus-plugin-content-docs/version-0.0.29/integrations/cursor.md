---
title: Cursor
sidebar_position: 5
description: 규칙, MCP, 로컬 플러그인, 슬래시 명령 및 세션 시작 훅을 통한 Engram과 Cursor 통합.
---

# Cursor

Cursor는 `.cursor/rules/*.mdc` 파일에서 프로젝트 규칙을 읽습니다. Engram은 유효한 프론트매터(`alwaysApply: true`) 및 부트스트랩 지침 블록이 포함된 `.cursor/rules/engram.mdc`를 작성합니다.

## 설치 {#install}

```bash
engram link cursor
```

## 작성된 파일 {#files-written}

| 파일 | 목적 |
| --- | --- |
| `.cursor/rules/engram.mdc` | `alwaysApply: true`가 적용된 프로젝트 규칙 |
| `.cursor/mcp.json` | MCP 등록 (`type: "stdio"`) |
| `.cursor/rules/engram/<id>.mdc` | `applies_to`가 있는 워크스페이스 메모리당 생성된 규칙 1개(`alwaysApply: false`, 쉼표로 연결된 glob); 작업 계층 메모리는 절대 기록되지 않음 |
| `.cursor/hooks.json` | `sessionStart` 훅 |
| `.cursor/commands/engram.md` | `/engram` 슬래시 어댑터 |

## 전역 설치 {#global-install}

```bash
engram link --global cursor
```

Engram은 플러그인 매니페스트, 규칙, 스킬, 명령, MCP 구성 및 훅이 포함된 로컬 플러그인을 `~/.cursor/plugins/local/engram/`에 생성합니다.

## 런타임 우선 대상 {#runtime-first-target}

Cursor는 런타임 우선 대상입니다. 프로젝트 규칙에는 세부 프로토콜을 위해 MCP 도구 및 훅에 의존하는 짧은 부트스트랩 지침이 포함되어 있습니다. 동반 안내서에는 전체 쓰기/승인 워크플로가 포함되어 있으며 Agent Skill 파일은 이에 대한 짧은 포인터 역할을 합니다.

## 훅 동작 {#hook-behavior}

`sessionStart` 훅은 `additional_context` 출력 필드를 통해 Engram 시작 컨텍스트를 주입합니다. `beforeSubmitPrompt`는 허용/차단 전용이며 컨텍스트 주입에 사용되지 않습니다.

## 내보내기 형식 {#export-format}

`engram export --format cursor-rules`는 `description` 및 `alwaysApply: false` 프론트매터를 사용하여 `.cursor/rules/engram.mdc`를 작성합니다. 이는 한 릴리스 동안 허용되는 별칭으로 유지되고 stderr에 지원 중단 알림을 출력하는 `cursorrules`를 대체합니다. `live_sync.targets`는 새 이름을 사용합니다.

## 다음 단계 {#next-steps}

- [에이전트 통합 개요](overview.md)
- [훅 및 증명 라인](hooks.md)
