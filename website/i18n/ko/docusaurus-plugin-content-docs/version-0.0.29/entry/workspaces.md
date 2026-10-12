---
title: Workspaces 탭 (워크스페이스)
sidebar_position: 6
description: Entry Web UI에서 프로젝트 저장소를 등록하고 연결 상태를 관리합니다.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Workspaces 탭

Workspaces 탭은 사용자의 소스 프로젝트 디렉토리 경로를 시스템에 연동 등록하고 개별적인 작동 훅 연동 상태를 관리할 수 있도록 돕습니다.

## 워크스페이스 식별 이름 (Workspace name)

지정한 저장소 디렉토리의 논리적 식별 이름입니다. 간결하고 한눈에 들어오는 알기 쉬운 이름으로 등록하십시오.

## 워크스페이스 물리적 경로 (Workspace path)

실제 PC 디스크 속 프로젝트 루트 디렉토리입니다. 존재하지 않거나 쓰기가 불가능한 윈도우/시스템 필수 디렉토리는 피해야 합니다.

## 연결 / 해제 (Link / Unlink)

생성되는 에이전트용 특수 안내 파일과 자동 주입 훅 기능을 해당 소스 저장소 공간에 연결할지 중단할지를 결정합니다. 활발히 개발 중인 저장소는 활성화하고, 완료된 보관 저장소는 해제하십시오.

<RiskCallout level="caution">
연결을 해제하면 에이전트 프롬프트 엔진 작동 시 해당 에이전트는 Engram 메모리 지침을 수신할 수 없습니다. 운영 중인 프로젝트의 해제 시 신중히 확인하십시오.
</RiskCallout>

## 등록 파기 (Delete)

등록 목록에서 워크스페이스 메타데이터를 삭제합니다. 이 제거 기능은 단지 등록 항목의 해제만 수행하는지, 로컬 파일 데이터도 함께 소거되는지는 사양 명세를 대조하여 신중히 확인해야 합니다. 감사(Audit) 관점에서는 단순 제거보다 연결 해제(Unlink)가 권장됩니다.

## CLI 동등 명령

```bash
engram inject
engram link codex
engram unlink
```

## 다음 단계

- [Profiles 탭](profiles.md)
- [Connections 탭](connections.md)
