---
title: 프로필 및 범위 확인
sidebar_position: 4
description: 프로필은 회사, 팀 및 개인 컨텍스트에 대한 글로벌 메모리 루트를 격리합니다.
---

# 프로필 및 범위 확인

프로필은 회사, 팀 및 개인 컨텍스트에 대한 글로벌 메모리 루트(global memory roots)를 격리합니다. 이를 통해 고객, 회사 및 개인 메모리가 경계를 넘어 유출되는 것을 방지합니다.

## 프로필 생성 및 전환

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

## 확인 순서

프로필 확인 순서는 다음과 같습니다.

1. 명시적인 `--profile` 또는 `ENGRAM_PROFILE`
2. 작업 공간의 `default_profile`
3. 활성 사용자 프로필

작업 공간 `W`가 프로필 `B`로 고정되어 있고 사용자 기본 프로필이 `A`로 유지되는 경우, `W`에 대한 모든 일반 로드, MCP 로드 및 에이전트 훅 주입은 프로필 `B` 글로벌 메모리를 읽으며 프로필 `A`는 절대 읽지 않습니다. 작업 공간 기본값과 다른 명시적 프로필을 사용하면 해당 프로필의 글로벌 메모리를 사용하고 해당 명령에 대한 작업 공간 메모리를 비활성화합니다.

## 프로필 사용 시기

- 고객 리포지토리에 절대 도달해서는 안 되는 개인 메모리
- 개인 리포지토리에 절대 도달해서는 안 되는 회사 메모리
- 여러 프로젝트를 수행하는 컨설턴트를 위한 고객 격리 메모리
- 개별 실험으로 유출되어서는 안 되는 팀 공유 메모리

## SQLite 설정 DB 폴백

Engram의 SQLite 설정 DB는 작업 공간/프로필 관리를 위한 최적화 레이어입니다. DB를 열거나 초기화할 수 없는 경우, 일반 읽기/쓰기 명령은 JSON 설정 스냅샷으로 폴백됩니다. DB 전용 명령은 일반 메모리 사용을 차단하는 대신 SQLite를 사용할 수 없음으로 보고합니다.

## 다음 단계

- [작업 공간 메모리 vs 글로벌 메모리](scopes.md)
- [쓰기 경로 및 승인](write-path.md)
