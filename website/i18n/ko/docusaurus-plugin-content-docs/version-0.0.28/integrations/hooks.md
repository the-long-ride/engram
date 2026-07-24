---
title: 훅 및 검증 라인
sidebar_position: 12
description: Engram 에이전트 훅은 세션 시작 및 프롬프트 턴에서 라우팅된 메모리를 주입합니다. 검증 라인은 주입을 시각적으로 보여줍니다.
---

# 훅 및 검증 라인

에이전트 훅은 호스트가 안전한 프롬프트 시점 컨텍스트 채널을 노출할 때 세션 시작 및 이후 작업 변경 턴에서 라우팅된 Engram 컨텍스트를 주입하는 옵트인 호스트 훅입니다.

## 훅 설치

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

사용자 수준 구성에는 `--global`을 사용하고 Engram 관리 훅 항목만 제거하려면 `engram unlink`를 사용합니다.

## 읽기 모드

`engram set-read startup|auto|always|manual|off`는 런타임 동작을 제어합니다.

- `auto`는 세션 시작 시 로드하고 라우팅된 Engram 컨텍스트가 변경될 때만 다시 주입합니다.
- `startup`은 세션 시작 시에만 로드합니다.
- `always`는 적격한 모든 턴에 다시 주입합니다.
- `manual` 및 `off`는 자동화를 줄입니다.

훅 캐시는 해시, 세션 ID, 호스트, cwd 및 라우팅된 서명만 저장하며 원시 프롬프트 텍스트는 저장하지 않습니다.

## 검증 모드

`engram set-proof off|compact`는 지원되는 훅이 적격한 각 턴에 컴팩트한 `Engram proof:` 라인을 추가할지 여부를 제어합니다. 검증 가시성은 `set-read`와 별개입니다. `compact`는 전체 Engram 메모리가 주입되는 시점을 변경하지 않고 로드됨, 재사용됨 또는 건너뛴 턴을 보고할 수 있습니다.

## 훅 기능 매트릭스

| 호스트 | 구성 경로 | 이벤트 |
| --- | --- | --- |
| `codex` | `.codex/hooks.json`; global `~/.codex/hooks.json` | `SessionStart`, `UserPromptSubmit` |
| `claude` | `.claude/settings.json`; global `~/.claude/settings.json` | `SessionStart`, `UserPromptSubmit` |
| `gemini` | `.gemini/settings.json`; global `~/.gemini/settings.json` | `SessionStart`, `BeforeAgent` |
| `cursor` | `.cursor/hooks.json`; 글로벌 플러그인 `hooks/hooks.json` | `sessionStart` |
| `windsurf` / `cascade` | `.windsurf/hooks.json`; global `~/.codeium/windsurf/hooks.json` | `pre_user_prompt` |
| `opencode` | `~/.config/opencode/plugins/engram.js` | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | 작성되지 않음 | N/A |
| `cline` | 작성되지 않음 | N/A |

## 다음 단계

- [에이전트 통합 개요](overview.md)
- [CLI: 주입 / 연결 / 업그레이드](../cli/inject-link-upgrade.md)
