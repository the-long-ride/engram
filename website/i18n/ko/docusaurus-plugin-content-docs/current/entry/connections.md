---
title: Connections 탭
sidebar_position: 3
description: Entry Web UI에서 지원되는 AI 에이전트를 감지하고 연결합니다.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Connections 탭

Connections 탭은 컴퓨터에서 지원되는 AI 에이전트 환경을 스캔하고, 각 에이전트에 대해 워크스페이스 또는 글로벌 수준으로 Engram을 연결할 수 있게 해 줍니다.

## 에이전트 스캔 {#agent-scan}

이 탭에는 지원되는 에이전트마다 카드가 하나씩 표시됩니다. 각 카드는 감지됨 또는 누락됨 상태를 보여 줍니다.

- **Detected** — Engram이 지원되는 로컬 에이전트 환경(설정 경로 또는 앱)을 찾았습니다.
- **Missing** — Engram이 에이전트 환경을 찾지 못했습니다. 누락이 항상 미지원을 뜻하지는 않으며, 앱이나 설정 경로가 아직 없다는 의미일 수 있습니다.

<RiskCallout level="caution">
Missing은 항상 미지원을 뜻하지는 않습니다. 이 컴퓨터에 앱이나 설정 경로가 아직 없다는 의미일 수 있습니다.
</RiskCallout>

## 워크스페이스 연결 토글 {#workspace-link-toggle}

해당 에이전트에 대해 현재 저장소/워크스페이스에 Engram을 연결합니다. 프로젝트별 규칙, 저장소 전용 메모리, 팀이 공유하는 지침처럼 메모리가 저장소를 따라가야 할 때 사용하세요.

## 글로벌 연결 토글 {#global-link-toggle}

해당 에이전트에 대해 Engram을 글로벌로 연결합니다. 개인 메모리, 프로젝트 간 워크플로, 재사용 가능한 스타일/규칙에 사용하세요.

<RiskCallout level="risky">
공유 컴퓨터에서는 글로벌 연결을 신중하게 사용하세요. Engram은 공유 지침 파일에 관리되는 블록을 기록합니다. 글로벌로 연결하기 전에 에이전트별로 Engram이 어떤 파일을 기록하는지 검토하세요.
</RiskCallout>

## 에이전트별로 Engram이 기록하는 파일 {#what-files-engram-writes-per-agent}

| 대상 | 파일 |
| --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` |
| `agents-md` | `AGENTS.md` |
| `copilot` | `.github/copilot-instructions.md`; global: `~/.copilot/copilot-instructions.md` |
| `claude` | `AGENTS.md`, `.claude/engram.md`, `.agents/engram.md`, 그리고 해당 파일이 이미 있을 때만 `CLAUDE.md` 블록 |
| `cursor` | `.cursor/rules/engram.mdc`; global: `~/.cursor/plugins/local/engram/` |
| `gemini` | `GEMINI.md`; global: `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` |
| `cline` | `.clinerules` |
| `windsurf` | `.windsurf/rules/engram.md`; global: `~/.codeium/windsurf/memories/global_rules.md` |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` |
| `mcp` | `.mcp.json`; global: host MCP config files |
| `slash` | `.claude/commands/engram.md`, `.claude/skills/engram/SKILL.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` |

## 연결을 해제해야 할 때 {#when-to-unlink}

- 저장소나 테스트 워크스페이스를 아카이브할 때
- 에이전트에서 Engram 사용을 중단할 때
- 새로 `engram upgrade --latest`를 실행하기 전에 오래된 관리 블록을 정리할 때

`engram unlink`는 Engram이 관리하는 훅 항목과 어댑터 파일만 제거합니다. 사람이 작성한 파일은 `--force`를 명시하지 않는 한 보존됩니다.

## 동일한 CLI 명령 {#cli-equivalent}

```bash
engram link codex
engram link claude
engram link --global opencode
engram unlink
```

## 다음 단계 {#next-steps}

- [Construct 탭](construct.md)
- [에이전트 연동 개요](../integrations/overview.md)
