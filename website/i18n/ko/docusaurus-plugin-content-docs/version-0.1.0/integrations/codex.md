---
title: Codex
sidebar_position: 2
description: AGENTS.md 및 Agent Skills를 통한 Engram과 OpenAI Codex 통합.
---

# Codex

OpenAI Codex 및 기타 AGENTS.md 호환 에이전트는 `AGENTS.md`를 프로젝트 지침 파일로 사용합니다. `codex` 별칭은 `.agents/skills/engram/SKILL.md`도 작성하므로 Agent Skills를 검색하는 에이전트가 Engram을 호출 가능한 스킬로 라우팅할 수 있습니다.

## 설치 {#install}

```bash
engram link codex
```

## 작성된 파일 {#files-written}

| 파일 | 목적 |
| --- | --- |
| `AGENTS.md` | 프로젝트 지침 부트스트랩 |
| `.agents/skills/engram/SKILL.md` | 안내서를 가리키는 짧은 Agent Skill 포인터 |
| `.agents/engram.md` | 전체 쓰기/승인 워크플로가 포함된 동반 안내서 |
| `.codex/hooks.json` | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PreCompact`, `SubagentStart` 훅 |
| `.mcp.json` | MCP 등록 |

## 전역 설치 {#global-install}

```bash
engram link --global codex
```

Codex 스킬을 `~/.codex/skills/engram/SKILL.md`에 작성하고 공유 Codex 지침 파일에 관리 블록을 추가합니다. 글로벌 MCP는 `~/.codex/config.toml`의 관리형 `[mcp_servers.engram]` 블록입니다. 또한 `[mcp_servers.engram.tools.engram_commit]`에 `approval_mode = "approve"`를 설정하여 Codex가 커밋할 때마다 확인하도록 합니다(`engram upgrade` 또는 `engram link codex`로 이전 블록 갱신). `engram doctor`는 Codex의 32 KiB 제한에 대해 AGENTS.md 체인의 크기를 보고합니다(`host.agents_md_chain`).

## 훅 동작 {#hook-behavior}

Codex는 시작 및 프롬프트 시 추가 컨텍스트 주입을 지원합니다. `SessionStart`는 시작 시 라우팅된 메모리를 로드합니다. `UserPromptSubmit`은 세션에서 아직 전달되지 않은 메모리 본문만 주입합니다. `PreToolUse`는 `apply_patch`를 통해 편집된 파일과 `applies_to` glob이 일치하는 메모리를 주입하며(읽기 시에는 발생하지 않음), `PreCompact`는 전달된 세트를 재설정합니다. `SubagentStart`(matcher `*`)는 라우팅된 컨텍스트를 각 서브에이전트에 주입합니다. 서브에이전트의 전달 세트는 `<session_id>#agent:<agent_id>`로 키가 지정되므로 상위 세트를 건드리지 않습니다. Codex는 훅 메시지를 약 2,500개 토큰으로 제한하므로 Engram은 `additionalContext`를 2,400개 토큰 이하로 유지하고 본문을 자르는 대신 카드로 강등합니다.

## 런타임 우선 대상 {#runtime-first-target}

Codex는 런타임 우선 대상입니다. `AGENTS.md`에는 세부 프로토콜을 위해 MCP 도구 및 훅에 의존하는 짧은 부트스트랩 지침이 포함되어 있습니다. 동반 안내서에는 전체 쓰기/승인 워크플로가 포함되어 있으며 Agent Skill 파일은 이에 대한 짧은 포인터 역할을 합니다.

## 다음 단계 {#next-steps}

- [에이전트 통합 개요](overview.md)
- [훅 및 증명 라인](hooks.md)
