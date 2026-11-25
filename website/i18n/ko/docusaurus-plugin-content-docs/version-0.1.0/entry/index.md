---
title: Entry Web UI 개요
sidebar_position: 1
description: Entry Web UI는 Engram 메모리, 프로필, 워크스페이스 및 에이전트 연결을 구성하기 위한 로컬 전용 제어판입니다.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Entry Web UI 개요

Entry Web UI는 Engram을 위한 로컬 전용 제어판입니다. 이 도구를 사용하여 메모리 루트를 정의하고, AI 에이전트를 연결하며, 라우팅을 미세 조정하고, 중복 메모리를 검토하며, 메모리 그래프를 분석하고, JSON 파일을 직접 편집하지 않고도 실행 설정을 디버깅할 수 있습니다.

## 사용 시점

- 워크스페이스 또는 글로벌 메모리 루트를 최초로 설정할 때
- CLI 플래그를 외우지 않고 간편하게 AI 에이전트 연결을 맺거나 끊을 때
- 라우팅, 그래프, 벡터 검색 및 규칙 변형 설정을 미세 조정할 때
- 중복되거나 충돌하는 메모리를 검토할 때
- 메모리 관계 그래프를 시각적으로 검토할 때
- 적용된 최종 설정, 경로 및 Git 연동 감지 상태를 디버깅할 때

## 로컬 전용 액세스 모델 (Local-only)

이 제어판은 사용자의 PC 내부에서 동작하며 클라우드 서비스가 아닙니다. 보안 강화를 위해 구성 작업을 마친 후에는 서버를 종료하십시오.

<RiskCallout level="risky">
Entry 제어판은 로컬 단독으로 실행됩니다. 메모리를 조작하는 동안에만 열어두고, 사용을 마치면 사이드바 하단에서 서버를 종료할 것을 권장합니다.
</RiskCallout>

## CLI 명령어와의 관계

UI에 표시되는 모든 컨트롤은 CLI 명령어 또는 설정 파일 키에 1:1로 대응됩니다. 해당하는 CLI 명령어는 필드 참조 가이드에 안내되어 있습니다. 자동화 및 스크립팅의 기준이 되는 것은 항상 CLI 환경입니다.

## 탐색 및 URL 라우팅

Entry Web UI는 각 탭을 북마크하거나 새로 고치고 브라우저 기록으로 이동할 수 있도록 URL `#hash` 라우팅을 사용합니다.

- `#config` — Construct
- `#author` — Git
- `#upgrade` — Updates
- `#recall` — Memories
- `#review` — Review
- `#maintain` — Core
- `#connect` — Connections

사이드바에는 워크스페이스 범위 컨트롤을 위한 **Workspace** 섹션이 있으며, 검토 결과, 보류된 후보 또는 영수증이 트리아지를 기다릴 때 **Review**에 대기 중 검토 개수 배지가 표시됩니다. 좁은 뷰포트에서는 사이드바가 모바일 드로어로 접히며 닫기 버튼이나 `Escape` 키로 닫을 수 있습니다.

## 각 탭 요약

| 탭 | 해시 | 역할 |
| --- | --- | --- |
| [Construct](construct.md) | `#config` | Engram 런타임 필드, 프로필, 워크스페이스 및 런타임 상태 구성 |
| [Git](../operations/git-author-settings.md) | `#author` | 작성자 신원 및 Global Git 구성 관리 |
| [Updates](../operations/configuration-upgrades.md) | `#upgrade` | 패키지 업데이트 확인 및 설정 업그레이드 적용 |
| [Memories](memories.md) | `#recall` | 활성 메모리 검색, 라우트 시뮬레이션, 검사, 승격 및 아카이브 |
| [Review](review.md) | `#review` | 세션 학습 영수증, 검토 결과 및 보류된 메모리 쓰기 트리아지 |
| [Core](core.md) | `#maintain` | 중복되거나 서로 충돌하는 메모리 검토 |
| [Connections](connections.md) | `#connect` | Doctor 상태 확인, 에이전트 감지 및 지원되는 AI 에이전트 연결 |

## 다음 단계

- [제어판 실행](launch.md)
- [Construct 탭](construct.md)
- [Core 탭](core.md)
- [전체 필드 참조](field-reference.md)


## Git 작성자 정보 {#git-author-identity}

Engram은 글로벌 작성자와 선택적인 워크스페이스 재정의를 저장할 수 있습니다. 확인 순서는 워크스페이스, 글로벌, 그다음 읽기 전용 Git 대체값입니다. 설정은 앞으로 작성되는 메모리에만 적용되며, 워크스페이스 재정의는 글로벌 Git 설정을 바꾸지 않습니다. 글로벌 Git 동기화나 기존 메모리 마이그레이션에는 명시적인 계획 확인과 승인 절차를 사용하세요.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

전체 내용은 [Git 작성자 설정 가이드](../operations/git-author-settings.md)
