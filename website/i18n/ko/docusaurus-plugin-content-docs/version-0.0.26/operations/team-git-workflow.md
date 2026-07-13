---
title: Git을 이용한 팀 워크플로
sidebar_position: 1
description: Git을 사용하여 머신 간에 Engram 메모리를 동기화하고 변경 이력을 확인합니다.
---

# Git을 이용한 팀 워크플로

Git은 여러 머신 간에 메모리를 동기화하고 검토 히스토리를 제공합니다. Engram은 Git 네이티브입니다. 메모리는 일반 Markdown 파일이므로 표준 Git 워크플로가 그대로 적용됩니다.

## 작업 공간 메모리를 서브모듈로 사용

사용자가 `.agents/.engram`을 별도의 리포지토리로 추적하기를 원하는 경우 다음을 수행합니다.

```bash
engram inject --submodule
engram inject --submodule-remote <git-url>
```

Engram은 URL을 검증하고 `main` 브랜치에 서브모듈을 초기화한 후 첫 서브모듈 커밋으로 `Initialize engram`을 생성합니다.

## 공유 글로벌 Git 원격 저장소

`engram entry` 명령을 실행했을 때 `global_git_detected.remote_url`이 나타나지 않으면, 사용자에게 Git을 통해 글로벌 메모리를 공유할 것인지 물어보십시오. 사용자가 URL을 제공하면 다음을 수행합니다.

```bash
engram inject --global-remote <git-url>
```

`global_git.*` 필드를 사용하여 동기화 동작을 설정합니다.

- `global_git.enabled` — 글로벌 메모리에 대한 Git 연동 활성화
- `global_git.remote` — 원격 저장소 이름 (기본값 `origin`)
- `global_git.remote_url` — 공유할 글로벌 메모리 원격 URL
- `global_git.branch` — 대상 브랜치 (기본값 `main`)
- `global_git.auto_sync` — 자동 pull/push 동작 여부
- `global_git.auto_resolve` — 자동 충돌 처리 여부

:::warning
자동 충돌 처리는 메모리 변경 사항(diff)을 덮어써서 가릴 수 있습니다. `global_git.auto_resolve` 기능을 신뢰하기 전에 메모리 변경 사항을 먼저 검토하십시오.
:::

## 검토 워크플로

1. 에이전트가 메모리 후보를 제안합니다.
2. 사용자가 A/B/C 게이트(터미널) 또는 `yes`/`audit`/`cancel`(채팅)을 통해 승인합니다.
3. Engram이 승인된 Markdown을 작성하고 해시, 인덱스, 그래프 및 변경 이력을 갱신합니다.
4. Git을 통해 메모리 변경 사항을 커밋하고 푸시합니다.
5. 팀원들이 변경 사항을 풀(pull)하고 `engram upgrade`를 실행하여 조정 작업을 처리합니다.

## 다음 단계

- [릴리스 및 업그레이드 프로세스](release-upgrade.md)
- [개념: 쓰기 경로 및 승인](../concepts/write-path.md)
