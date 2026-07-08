---
title: Connections 탭
sidebar_position: 3
description: Entry Web UI에서 지원되는 AI 에이전트를 감지하고 연결합니다.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Connections 탭

Connections 탭은 지원되는 AI 에이전트 인터페이스를 탐지하고 워크스페이스 또는 글로벌 수준에서 Engram을 연결할 수 있도록 지원합니다.

## 에이전트 스캔 (Agent scan)

이 탭에서는 지원되는 에이전트당 하나의 카드를 보여줍니다. 각 카드는 감지됨(detected) 또는 누락됨(missing) 상태를 표시합니다.

- **Detected** — Engram이 지원되는 로컬 에이전트 인터페이스(설정 경로 또는 앱 존재)를 찾았습니다.
- **Missing** — Engram이 에이전트 인터페이스를 찾지 못했습니다. 누락되었다고 해서 항상 지원되지 않음을 의미하지는 않으며, 앱이나 설정 경로가 아직 준비되지 않았음을 의미할 수 있습니다.

<RiskCallout level="caution">
누락됨이 항상 지원되지 않음을 의미하는 것은 아닙니다. 이 머신에 아직 앱이나 설정 경로가 없음을 의미할 수 있습니다.
</RiskCallout>

## 워크스페이스 연결 토글 (Workspace link toggle)

해당 에이전트의 현재 저장소/워크스페이스에 Engram을 연결합니다. 프로젝트별 규칙, 저장소 전용 메모리, 팀 공유 지침 등 메모리가 저장소를 따라가야 할 때 사용합니다.

## 글로벌 연결 토글 (Global link toggle)

해당 에이전트에 대해 글로벌하게 Engram을 연결합니다. 개인 메모리, 프로젝트 간 워크플로우, 재사용 가능한 스타일/규칙에 사용합니다.

<RiskCallout level="risky">
공유 컴퓨터에서 글로벌 연결을 사용할 때는 주의하십시오. Engram은 공유 지침 파일에 관리되는 블록을 작성합니다. 글로벌하게 연결하기 전에 에이전트별로 Engram이 어떤 파일을 쓰는지 검토하십시오.
</RiskCallout>

## 에이전트별로 Engram이 쓰는 파일

| 대상 | 파일 |
| --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` |
| `agents-md` | `AGENTS.md` |
| `copilot` | `.github/copilot-instructions.md`; 글로벌: `~/.copilot/copilot-instructions.md` |
| `claude` | `CLAUDE.md` |
| `cursor` | `.cursor/rules/engram.mdc`; 글로벌: `~/.cursor/plugins/local/engram/` |
| `gemini` | `GEMINI.md`; 글로벌: `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` |
| `cline` | `.clinerules` |
| `windsurf` | `.windsurf/rules/engram.md`; 글로벌: `~/.codeium/windsurf/memories/global_rules.md` |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` |
| `mcp` | `.mcp.json`; 글로벌: 호스트 MCP 설정 파일 |
| `slash` | `.claude/commands/engram.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` |

## 연결을 해제할 때

- 저장소 또는 테스트 워크스페이스 아카이빙
- 에이전트를 Engram에서 다른 곳으로 전환
- 새로운 `engram upgrade --latest`를 진행하기 전에 기존 관리 블록 정리

`engram unlink`는 Engram이 관리하는 훅 항목 및 어댑터 파일만 제거합니다. `--force`가 명시되지 않는 한 사람이 직접 작성한 파일은 보존됩니다.

## CLI 동등 명령

```bash
engram link codex
engram link claude
engram link --global opencode
engram unlink
```

## 다음 단계

- [Construct 탭](construct.md)
- [에이전트 통합 개요](../integrations/overview.md)
