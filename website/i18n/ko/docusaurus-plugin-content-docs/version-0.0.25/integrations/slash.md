---
title: 슬래시 어댑터
sidebar_position: 10
description: Engram 슬래시 어댑터는 Claude, Cursor, Gemini 및 OpenCode에 걸쳐 /engram 명령어를 노출합니다.
---

# 슬래시 어댑터

`slash` 대상은 프로젝트 슬래시 명령어 또는 Agent Skills를 지원하는 호스트용 네이티브 `/engram` 슬래시 어댑터를 작성합니다.

## 작성된 파일

| 파일 | 호스트 |
| --- | --- |
| `.claude/commands/engram.md` | Claude Code |
| `.claude/skills/engram/SKILL.md` | Claude Code (스킬 형태) |
| `.cursor/commands/engram.md` | Cursor |
| `.gemini/commands/engram.toml` | Gemini CLI |
| `.opencode/commands/engram.md` | OpenCode |

## 공통 명령어

```text
/engram
/engram propose
/engram load deployment workflow
/engram entry
/engram save knowledge
/engram save-session
/engram save-session --query-level 3
/engram ss
/engram ss -a
/engram ss -a last 50 sessions
/engram take-control
/engram take control accept all
/engram restructure workspace memory accept all
/engram resolve conflicts and metacognize
/engram graph release workflow
/engram archive --reason "Superseded" knowledge/old-fact.md
/engram set-rule-variant strict
/engram verify
```

## 동작

호스트가 가시적인 하나의 `/engram` 명령어만 노출하는 경우, 매개변수가 없는 `/engram`은 CLI를 실행하는 대신 `load`, `search`, `save`, `propose`, `entry` 및 `help`가 포함된 컴팩트 메뉴를 반환해야 합니다. `/engram propose`는 슬래시 수준의 별칭입니다. 현재 채팅/세션에 대한 `engram save-session`으로 정규화합니다.

`/engram ss -a`는 모두 허용 단축키입니다. 에이전트는 사람이 요청하지 않는 한 `--accept-all`을 추가해서는 안 됩니다.

## 자연어 정규화

| 자연어 표현 | 정규화 형태 |
| --- | --- |
| `/engram auto save` | `engram save-session` |
| `/engram take control accept all` | `engram take-control --accept-all` |
| `/engram restructure workspace memory accept all` | `engram metacognize --workspace --accept-all` |
| `/engram take control accept all metacognize` | `engram take-control --accept-all --metacognize` |
| `/engram resolve conflicts and metacognize` | `engram resolve-conflicts --metacognize` |
| `/engram ss -a last 50 sessions` | `engram save-session --query-level 50 --accept-all` |

## 다음 단계

- [MCP 도구](mcp.md)
- [훅 및 검증 라인](hooks.md)
