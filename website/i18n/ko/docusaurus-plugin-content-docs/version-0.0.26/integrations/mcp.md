---
title: MCP 도구
sidebar_position: 11
description: Engram MCP 서버는 로드, 검색 및 제안 전용 도구를 MCP 지원 호스트에 노출합니다.
---

# MCP 도구

Engram은 MCP 지원 호스트에 도구를 노출하는 MCP 서버 바이너리 `engram-mcp`를 제공합니다.

## 등록

`engram link <target>`은 기본적으로 해당 대상에 대해 알려진 MCP 등록도 설치합니다.

| 범위 | 경로 |
| --- | --- |
| 워크스페이스 (대부분의 호스트) | `.mcp.json` |
| Cursor 워크스페이스 | `.cursor/mcp.json` |
| OpenCode 워크스페이스 | `opencode.json` / `opencode.jsonc` 의 `mcp` 필드 |
| 글로벌 Claude | `~/.claude/mcp.json` |
| 글로벌 Gemini / Antigravity | Gemini MCP 구성 파일 |
| 글로벌 OpenCode | `~/.config/opencode/opencode.jsonc` / `opencode.json` 의 `mcp` 필드 |
| 글로벌 Cursor | 로컬 플러그인에 번들됨 |
| 글로벌 Windsurf | `~/.codeium/windsurf/mcp_config.json` |

공식 문서에서 사용자 수준 MCP 구성만 다루고 있으므로 Windsurf 워크스페이스 MCP는 건너뜁니다.

## 도구

MCP 호스트는 `engram_save` 및 `engram_autosave`를 **제안 전용** 도구로 취급해야 합니다. 최종 작성은 사람이 볼 수 있는 CLI 승인 워크플로우를 통해 라우팅해야 합니다. `engram_load`는 기본적으로 `--full`로 설정됩니다(`full: true`를 통해 선택 해제 가능).

## 모두 허용 규칙

단축키 `/engram ss -f`를 포함한 명시적인 `/engram save-session --force` 요청은 MCP 자동 저장이 제안 전용으로 유지되므로 CLI 쓰기 경로를 사용해야 합니다. 카운트된 단축키 `/engram ss -f last 50 sessions`는 `engram save-session --query-level 50 --force`을 사용해야 합니다.

## OpenCode MCP 엔트리

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

MCP 서버는 표준 JSON-RPC 핸드셰이크(`initialize`, `notifications/initialized`, `tools/list` 및 `tools/call`)를 구현합니다.

## 다음 단계

- [에이전트 통합 개요](overview.md)
- [훅 및 검증 라인](hooks.md)

