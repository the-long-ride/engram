---
title: 작업 공간 메모리 vs 글로벌 메모리
sidebar_position: 3
description: 작업 공간 메모리가 우선합니다. 글로벌 메모리는 프로젝트 간에 재사용 가능한 선호도 및 팀 컨텍스트를 위한 폴백입니다.
---

# 작업 공간 메모리 vs 글로벌 메모리

Engram은 두 가지 범위(scope)에서 메모리를 확인합니다.

## 작업 공간 메모리 (Workspace memory)

작업 공간 메모리는 다음 위치에 있습니다.

```text
<project>/.agents/.engram/
```

이 메모리에는 프로젝트에 특화된 규칙, 결정 및 워크플로가 보관됩니다. 작업 공간 메모리는 글로벌 중복 항목보다 우선합니다.

## 글로벌 메모리 (Global memory)

글로벌 메모리는 선택 사항이며 사용자가 설정한 위치에 저장됩니다. 여기에는 여러 리포지토리를 이동할 때도 유지되어야 하는 선호도와 팀 컨텍스트가 보관됩니다.

```bash
engram inject --global-only --global-path ~/Documents/engram
```

글로벌 메모리는 재사용 가능한 선호도, 개인적 습관 또는 팀 전체의 기본 설정을 위한 폴백입니다.

## 범위 우선순위

1. 작업 공간 메모리: `<project>/.agents/.engram/`
2. 글로벌 메모리: `$ENGRAM_GLOBAL_DIR` 또는 `engram inject --global-path <path>`

작업 공간 메모리가 우선합니다. 글로벌 메모리는 프로젝트 간에 재사용 가능한 선호도 및 팀 컨텍스트를 위한 폴백입니다.

## 저장 대상 선택

`set-save-target`을 사용하여 일반 저장 작업의 대상을 선택합니다.

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

글로벌 메모리가 설정되어 있는 경우, 새로 작업 공간을 설치하면 일반 저장은 기본적으로 작업 공간과 글로벌 메모리 모두에 수행됩니다. 에이전트는 `--scope workspace|global|both`를 사용하여 일회성으로 쓰기 위치를 재정의할 수 있습니다.

활성화된 설정 범위가 `global`로 설정된 경우(`scope: "global"`), 실행 중인 폴더에 파일이 작성되는 것을 방지하기 위해 작업 공간 레벨의 스킬셋 연결이 비활성화되고 건너뛰어집니다. 글로벌 범위 설정에서 에이전트를 연결하려면 `engram link --global`을 사용하십시오.

## 다음 단계

- [프로필 및 범위 확인](profiles.md)
- [읽기 경로 및 라우팅](read-path.md)
