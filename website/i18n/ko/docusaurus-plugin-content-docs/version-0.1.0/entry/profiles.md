---
title: Profiles 탭 (프로필)
sidebar_position: 5
description: Entry Web UI에서 분리된 글로벌 메모리 프로필을 관리합니다.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Profiles 탭

Profiles 탭은 격리 관리되는 글로벌 메모리 프로필을 지원합니다. 이 프로필 격리를 통해 서로 다른 회사, 고객사, 또는 개인 메모리 경계 사이로 정보가 부적절하게 오염되거나 섞이는 사고를 미연에 방지할 수 있습니다.

## 프로필 식별 이름 (Profile name)

`personal`, `client-a`, `team-platform` 등과 같은 컨텍스트 식별자 이름입니다. 영문자, 숫자, 마침표(`.`), 밑줄(`_`), 대시(`-`)를 조합할 수 있으며 공백이나 중요 기밀 식별자 이름은 피해야 합니다. `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$` 규칙을 따라야 합니다.

## 글로벌 물리적 경로 (Global path)

해당 프로필이 저장되는 로컬 디렉토리 경로입니다. 유실 위험이 높은 시스템 임시 공간이 아닌 영구 디렉토리 경로로 설정하고 쓰기 권한이 허용되는지 사전 검토하십시오.

## 프로필 활성화 (Activate)

지정한 프로필을 현재 사용자 범위의 기본값으로 동작하도록 지정합니다. 개인 메모리에서 클라이언트 관련 프로필로 활성 환경을 교체할 때 향후 데이터 입출력에 즉시 반영됩니다.

<RiskCallout level="caution">
프로필을 활성화하면 새롭게 쓰이고 읽히는 글로벌 메모리의 원천 경로가 교체됩니다. 활성화 전에 바꿀 프로필 식별 이름을 반드시 재확인하십시오.
</RiskCallout>

## 프로필 삭제 (Delete)

시스템 등록 목록에서 지정한 프로필 메타데이터를 파기합니다. 이 기능은 프로필 자체의 등록 속성만 해제하므로 실제 디렉토리에 포함된 하드디스크 속 마크다운 데이터 유실 여부는 시스템 사양을 직접 대조 검토해야 합니다.

## CLI 동등 명령

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

## 다음 단계

- [프로필 및 범위 분석](../concepts/profiles.md)
- [Workspaces 탭](workspaces.md)
