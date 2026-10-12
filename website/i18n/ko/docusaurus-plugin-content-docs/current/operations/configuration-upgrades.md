---
title: 설정 업그레이드
sidebar_position: 3
description: Engram이 관리하는 메모리와 연결된 에이전트 설정을 미리 보고, 검토하고, 안전하게 업그레이드합니다.
---

# 설정 업그레이드

Engram은 CLI와 Entry Web UI에 하나의 업그레이드 인벤토리 엔진을 사용합니다. 구성된 **workspace**와 **global** 범위를 스캔하고, Engram이 관리하는 아티팩트를 분류하고, 결정적인 계획을 만들며, 해시·핑거프린트를 사용해 오래된 상태에서의 쓰기를 방지합니다.

```bash
engram upgrade --latest --plan
engram upgrade --latest --review
engram upgrade --latest
engram upgrade --latest --yes
engram upgrade --help
```

`--plan`은 읽기 전용입니다. 사람이 읽을 수 있는 출력은 아티팩트 종류별로 Config, Instructions, Memories, Skillsets, Hooks, Plugins 순서로 묶여 표시됩니다. `--plan --json`은 동일하게 묶인 계획과 핑거프린트, 검토 상태, `pendingReviewCount`를 함께 노출합니다. UI 종류 탭은 `All`, `Config`, `Instructions`, `Memories`, `Skillsets`, `Hooks`, `Plugins` 레이블을 그대로 사용합니다.

## Engram이 감지하는 항목

인벤토리는 알려진 Engram 위치 또는 등록된 연결 에이전트 설치에 있는 `memory`, `instruction`, `skillset`, `config`, `hook`, `plugin` 아티팩트를 다룹니다. 워크스페이스와 글로벌 루트는 별도로 스캔되며, Engram은 임의의 홈 디렉터리 트리를 재귀적으로 탐색하지 않습니다.

Engram은 명시적인 스키마/버전 메타데이터와 등록된 설치 메타데이터를 우선 신뢰합니다. 마커가 없는 기존 파일은 알려진 관리 구조와 예상 내용으로 판단합니다. 각 항목은 `current`, `outdated`, `conflict`, `invalid` 중 하나로 분류됩니다.

## 유형별 교체 및 병합

충돌은 영구적으로 차단된다는 뜻이 아니라 **검토가 필요하다**는 뜻입니다. Engram은 사용자가 교체/병합 결정을 확인할 때까지 사용자의 편집 내용을 보존합니다.

- **Instructions:** Engram은 Engram 마커 밖의 사용자 텍스트를 보존하면서 최신 관리 블록을 제안합니다. Engram이 소유한 지침 파일 전체는 교체할 수 있습니다.
- **Skillsets:** Engram은 최신 Engram 관리 내용을 제안합니다. 사용자가 소유한다고 명시된 섹션은 형식이 지원하는 범위에서 보존됩니다.
- **Config:** Engram은 설정을 파싱하여 병합된 마이그레이션을 제안합니다. 알려진 Engram 키는 업그레이드하고, 필요한 경우 새 기본값을 추가하며, 관련 없는 사용자 키·값은 보존합니다.
- **Memories:** Engram은 템플릿 교체가 아니라 스키마 마이그레이션을 수행합니다.
- **Hooks/plugins:** 생성된 아티팩트는 소유권을 증명할 수 있을 때만 교체됩니다. 모호한 사용자 코드는 검토 전용으로 남으며 **Keep current**로 확정할 수 있습니다.

## Entry Web UI 충돌 검토

Updates 페이지는 이제 간결한 대시보드를 사용합니다. **상태 배너**는 설정이 최신인지, 업데이트가 필요한지, 충돌 검토가 필요한지를 알려 주고, **Workspace**, **Global**, **Conflicts** 요약 카드는 주요 개수를 한눈에 보여 줍니다. 미리 보기 후에는 조치가 필요한 모든 항목이 Artifact, Scope, Agent(s), Status, Review, Actions 열을 가진 하나의 **조치 필요 아티팩트 테이블**에 표시됩니다. 좁은 화면에서도 테이블 구조가 유지되며, 행마다 스크롤바를 두는 대신 하나의 공유 **가로 스크롤** 컨테이너를 사용합니다.

`engram entry`를 열고 **Settings → Updates**를 선택합니다. 사이드바의 **copy command** 동작은 페이지를 벗어나지 않고 `engram upgrade --latest --plan`을 복사합니다. 미리 보기에는 `All`과 조치가 필요한 종류 탭만 표시되며, 종류 탭은 `Config`, `Instructions`, `Memories`, `Skillsets`, `Hooks`, `Plugins`입니다.

모든 충돌에는 **Review** 동작이 있습니다. 모달은 **Current**, **Proposed**, **Diff** 보기를 제공합니다. **Current**는 읽기 전용입니다. **Proposed**는 교체 가능한 Config/Instruction/Skillset 항목에서 편집할 수 있으며 Engram의 유형별 병합/교체 결과에서 시작합니다. **Diff**는 기본적으로 **Inline**이며 **Parallel**로 전환할 수 있습니다. Inline은 삭제된 줄을 빨간 배경의 `-`로, 추가된 줄을 초록 배경의 `+`로 표시하고, Parallel은 **Current**와 **Proposed** 행을 나란히 정렬하며 동일한 빨강/초록 강조를 적용합니다. **Use latest**, **Reset proposed**, **Keep current**, 또는 Engram이 소유권을 증명할 수 있다면 **Force upgrade**를 선택한 뒤 **Confirm change**를 누르세요.

**Open in editor**는 서버가 확인한 정확한 현재 아티팩트를 `$VISUAL`, 그다음 `$EDITOR`, 그다음 플랫폼 기본 편집기 순서로 엽니다. 브라우저는 파일 시스템 경로를 제공하지 않습니다. **Instructions**의 **Proposed**에는 관리되는 `<!-- engram:start -->` 블록만 들어 있으며, 전체 글로벌 스킬셋은 동반 가이드인 `.agents/engram.md`에 남습니다. 외부 편집으로 파일이 변경되면 미리 보기/소스 해시(source hash)가 오래된 값이 되어 확인 전에 검토를 새로 고침해야 합니다.

선택 가능한 대기 중인 교체 가능 충돌에는 선택 체크박스가 있습니다. **Select all visible**은 현재 종류 탭의 선택 가능한 행을 모두 선택하며, 탭을 전환해도 선택은 유지됩니다. **Confirm selected changes**는 체크된 행에 **Use latest**를 적용하고, **Confirm all changes**는 전체 미리 보기에서 선택 가능한 모든 대기 중 충돌에 **Use latest**를 적용합니다. 교체할 수 없는 행, 오래된 행, 이미 검토된 행은 선택할 수 없습니다. 서버는 하나의 원자적 검토 저장소 쓰기를 수행하기 전에 전체 배치를 미리 보기 핑거프린트, 현재 소스 해시, 검토 상태, 생성된 제안에 대해 검증합니다. 선택한 항목 중 하나라도 검증에 실패하면 배치 결정은 하나도 저장되지 않습니다.

Entry는 업그레이드 검토 전반에 동일한 커스텀 체크박스 스타일을 사용합니다. 체크됨, 키보드 포커스, 비활성 상태가 눈에 띄게 구분됩니다. 결과 토스트 알림은 성공에는 초록색 테두리/글로우, 오류에는 빨간색 테두리/글로우를 사용합니다.

페이지에는 검토 진행 상황이 표시됩니다. 모든 충돌이 최신 수락, 편집한 제안, **Force upgrade**, 또는 **Keep current** 중 하나로 명시적으로 해결될 때까지 최종 Upgrade 동작은 비활성 상태로 유지됩니다. 최종 확인 창은 자동 업데이트, 수락한 제안, 편집한 제안, 강제 교체, 현재 상태를 유지한 파일, 백업을 요약해 줍니다.

## 소유권을 고려한 Force upgrade

Engram은 연결된 에이전트 업그레이드 인벤토리를 **물리적 파일** 기준으로 정규화하므로, `.agents/engram.md` 같은 공유 가이드는 Codex, Claude, Gemini 또는 다른 등록된 호스트가 가리켜도 한 번만 표시됩니다. 호스트 목록은 메타데이터로 계속 표시되지만, 하나의 물리적 파일은 하나의 표준 렌더러 출력과 하나의 쓰기 트랜잭션만 거칩니다.

**Force upgrade**는 의도적으로 **Use latest**보다 범위가 좁습니다. Engram이 소유권 경계를 증명할 수 있을 때만 표시됩니다.

- **관리 영역(Managed region):** Engram은 표시된 Engram 블록만 교체하고, 그 밖의 사용자가 작성한 모든 바이트(파일의 CRLF/LF 줄바꿈 방식 포함)를 보존합니다.
- **생성된 파일(Generated file):** Engram은 등록된/생성된 Engram 파일 전체를 교체할 수 있으며, Engram이 소유한 그 파일 안의 수동 편집도 포함됩니다.
- **소유권 불명(Unknown ownership):** Force upgrade 동작이 제공되지 않습니다. **Keep current**를 사용하거나 먼저 소유권의 모호함을 해소하세요.

일괄 컨트롤은 절대 강제 실행하지 않습니다. **Confirm selected changes**와 **Confirm all changes**는 안전한 **Use latest** 결정에만 제한됩니다. 강제 결정은 한 번에 하나씩 검토하며, 미리 보기 이후 소스 해시, 소유권 근거, 또는 강제 모드가 변경되면 거부됩니다.

쓰기가 끝나면 Engram은 업그레이드된 물리적 아티팩트를 다시 스캔합니다. 업데이트될 것으로 예상된 항목은 `current`로 수렴되어야 하며, 실패했거나 롤백된 트랜잭션이나 `outdated`/`conflict` 상태로 남은 항목이 있으면 성공 토스트를 표시하는 대신 전체 적용을 오류로 보고합니다. 명시적인 **Keep current** 항목은 이 수렴 요건에서 제외됩니다.

## CLI 충돌 검토

다음을 실행합니다.

```bash
engram upgrade --latest --review
```

대화형 검토 도구는 해결되지 않은 충돌을 한 번에 하나씩 처리합니다.

```text
[V] View diff
[E] Edit proposed content
[L] Accept latest proposal
[K] Keep current
[Q] Save and quit
```

`E`는 `$VISUAL`, 그다음 `$EDITOR`, 그다음 플랫폼 기본 편집기를 사용해 임시 제안 파일을 엽니다. Engram은 편집된 제안을 수락하기 전에 검증합니다. 결정은 계획 핑거프린트별로 Engram 상태 아래에 저장되므로, `Q`로 세션을 중단하고 나중에 `--review`를 다시 실행하면 저장된 결정을 이어서 진행할 수 있습니다.

자동화에는 다음을 사용합니다.

```bash
engram upgrade --latest --yes
```

`--yes`는 충돌 결정을 임의로 만들어 내지 않습니다. 충돌이 대기 중이거나 오래된 상태로 남아 있으면 Engram은 0이 아닌 코드로 종료하고 `engram upgrade --latest --review`를 실행하라고 안내합니다.

## 오래된 검토 보호

검토한 모든 항목은 소스 해시를 기록합니다. 적용 전에 Engram은 현재 소스 해시와 검토 당시의 소스 해시를 비교합니다. 검토 이후 파일이 변경되었다면 해당 결정은 오래된(stale)/대기 상태가 되어 다시 검토해야 합니다. 계획 핑거프린트는 검토한 것과 다른 인벤토리를 적용하는 것도 방지합니다.

## 트랜잭션 그룹, 백업, 롤백

수락된 교체와 병합은 안전한 자동 업그레이드와 동일한 트랜잭션 경로를 사용합니다. Engram은 원본 바이트와 권한을 저장하고, 필요한 경우 백업을 만들며, 제안된 내용을 검증한 뒤, 임시 파일에 쓰고 원자적으로 이름을 바꿔 제자리에 둡니다. 내구적 변환이 실패하면 해당 트랜잭션 그룹이 롤백됩니다. **Keep current**는 쓰기를 수행하지 않습니다.

## 벡터 인덱스는 실패해도 열린 채로 유지(fail-open)

벡터 검색은 선택적인 가속 계층입니다. Engram은 `sqlite-vec`의 `memory_vectors` 기본 키를 정수와 호환되는 `BigInt` 값으로 바인딩합니다. 벡터 재구축에 실패하면 Engram은 불완전한 벡터 사이드카/WAL/SHM을 제거하고, 성능 저하 경고를 보고한 뒤, 내구적인 키워드/그래프 업그레이드를 계속합니다. 벡터에서만 발생한 실패는 그 외에는 유효한 설정 업그레이드를 중단시킬 수 없습니다.

## 패키지 버전과 설정 상태

새 npm 패키지와 오래된 로컬 설정은 서로 다른 신호입니다. 권장 릴리스 절차는 다음과 같습니다.

```bash
npm install -g @the-long-ride/engram@latest
engram upgrade --latest --plan
engram upgrade --latest --review
engram upgrade --latest
```

업그레이드를 다시 실행해도 최신 상태인 아티팩트에는 영향이 없습니다(멱등). 검토를 마친 `Keep current` 파일은 상태가 바뀔어 새로운 검토가 필요해지지 않는 한 그대로 유지됩니다.
