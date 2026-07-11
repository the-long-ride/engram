---
title: 일일 워크플로우
sidebar_position: 4
description: Engram 일일 루프 — 로드, 작업, 검색, 저장 및 메모리 건강 유지.
---

# 일일 워크플로우

Engram 일일 루프는 의도적으로 간단하게 디자인되었습니다: 시작할 때 메모리를 로드하고, 필요할 때 검색하고, 내구성이 있는 것이 나타나면 저장하고, 마지막에 검사합니다.

## 세션 시작

```text
/engram load "현재 작업"
```

또는 터미널에서 실행:

```bash
engram load "<작업>"
```

에이전트는 인간이 ID, 규칙 또는 원시 출력을 요청하지 않는 한 `Engram loaded: 8 memories / 24 total related memories.`와 같이 요약된 개수 라인으로 응답해야 합니다.

## 작업 중

작업이 변경되거나 프로젝트 지식이 부족하다고 의심되는 경우 검색합니다:

```text
/engram search "누락되었을 수 있는 주제"
```

콘텐츠를 인쇄하지 않고 어떤 메모리 파일이 라우팅되는지 미리 봅니다:

```bash
engram load --dry-run "<쿼리>"
```

요약 제한 대신 표시되는 모든 라우팅 일치를 반환합니다:

```bash
engram load --all "<쿼리>"
```

## 내구성 있는 사실 하나 저장

```text
/engram save knowledge
```

`engram save`는 가장 적합한 단일 메모리 후보를 캡처하고, 일치하는 메모리를 자동으로 업데이트하거나 새 메모리를 생성하며, 쓰기 전에 항상 A/B/C 승인 게이트를 표시합니다.

## 세션에서 여러 메모리 저장

```text
/engram save-session
/engram ss
```

다음과 같은 형태로 후보를 제공합니다:

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...`는 선택 사항입니다. 메모리가 존재하는 이유를 설명하는 경우에만 추가합니다.

## 최근 대화 분석

```text
/engram save-session --query-level 3
/engram ss -f last 50 sessions
```

`--query-level`은 양의 정수여야 합니다. 에이전트는 현재 세션을 포함하여 액세스 가능한 최근 인간-에이전트 대화 세션을 최대 해당 개수까지 사용할 수 있으며, 사용할 수 없는 기록을 꾸며내서는 안 됩니다.

## 모두 수락 바로 가기

```text
/engram ss -f
```

`-f`는 인간이 에이전트가 추천한 모든 후보를 명시적으로 승인함을 의미합니다. 에이전트는 인간이 요청하지 않는 한 `--force`을 추가해서는 안 됩니다.

모두 수락 실행이 쓰기 전에 관련 메모리를 보고하는 경우, 아직 파일이 저장되지 않은 것입니다. 에이전트는 구조화된 후보를 사용하여 다시 실행해야 합니다:

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## 역할 라우팅 (Role routing)

역할별 메모리 저장:

```bash
engram save --role frontend ...
engram save-session --role backend ...
```

역할 라우팅 조정:

```bash
engram set-role frontend
engram set-role backend security
engram set-role
```

`engram set-role ...` 또는 `engram set-rule-variant ...`가 성공하면 CLI는 `Agent action:` 라인을 반환합니다. Engram을 인식하는 슬래시 어댑터와 MCP 호스트는 즉시 `engram load "<현재 작업/요청>"`을 다시 실행하고 해당 결과를 이전에 로드된 Engram 컨텍스트를 대체하는 것으로 처리해야 합니다.

## 의미 있는 작업 종료

```text
Check Engram health, report invalid memories, and propose anything worth saving from this session.
```

유용한 명령:

```bash
engram upgrade
engram verify
engram repair
engram graph "<주제>"
engram quality-check
engram archive --reason "<이유>" <id-또는-파일>
```

## 다음 단계

- [CLI 참조](cli/overview.md)
- [작업 문제 해결](operations/troubleshooting.md)
- [Entry Web UI](entry/index.md)

