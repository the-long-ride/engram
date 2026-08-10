---
title: Codex
sidebar_position: 2
description: AGENTS.md 및 Agent Skills를 통한 Engram과 OpenAI Codex의 통합.
---

# Codex

OpenAI Codex 및 기타 AGENTS.md 호환 에이전트는 `AGENTS.md`를 프로젝트 지침 파일로 사용합니다. `codex` 별칭은 에이전트가 Agent Skills를 발견할 때 Engram을 호출 가능한 스킬로 라우팅할 수 있도록 `.agents/skills/engram/SKILL.md`도 작성합니다.

## 설치

```bash
engram link codex
```

## 작성된 파일

| 파일 | 목적 |
| --- | --- |
| `AGENTS.md` | 프로젝트 지침 부트스트랩 |
| `.agents/skills/engram/SKILL.md` | 전체 작성/승인 워크플로우를 갖춘 Agent Skill |
| `.codex/hooks.json` | `SessionStart` 및 `UserPromptSubmit` 훅 |
| `.mcp.json` | MCP 등록 |

## 글로벌 설치

```bash
engram link --global codex
```

Codex 스킬을 `~/.codex/skills/engram/SKILL.md`에 작성하고 공유 Codex 지침 파일에 관리형 블록을 추가합니다.

## 훅 동작

Codex는 시작 시점 및 프롬프트 시점의 추가 컨텍스트 주입을 지원합니다. `SessionStart`는 시작할 때 라우팅된 메모리를 로드하고, `UserPromptSubmit`은 라우팅된 Engram 컨텍스트가 변경될 때만 다시 주입합니다.

## 런타임 우선 대상

Codex는 런타임 우선 대상입니다. `AGENTS.md`에는 자세한 프로토콜을 위해 MCP 도구 및 훅에 의존하는 짧은 부트스트랩 지침이 포함되어 있으며, Agent Skill 파일이 전체 작성/승인 워크플로우를 전달합니다.

## 다음 단계

- [에이전트 통합 개요](overview.md)
- [훅 및 검증 라인](hooks.md)
