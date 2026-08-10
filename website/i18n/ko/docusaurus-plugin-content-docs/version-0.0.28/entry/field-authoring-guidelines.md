---
title: 필드 작성 가이드라인
sidebar_position: 11
description: 새로운 Entry UI 필드를 문서화하는 유지관리자를 위한 규칙.
---

# 필드 작성 가이드라인

새로운 Entry UI 필드를 문서화하는 유지관리자를 위한 규칙.

## 필드를 추가할 때

1. `src/core/web/config-schema.ts`의 `CONFIG_FIELDS`에 간단한 설명(`description`), 옵션(`options`), 최소/최대/조정단위(`min`/`max`/`step`), 그리고 위험도(`risk`)와 함께 필드를 추가합니다.
2. `website/src/data/entryFields.ts`에 최소한 `shortDescription`, `useCases`, `guidelines`를 포함한 문서 항목을 작성합니다.
3. [Construct 탭](construct.md) 페이지와 [전체 필드 참조](field-reference.md)에 해당 필드를 문서화합니다.
4. 필드 문서 적용 범위(커버리지) 검사를 실행합니다:

   ```bash
   npm --prefix website run check:entry-fields
   ```

5. 필드가 위험한(risky) 설정인 경우 복구/문제 해결 노트를 최소 한 개 이상 추가합니다.

## 필드당 필수 문서 항목

| 항목 | 필수 여부 |
| --- | --- |
| 일반 사용자 대상 쉬운 설명 | 예 |
| 사용 사례 | 예 (1개 이상) |
| 권장 기본값 | 예 |
| 허용되는 값 / 범위 | 예 |
| 위험도 수준 | 예 |
| 부작용 | 관련이 있을 때 작성 |
| CLI 동등 명령 | 관련이 있을 때 작성 |
| 값의 예시 | 텍스트/경로 필드에 필수 |
| 문제 해결 노트 | 위험도가 있는 필드에 필수 |

## 작성 규칙

- 소스 코드를 읽는 개발자나 유지관리자가 아닌, AI 에이전트 메모리 시스템을 구성하는 최종 사용자를 위해 작성하십시오.
- 메모리 소유권, 라우팅, 컨텍스트 크기, 개인정보 보호, Git 동동기화 등에 대한 실제 영향도를 명시하십시오.
- Engram 워크플로우에 맞는 예시를 선호합니다: Codex, Claude, Gemini, Cursor, OpenCode, 개인 메모리, 클라이언트 프로필, 팀 저장소 등.
- 기본값으로 높은 한도를 설정하도록 권장하지 마십시오. 컨텍스트 과부하로 인한 성능 저하를 설명하십시오.
- Engram 비활성화, 저장 위치 변경, Git 동기화 변경, 메모리 아카이빙, 암호화/보안에 영향을 줄 수 있는 설정은 위험(risky)으로 표시하십시오.
- 위험한 설정에 대해서는 복구 명령어를 제공하십시오.
- 앱 내 설명은 짧게 유지하고, 자세한 가이드는 Docusaurus에 작성하십시오.

## CI 검사 항목

`website/scripts/check-entry-field-docs.mjs` 검사는 다음의 경우 실패합니다:

1. 노출된 `CONFIG_FIELDS` 키에 대한 문서 항목이 없을 때.
2. 문서 항목이 존재하지만 실제 `CONFIG_FIELDS`에는 더 이상 없는 필드를 참조할 때.
3. 필드 문서에 `shortDescription`, `useCases`, 또는 `guidelines`가 누락되었을 때.
4. 위험한 필드에 문제 해결 노트가 한 개도 작성되지 않았을 때.
5. 숫자 필드가 렌더링된 문서에서 허용 범위를 누락했을 때.

## 다음 단계

- [전체 필드 참조](field-reference.md)
- [Construct 탭](construct.md)
