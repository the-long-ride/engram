---
title: OpenCode
sidebar_position: 7
description: AGENTS.md, Agent Skills, MCP, 사용자 정의 명령어 및 로컬 플러그인을 통한 Engram과 OpenCode의 통합.
---

# OpenCode

OpenCode는 규칙을 위해 프로젝트 `AGENTS.md` 및 글로벌 `~/.config/opencode/AGENTS.md`를 읽습니다. Engram은 여기에 관리형 블록을 작성하고, `.opencode/engram.md` 또는 `~/.config/opencode/engram.md`에 전체 가이드를 작성하며, `.opencode/skills/engram/SKILL.md` 또는 `~/.config/opencode/skills/engram/SKILL.md`에 전체 스킬을 작성하고, MCP 등록을 위해 프로젝트 `opencode.json`(또는 기존 `opencode.jsonc`) 및 글로벌 `~/.config/opencode/opencode.jsonc`를 예약합니다.

## 설치

```bash
engram link opencode
```

## 작성된 파일

| 파일 | 목적 |
| --- | --- |
| `AGENTS.md` | 관리형 블록이 포함된 프로젝트 규칙 |
| `.opencode/engram.md` | 전체 가이드 |
| `.opencode/skills/engram/SKILL.md` | 에이전트 스킬 |
| `.opencode/commands/engram.md` | `/engram` 슬래시 어댑터 |
| `opencode.json` / `opencode.jsonc` | MCP 등록 (`mcp.engram`) |

## 글로벌 설치

```bash
engram link --global opencode
```

또한 `~/.config/opencode/plugins/engram.js`에 관리형 로컬 JavaScript 플러그인을 설치합니다. 플러그인은 `chat.message`를 사용하여 현재 사용자 프롬프트를 라우팅하고, `experimental.chat.system.transform`을 사용하여 각 LLM 요청 전에 라우팅된 메모리를 주입합니다.

:::warning
로컬 플러그인 파일은 시작할 때 로드되므로 `link`/`unlink` 후에는 OpenCode를 다시 시작하거나 다시 로드해야 합니다.
:::

## MCP 등록

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

MCP 서버는 OpenCode가 Engram 도구를 발견하고 호출할 수 있도록 표준 JSON-RPC 핸드셰이크(`initialize`, `notifications/initialized`, `tools/list` 및 `tools/call`)를 구현합니다.

## 플러그인 동작

플러그인은 안전장치가 열린 상태로 실패하고(fails open), 실행 중인 OpenCode 프로세스 내에서만 원시 라우팅된 메모리를 유지합니다. Engram의 디스크 훅 캐시는 해시, 세션 ID, 호스트, cwd 및 라우팅된 서명으로만 유지됩니다. `engram unlink --global opencode`는 Engram이 생성한 플러그인만 제거하며, 사람이 작성한 `engram.js`는 `--force`가 명시되지 않는 한 유지됩니다.

## 다음 단계

- [에이전트 통합 개요](overview.md)
- [MCP 도구](mcp.md)
- [훅 및 검증 라인](hooks.md)
