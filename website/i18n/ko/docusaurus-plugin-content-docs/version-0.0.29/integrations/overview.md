---
title: 에이전트 통합 개요
sidebar_position: 1
description: Engram은 다양한 AI 호스트 전반에서 스킬 파일, 슬래시 어댑터, MCP 도구 및 에이전트 훅을 지원합니다.
---

# 에이전트 통합 개요 {#agent-integrations-overview}

Engram은 두 가지 통합 레이어를 지원합니다:

- **스킬 파일(Skill files)** — 프로젝트 컨텍스트를 읽는 에이전트를 위해 생성된 지침.
- **슬래시 어댑터(Slash adapters)** — 프로젝트 슬래시 명령어 또는 Agent Skills를 지원하는 에이전트를 위해 생성된 `/engram` 명령 프롬프트.
- **MCP 스타일 도구** — 외부 도구 프로세스를 등록할 수 있는 에이전트를 위한 JSON-lines 래퍼.
- **에이전트 훅(Agent hooks)** — 세션 시작 시 및 이후 작업 전환 턴에서 라우팅된 Engram 컨텍스트를 주입하는 옵트인 호스트 훅.

## 빠른 시작 {#quick-start}

```bash
engram inject
engram link all
```

`engram link all`은 공개 대상 세트를 설치하고 스킬셋 지침 파일, MCP 설정, 슬래시 어댑터 및 에이전트 훅 전반에서 부분 지원 호스트에 대한 결정론적 `SKIPPED` 이유를 하나의 통합 설치로 보고합니다.

## 대상 범주 {#target-categories}

| 범주 | 대상 | 동작 |
| --- | --- | --- |
| 런타임 우선 | `codex`, `claude`, `cursor`, `gemini` | 짧은 부트스트랩 지침, 전체 워크플로가 포함된 동반 가이드, 짧은 Agent Skill 포인터 및 MCP 설정 |
| 훅 지원 | `codex`, `claude`, `gemini`, `opencode`, `cursor`, `windsurf`/`cascade` | 호스트별 이벤트 스키마를 사용하는 에이전트 훅 |
| 컴팩트/수동 폴백 | `agents-md`, `copilot`, `cline` | 전체 컴팩트 프로토콜; v1에서는 신뢰할 수 있는 런타임 컨텍스트 주입 없음 |

## 지원 대상 {#supported-targets}

| 대상 | 파일 | 주요 용도 |
| --- | --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` | OpenAI Codex 프로젝트 지침 및 Agent Skill |
| `agents-md` | `AGENTS.md` | 목록에 없는 AGENTS.md 호환 에이전트를 위한 일반 폴백 |
| `copilot` | `.github/copilot-instructions.md`; 글로벌: `~/.copilot/copilot-instructions.md` | GitHub Copilot 저장소 및 사용자 지침 |
| `claude` | `AGENTS.md`, `.claude/engram.md`, `.agents/engram.md`, 해당 파일이 이미 존재할 때만 추가되는 `CLAUDE.md` 블록, 그리고 `.claude/rules/engram/<id>.md` 경로 규칙 | Claude Code 프로젝트 안내 및 네이티브 경로 규칙 |
| `cursor` | `.cursor/rules/engram.mdc`, `.cursor/rules/engram/<id>.mdc` 경로 규칙; 글로벌: `~/.cursor/plugins/local/engram/` | Cursor 프로젝트 규칙, 네이티브 경로 규칙 및 로컬 플러그인 |
| `gemini` | `GEMINI.md`; 글로벌: `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` | Antigravity의 Gemini 호환 표면을 포함한 Gemini CLI 컨텍스트 |
| `cline` | `.clinerules` | Cline 스타일 워크스페이스 규칙 |
| `windsurf` | `.windsurf/rules/engram.md`; 글로벌: `~/.codeium/windsurf/memories/global_rules.md` | Windsurf 워크스페이스 규칙 및 글로벌 규칙/MCP |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` | OpenCode 규칙, Agent Skill, MCP 도구, 커스텀 명령어, 플러그인 훅 |
| `mcp` | `.mcp.json`; 글로벌: `~/.gemini/settings.json`, `~/.codex/config.toml`, 그리고 `claude mcp add` 힌트 | MCP 스타일 JSON-lines 래퍼 등록 |
| `slash` | `.claude/commands/engram.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` | 네이티브 `/engram` 슬래시 어댑터 |

별칭: `codex`는 `agents-md` 어댑터와 일반 Agent Skill 파일을 함께 설치하고, `open-code`는 `opencode`로 매핑되며, `cascade`는 `windsurf`로 매핑됩니다. 이전의 `antigravity` 및 `antigravity-cli` 대상은 현재 숨겨진 호환성 별칭입니다.

## 훅 지원 매트릭스 {#hook-capability-matrix}

| 호스트 | v1 훅 설치 | 이벤트 |
| --- | --- | --- |
| `codex` | 예 | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PreCompact`, `SubagentStart` (옵트인 `SessionEnd`) |
| `claude` | 예 | `SessionStart`, `UserPromptSubmit`, `InstructionsLoaded` (`hooks.path_rules hook` 사용 시 `PreToolUse`), `PreCompact`, `SubagentStart` (옵트인 `SessionEnd`) |
| `gemini` | 예 | `SessionStart`, `BeforeAgent`, `AfterTool`, `PreCompress` |
| `cursor` | 예 | `sessionStart` |
| `windsurf` / `cascade` | 예 | `pre_user_prompt` |
| `opencode` | 로컬 플러그인을 통해 지원됨 | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | 건너뜀 | 해당 없음 |
| `cline` | 건너뜀 | 해당 없음 |

## 다음 단계 {#next-steps}

- [Codex](codex.md)
- [Claude](claude.md)
- [Gemini](gemini.md)
- [Cursor](cursor.md)
- [Windsurf / Cascade](windsurf.md)
- [OpenCode](opencode.md)
- [Copilot](copilot.md)
- [Cline](cline.md)
- [슬래시 어댑터](slash.md)
- [MCP 도구](mcp.md)
- [훅 및 증명 라인](hooks.md)
