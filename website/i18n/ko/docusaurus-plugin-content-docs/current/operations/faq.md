---
title: 자주 묻는 질문
sidebar_position: 4
description: Engram에 대한 자주 묻는 질문입니다.
---

# 자주 묻는 질문 (FAQ)

## Engram은 벡터 데이터베이스인가요?

아닙니다. 기본 Engram 검색은 결정론적 어휘 검색입니다. `engram search --semantic`은 임베딩 지원 의미 체계 검색이 아닌 결정론적 로컬 유사성을 추가합니다. 그래프 벡터는 의미 체계 임베딩이 아닌 로컬 해시 단어 벡터입니다. 선택적 로컬 sqlite-vec은 가속 레이어일 뿐이며 신뢰할 수 있는 단일 원천(source of truth)이 아닙니다.

## Engram은 메모리를 자동으로 작성하나요?

아닙니다. 에이전트가 후보를 제안하면 사람이 승인합니다. 직접 터미널 CLI는 A/B/C를 사용합니다. AI 에이전트 채팅은 `yes`/`audit`/`cancel`을 사용합니다. 명시적인 전체 승인 요청(`ss -a`)만 모든 후보를 저장하며, 에이전트는 사용자가 요청하지 않는 한 `--accept-all`을 추가해서는 안 됩니다.

## 메모리는 어디에 보관되나요?

- 작업 공간 메모리: `<project>/.agents/.engram/`
- 글로벌 메모리: 사용자가 구성한 곳 어디나 (구성 전에는 기본적으로 비어 있음)

작업 공간 메모리가 우선합니다. 글로벌 메모리는 재사용 가능한 설정 및 팀 컨텍스트를 위한 폴백입니다.

## 지원되는 에이전트는 무엇인가요?

Codex, Claude, Gemini(및 Antigravity Gemini 호환 표면), Cursor, Windsurf/Cascade, OpenCode, Copilot, Cline, 일반적인 AGENTS.md 호환 호스트, MCP 가능 호스트 및 슬래시 명령 호스트입니다. [에이전트 통합 개요](../integrations/overview.md)를 참조하십시오.

## 암호화가 구현되어 있나요?

암호화 설정이 존재하지만 암호화된 저장소는 아직 구현되지 않았습니다. 현재 한계를 명확하게 문서화하십시오.

## Git 없이 Engram을 사용할 수 있나요?

예. Git은 선택 사항이지만 감사 기록, 이식성 및 팀 검토를 위해 권장됩니다.

## 잘못된 메모리를 보관 처리(archive)하려면 어떻게 하나요?

```bash
engram archive --reason "<이유>" <id-또는-파일>
```

해당 파일은 승인 후에만 활성 라우팅에서 제외되며 `archive/` 아래에 보존됩니다. 감사 가능성을 위해 삭제 대신 보관 기능을 사용하십시오.

## 글로벌 메모리는 어떻게 이동하나요?

```bash
engram update-global-folder <새-경로>
engram ugf <새-경로>
engram move global folder from <기존-경로> to <새-경로>
```

사용자가 이전 글로벌 루트 전체를 새 위치로 이동하기를 원할 때 `--move-from-path <기존-경로>`를 추가하십시오.

## 다음 단계

- [문제 해결](troubleshooting.md)
- [비교 및 로드맵](../comparison/overview.md)
