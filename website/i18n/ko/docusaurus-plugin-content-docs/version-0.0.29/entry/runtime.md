---
title: Runtime 탭 (런타임 정보)
sidebar_position: 9
description: 읽기 전용으로 분석된 설정 및 경로와 서버 닫기 작업을 제공합니다.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Runtime 탭

Runtime 탭은 런타임 엔진이 해석(Resolve) 완료한 최종 설정 정보와 실제 물리 파일 경로 정보를 읽기 전용 보고서로 제공합니다. 트러블슈팅 발생 시 첫 번째 단계로 이 리포트를 검증하십시오.

## 주요 리포트 속성 분류

최종 매핑 결과는 다음과 같이 분류 표시됩니다:

- **Profile** — 현재 선택 작동 중인 프로필 속성과 해당 주입 출처 정보
- **Memory roots** — 워크스페이스용 로컬 경로 및 글로벌 공용 경로
- **Core config** — 활성화 여부, 적용 대상 범위, 주입 모드, 감사 꼬리표 작동 상태, 주입 역할 정보
- **Routing** — 컨텍스트 한계 개수, 그래프 조건, 로컬 벡터 엔진 작동 상태
- **Graph** — 연결성 필터, 최대 엣지 연동 개수, 임계 점수 조건
- **Git detection** — 연동 감지된 원격 주소, 브랜치 명세, 자동 동기화 활성 상태

단순 텍스트 설정 값을 넘어 실제로 시스템 엔진이 바인딩하여 계산된 결과물입니다. 연동이 불안정하거나 원인을 모를 때 이 최종 결괏값 보고서를 대조 점검하십시오.

## 서버 종료 (Close server)

작동 중인 웹 서버를 즉시 완전히 종료합니다. 구성 설정 조작이 완료된 이후에는 보안 조치 차원에서 수동 종료할 것을 권장합니다.

<RiskCallout level="risky">
기동된 Entry 서버는 사용자의 PC 내부 단독 전용입니다. 설정을 모두 적용하였다면 타인이나 외부 웹페이지 접근 가능성을 예방하기 위해 종료해 두십시오.
</RiskCallout>

## CLI 동등 명령

```bash
engram config view
engram entry
```

## 다음 단계

- [전체 필드 참조](field-reference.md)
- [트러블슈팅 해설서](../operations/troubleshooting.md)
