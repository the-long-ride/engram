---
title: Cursor
sidebar_position: 5
description: 규칙, MCP, 로컬 플러그인, 슬래시 명령어 및 세션 시작 훅을 통한 Engram과 Cursor의 통합.
---

# Cursor

Cursor는 `.cursor/rules/*.mdc` 파일에서 프로젝트 규칙을 읽습니다. Engram은 유효한 프런트매터(`alwaysApply: true`)와 부트스트랩 지침 블록이 포함된 `.cursor/rules/engram.mdc`를 작성합니다.

## 설치

```bash
engram link cursor
```

## 작성된 파일

| 파일 | 목적 |
| --- | --- |
| `.cursor/rules/engram.mdc` | `alwaysApply: true`가 적용된 프로젝트 규칙 |
| `.cursor/mcp.json` | MCP 등록 (`type: "stdio"`) |
| `.cursor/hooks.json` | `sessionStart` 훅 |
| `.cursor/commands/engram.md` | `/engram` 슬래시 어댑터 |

## 글로벌 설치

```bash
engram link --global cursor
```

Engram은 플러그인 매니페스트, 규칙, 스킬, 명령어, MCP 구성 및 훅이 포함된 로컬 플러그인을 `~/.cursor/plugins/local/engram/`에 생성합니다.

## 런타임 우선 대상

Cursor는 런타임 우선 대상입니다. 프로젝트 규칙에는 자세한 프로토콜을 위해 MCP 도구 및 훅에 의존하는 짧은 부트스트랩 지침이 포함되어 있으며, Agent Skill 파일이 전체 작성/승인 워크플로우를 전달합니다.

## 훅 동작

`sessionStart` 훅은 `additional_context` 출력 필드를 통해 Engram 시작 컨텍스트를 주입합니다. `beforeSubmitPrompt`는 허용/차단 전용이며 컨텍스트 주입에 사용되지 않습니다.

## 다음 단계

- [에이전트 통합 개요](overview.md)
- [훅 및 검증 라인](hooks.md)
