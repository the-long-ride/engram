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
Entry 제어판은 로컬 단독으로 실행됩니다. 메모리를 조작하는 동안에만 열어두고, 사용을 마치면 Runtime 탭에서 즉시 서버를 종료할 것을 권장합니다.
</RiskCallout>

## CLI 명령어와의 관계

UI에 표시되는 모든 컨트롤은 CLI 명령어 또는 설정 파일 키에 1:1로 대응됩니다. 해당하는 CLI 명령어는 필드 참조 가이드에 안내되어 있습니다. 자동화 및 스크립팅의 기준이 되는 것은 항상 CLI 환경입니다.

## 각 탭 요약

| 탭 | 역할 |
| --- | --- |
| [Connections](connections.md) | 지원되는 AI 에이전트 감지 및 연결 |
| [Construct](construct.md) | 모든 Engram 런타임 설정 필드 구성 |
| [Profiles](profiles.md) | 격리된 글로벌 메모리 프로필 관리 |
| [Workspaces](workspaces.md) | 프로젝트 저장소 등록 및 연결 상태 관리 |
| [Core](core.md) | 중복되거나 서로 충돌하는 메모리 검토 |
| [Memories](memories.md) | 메모리 그래프 시각화 및 필요 없는 메모리 아카이빙 |
| [Runtime](runtime.md) | 최종 로드된 설정 정보 및 물리 경로 보고 (읽기 전용) |

## 다음 단계

- [제어판 실행](launch.md)
- [Construct 탭](construct.md)
- [전체 필드 참조](field-reference.md)
