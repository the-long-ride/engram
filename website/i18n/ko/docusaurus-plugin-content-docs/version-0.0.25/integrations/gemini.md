---
title: Gemini
sidebar_position: 4
description: Gemini CLI 및 Antigravity Gemini 호환 서피스를 통한 Engram 통합.
---

# Gemini

Gemini CLI는 컨텍스트로 `GEMINI.md` 파일을 검색합니다. `slash` 대상은 `.gemini/commands/engram.toml`을 작성하여 `/engram <args>`가 Gemini CLI의 프로젝트 사용자 정의 명령어가 되도록 합니다.

Engram은 현재 Google 문서가 여전히 Antigravity 컨텍스트와 스킬을 Gemini 호환 위치에 묶어두고 있기 때문에 `gemini`를 Antigravity 2.0, Antigravity CLI 및 Antigravity IDE에 대한 광고 대상으로 취급합니다. 숨겨진 `antigravity` 및 `antigravity-cli` 대상 이름은 명시적인 호환성 경로로 유지되지만 `engram link list`, 도움말, 완료 또는 `all`에는 표시되지 않습니다.

## 설치

```bash
engram link gemini
```

## 작성된 파일

| 파일 | 목적 |
| --- | --- |
| `GEMINI.md` | 프로젝트 컨텍스트 부트스트랩 |
| `.gemini/commands/engram.toml` | `/engram` 슬래시 어댑터 |
| `.gemini/settings.json` | `SessionStart` 및 `BeforeAgent` 훅 |
| Gemini MCP config | MCP 등록 |

## 글로벌 설치

```bash
engram link --global gemini
```

`~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` 및 Gemini MCP 구성 파일을 작성합니다.

## 런타임 우선 대상

Gemini는 런타임 우선 대상입니다. `GEMINI.md`에는 자세한 프로토콜을 위해 MCP 도구 및 훅에 의존하는 짧은 부트스트랩 지침이 포함되어 있으며, Agent Skill 파일이 전체 작성/승인 워크플로우를 전달합니다.

## 훅 동작

Gemini는 `SessionStart` 및 `BeforeAgent` 이벤트를 통해 시작 시점 및 프롬프트 시점의 `hookSpecificOutput.additionalContext` 주입을 지원합니다.

## Antigravity 호환성

훅의 경우 `gemini`는 공개 Antigravity 대체 기능이기도 합니다. 숨겨진 `antigravity` 및 `antigravity-cli` 훅 대상은 Google이 안정적인 기본 Antigravity 훅/구성 문서를 게시할 때까지 Gemini 훅 동작 및 경로로 정규화됩니다.

## 다음 단계

- [에이전트 통합 개요](overview.md)
- [훅 및 검증 라인](hooks.md)
