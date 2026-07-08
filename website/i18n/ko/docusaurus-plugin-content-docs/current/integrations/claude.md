---
title: Claude
sidebar_position: 3
description: CLAUDE.md, 슬래시 명령어, Agent Skills, MCP 및 훅을 통한 Engram과 Claude Code의 통합.
---

# Claude

Claude Code는 프로젝트 가이드를 위해 `CLAUDE.md`를 읽고 `.mcp.json`을 통해 외부 도구 구성을 지원합니다.

## 설치

```bash
engram link claude
```

## 작성된 파일

| 파일 | 목적 |
| --- | --- |
| `CLAUDE.md` | 프로젝트 가이드 부트스트랩 |
| `.claude/commands/engram.md` | 클래식 `/engram` 슬래시 명령어 |
| `.claude/skills/engram/SKILL.md` | 슬래시 호출을 위한 Agent Skill |
| `.claude/settings.json` | `SessionStart` 및 `UserPromptSubmit` 훅 |
| `.mcp.json` | MCP 등록 |

Claude는 `.claude/commands/engram.md`와 `.claude/skills/engram/SKILL.md`를 모두 수신하므로, 이전 명령어 메뉴와 새로운 스킬 인식 Claude Code 세션 모두에 `/engram`이 나타납니다.

## 글로벌 설치

```bash
engram link --global claude
```

Engram은 `~/.claude/CLAUDE.md`에 관리형 블록을 추가하고(사용자 텍스트 유지), Claude 스킬을 `~/.claude/skills/engram/SKILL.md`에 작성합니다. 글로벌 MCP는 `~/.claude/mcp.json`에 작성됩니다.

## 런타임 우선 대상

Claude는 런타임 우선 대상입니다. `CLAUDE.md`에는 자세한 프로토콜을 위해 MCP 도구 및 훅에 의존하는 짧은 부트스트랩 지침이 포함되어 있으며, Agent Skill 파일이 전체 작성/승인 워크플로우를 전달합니다.

## 훅 동작

Claude는 시작 시점 및 프롬프트 시점의 추가 컨텍스트 주입을 지원합니다. `SessionStart`는 시작할 때 라우팅된 메모리를 로드하고, `UserPromptSubmit`은 라우팅된 Engram 컨텍스트가 변경될 때만 다시 주입합니다.

## 다음 단계

- [에이전트 통합 개요](overview.md)
- [슬래시 어댑터](slash.md)
- [MCP 도구](mcp.md)
