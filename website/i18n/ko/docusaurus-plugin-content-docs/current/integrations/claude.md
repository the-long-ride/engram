---
title: Claude
sidebar_position: 3
description: CLAUDE.md, 슬래시 명령, Agent Skills, MCP 및 훅을 통한 Engram과 Claude Code 통합.
---

# Claude

Claude Code는 프로젝트 안내를 위해 `CLAUDE.md`를 읽고(`CLAUDE.md`가 없을 때만 프로젝트 `AGENTS.md`를 읽음) `.mcp.json`을 통한 외부 도구 구성을 지원합니다. Engram의 부트스트랩은 AGENTS.md 우선입니다.

## 설치 {#install}

```bash
engram link claude
```

## 작성된 파일 {#files-written}

| 파일 | 목적 |
| --- | --- |
| `AGENTS.md` | 프로젝트 안내 부트스트랩 (Codex 및 OpenCode와 공유되는 관리형 블록) |
| `CLAUDE.md` 또는 `.claude/CLAUDE.md` | 해당 파일이 이미 존재하고 `@AGENTS.md`를 가져오지 않는 경우에만 부트스트랩 블록; 새로 생성되지 않음 |
| `.claude/engram.md`, `.agents/engram.md` | 전체 쓰기/승인 워크플로가 포함된 동반 안내서 |
| `.claude/rules/engram/<id>.md` | `applies_to`가 있는 워크스페이스 메모리당 생성된 경로 규칙 1개 (`hooks.path_rules native`) |
| `.claude/commands/engram.md` | 기존 `/engram` 슬래시 명령 |
| `.claude/skills/engram/SKILL.md` | 슬래시 호출을 위한 Agent Skill |
| `.claude/settings.json` | `SessionStart`, `UserPromptSubmit`, `InstructionsLoaded`, `PreCompact`, `SubagentStart` 훅 |
| `.mcp.json` | MCP 등록 |

Claude는 `.claude/commands/engram.md` 및 `.claude/skills/engram/SKILL.md`를 모두 수신하므로 이전 명령 메뉴와 최신 스킬 지원 Claude Code 세션에 `/engram`이 표시됩니다.

## 전역 설치 {#global-install}

```bash
engram link --global claude
```

Engram은 사용자 텍스트를 보존하면서 관리형 블록을 `~/.claude/CLAUDE.md`에 추가하고 Claude 스킬을 `~/.claude/skills/engram/SKILL.md`에 작성합니다. Claude Code는 `~/.claude/mcp.json`을 읽지 않으므로 전역 MCP는 힌트로 제공되며, 실행할 수 있도록 `claude mcp add --scope user engram -- engram-mcp`를 출력합니다.

## 런타임 우선 대상 {#runtime-first-target}

Claude는 런타임 우선 대상입니다. `AGENTS.md` 블록(및 해당 파일이 존재하는 `CLAUDE.md` 블록)에는 세부 프로토콜을 위해 MCP 도구 및 훅에 의존하는 짧은 부트스트랩 지침이 포함되어 있습니다. 동반 안내서에는 전체 쓰기/승인 워크플로가 포함되어 있으며 Agent Skill 파일은 이에 대한 짧은 포인터 역할을 합니다. 기존 `CLAUDE.md` 블록은 새로 고쳐지며 제거되지 않으며, `engram link`는 Claude에게 `AGENTS.md`를 숨기는 `CLAUDE.local.md` 또는 상위 디렉터리 `CLAUDE.md`를 보고합니다. 생성된 스킬은 Agent Skills 사양을 따르고 `when_to_use` 및 `user-invocable: true`를 추가합니다. `engram doctor`는 이를 검증합니다(`host.skill_frontmatter`). Claude는 사용자 수준 `AGENTS.md`를 읽지 않으므로 전역 설치는 여전히 `~/.claude/CLAUDE.md`에 작성됩니다.

## 훅 동작 {#hook-behavior}

Claude는 시작 및 프롬프트 시 추가 컨텍스트 주입을 지원합니다. `SessionStart`는 시작 시 라우팅된 메모리를 로드합니다. `UserPromptSubmit`은 세션에서 아직 전달되지 않은 메모리 본문만 주입합니다. `PreCompact`는 전달된 세트를 재설정합니다. `SubagentStart`(matcher `*`)는 자체 전달 세트 아래의 각 서브에이전트에 라우팅된 컨텍스트를 주입하며, 훅 출력은 9,500자 미만으로 유지됩니다. `applies_to` glob이 있는 메모리는 네이티브 경로 규칙으로 Claude에 도달합니다: `engram link claude`는 `.claude/rules/engram/<id>.md`를 작성하고(경로 전용 프론트매터 및 `<!-- engram:<scope>:<file> sha:<8> -->` 마커), `InstructionsLoaded` 훅(matcher `path_glob_match`)은 전달된 세트와 `usage.json`에 각 로드를 기록합니다. 작업 계층 메모리는 절대 기록되지 않으며, 글로벌 메모리는 `engram link --global claude` 시 `~/.claude/rules/engram/`으로 이동하고 마커가 없는 파일은 그대로 유지됩니다. 중괄호 glob은 Claude Code v2.1.217 이상이 필요합니다. 이전 `PreToolUse` 주입을 대신 유지하려면 `engram config set hooks.path_rules hook` 및 `engram link claude`를 실행하세요. 그러면 생성된 규칙 파일도 제거됩니다.

## MCP 승인 {#mcp-approval}

`engram_commit`은 `_meta["anthropic/requiresUserInteraction"]: true`를 전달하므로 Claude Code는 바이패스 모드에서도 매 호출 전에 확인을 요청합니다. 이 상태를 유지하세요. `approval_token`은 제안이 존재한다는 것만 증명합니다. [MCP 도구](mcp.md)를 참조하세요.

## 다음 단계 {#next-steps}

- [에이전트 통합 개요](overview.md)
- [슬래시 어댑터](slash.md)
- [MCP 도구](mcp.md)
