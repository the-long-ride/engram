---
title: Gemini
sidebar_position: 4
description: Gemini CLI 및 Antigravity의 Gemini 호환 인터페이스를 통한 Engram 통합.
---

# Gemini

Gemini CLI는 컨텍스트로 `GEMINI.md` 파일을 검색합니다. `slash` 대상은 `.gemini/commands/engram.toml`을 작성하여 `/engram <args>`를 Gemini CLI의 프로젝트 사용자 지정 명령으로 만듭니다.

Engram은 또한 현재 Google 문서가 Antigravity의 컨텍스트 및 스킬을 Gemini 호환 위치에 연결하므로 `gemini`를 Antigravity 2.0, Antigravity CLI 및 Antigravity IDE의 공개 대상으로 취급합니다. 숨겨진 대상 이름인 `antigravity` 및 `antigravity-cli`는 명시적인 호환성 경로로 유지되지만 `engram link list`, 도움말, 자동 완성 또는 `all`에는 표시되지 않습니다.

## 설치 {#install}

```bash
engram link gemini
```

## 작성된 파일 {#files-written}

| 파일 | 목적 |
| --- | --- |
| `GEMINI.md` | 프로젝트 컨텍스트 부트스트랩 |
| `.gemini/commands/engram.toml` | `/engram` 슬래시 어댑터 |
| `.gemini/settings.json` | `SessionStart`, `BeforeAgent`, `AfterTool`, `PreCompress` 훅 |
| `.gemini/settings.json` | MCP 등록 (`mcpServers.engram`, 훅 옆에 병합됨) |

## 전역 설치 {#global-install}

```bash
engram link --global gemini
```

`~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md`를 작성하고 `~/.gemini/settings.json`에 `mcpServers.engram`을 병합합니다.

## 런타임 우선 대상 {#runtime-first-target}

Gemini는 런타임 우선 대상입니다. `GEMINI.md`에는 세부 프로토콜을 위해 MCP 도구 및 훅에 의존하는 짧은 부트스트랩 지침이 포함되어 있습니다. 동반 안내서에는 전체 쓰기/승인 워크플로가 포함되어 있으며 Agent Skill 파일은 이에 대한 짧은 포인터 역할을 합니다.

## 훅 동작 {#hook-behavior}

Gemini는 `SessionStart` 및 `BeforeAgent` 이벤트를 통해 시작 및 프롬프트 시 `hookSpecificOutput.additionalContext` 주입을 지원합니다. `PreCompress`(CLI가 기록을 요약하기 전)는 전달된 집합을 재설정합니다. `AfterTool`(matcher `read_file|write_file|replace`, 밀리초 단위 제한 시간)은 도구가 건드린 파일과 `applies_to` glob이 일치하는 전달되지 않은 메모리를 최대 3개까지 주입합니다. 컨텍스트가 도구 결과에 추가되므로 읽기 후 한 단계 뒤에 도착합니다. `BeforeAgent`와 전달된 세트를 공유하며 결정을 반환하지 않습니다. `engram link gemini` 또는 `engram upgrade --latest`는 기존 설치에 이벤트를 추가합니다.

`.gemini/settings.json`의 `mcpServers.engram`이 `trust: true`를 설정하면 Gemini는 `engram_commit`에 대한 확인을 건너뜁니다. `engram doctor`는 이에 대해 경고합니다(`host.gemini_trust`).

## Antigravity 호환성 {#antigravity-compatibility}

훅의 경우 `gemini`는 Antigravity의 공개 대체 대상이기도 합니다. 숨겨진 `antigravity` 및 `antigravity-cli` 훅 대상은 Google이 안정적인 주요 Antigravity 훅/구성 문서를 게시할 때까지 Gemini의 훅 동작 및 경로로 정규화됩니다.

## 다음 단계 {#next-steps}

- [에이전트 통합 개요](overview.md)
- [훅 및 증명 라인](hooks.md)
