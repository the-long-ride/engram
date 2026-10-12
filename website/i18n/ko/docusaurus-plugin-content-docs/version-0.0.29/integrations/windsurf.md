---
title: Windsurf / Cascade
sidebar_position: 6
description: 규칙, MCP, 훅 및 글로벌 메모리를 통한 Engram과 Windsurf Cascade의 통합.
---

# Windsurf / Cascade

Windsurf는 `.windsurf/rules/*.md`에서 워크스페이스 규칙을 읽습니다. Engram은 `trigger: always_on` 프런트매터가 포함된 `.windsurf/rules/engram.md`를 작성합니다. `cascade`는 `windsurf`인 별칭입니다.

## 설치

```bash
engram link windsurf
```

워크스페이스 MCP는 공식 문서에서 사용자 수준 MCP 구성만 정의하고 있으므로 생성되지 않습니다. `engram link windsurf`는 이를 명시적으로 보고하고 MCP의 경우 `engram link --global windsurf`를 제안합니다.

## 작성된 파일

| 파일 | 목적 |
| --- | --- |
| `.windsurf/rules/engram.md` | 프로젝트 규칙과 `trigger: always_on` |
| `.windsurf/hooks.json` | Hook `pre_user_prompt` |

## 글로벌 설치

```bash
engram link --global windsurf
```

Engram은 `~/.codeium/windsurf/memories/global_rules.md`에 관리형 블록을 쓰고(사용자 텍스트 유지 및 문자 예산 내로 유지), MCP를 `~/.codeium/windsurf/mcp_config.json`에 병합하며, 훅을 `~/.codeium/windsurf/hooks.json`에 병합합니다.

## 훅 동작

`pre_user_prompt` 훅은 감사/프리로드/차단할 수 있지만 모델 컨텍스트를 직접 주입할 수는 없습니다. 규칙과 MCP가 신뢰할 수 있는 AI 컨텍스트 채널을 제공합니다.

## 다음 단계

- [에이전트 통합 개요](overview.md)
- [훅 및 검증 라인](hooks.md)
