---
title: load / search / graph
sidebar_position: 2
description: 읽기 명령 — 라우팅된 메모리 로드, 보관소 검색, 그래프 라우팅 검사.
---

# load / search / graph

읽기 명령은 라우팅된 메모리를 로드하고, 저장소를 검색하며, 그래프 라우팅을 검사합니다.

## load

```bash
engram load "<task>"
engram load --full "<task>"
engram load --dry-run "<task>"
engram load --all "<task>"
engram load --budget-tokens 800 "<task>"
engram load --disclosure full "<task>"
engram load --id <id>,<id>
engram load --exclude-keys workspace:rules/use-pnpm.md "<task>"
```

`load`는 먼저 의미 있는 쿼리 용어에 라우팅을 고정하며, `rule`, `knowledge` 같은 일반 메모리 단어와 흔한 불용어는 무시합니다. 그런 다음 더 넓은 후보 풀을 압축된 컨텍스트 팩으로 구체화합니다. 일반 로드는 선택된 개수와 총 관련 개수를 보고합니다 (예: `loaded 8 memory files / 14 total related memories`).

- 기본 `load` — 계층형 에이전트 라우트: `load.expand_top` 기준 상위 히트(기본 3개)는 본문으로 표시되고, 다른 모든 선택 항목은 한 줄 카드(card)로 표시되며, 끝에 `fetch: engram load --id <ids>` 힌트가 붙습니다. 각 본문 헤더에는 메모리의 `authority`가 표시되며, `evidence_refs`, `## Context`, `## Example`, `## Origin` 같은 프론트매터는 렌더링되지 않고(`--full`로 확인 가능), 규칙은 선택된 변체 하나만 표시됩니다.
- `--id <id,...>` — 카드에 대한 전체 본문을 가져옵니다. ID는 쉼표로 구분할 수 있으며, 명시적 가져오기는 `stats --usage`에 반영됩니다.
- `--budget-tokens <200-16000>` — 전체 계층화 출력에 대한 엄격한 상한선입니다. 본문이 먼저 카드가 되고, 그 후에 순위가 가장 낮은 카드가 제외됩니다.
- `--disclosure auto|full` — `full`은 계층형 팩 대신 압축된 모든 본문을 출력합니다(설정의 `load.disclosure: full`도 동일).
- `--exclude-keys <scope:file,...>` — 호출자가 이미 가지고 있는 메모리를 건너뜁니다. 본문이나 카드가 출력되지 않으며, `--json`은 이를 `already_loaded`에 나열합니다.
- `--full` — 전체 프론트매터 및 전체 규칙 변체가 포함된 더 넓은 레거시 출력입니다.
- `--dry-run` — 내용을 인쇄하지 않고 후보 수, 좁혀진 태그, 일치 이유를 표시합니다.
- `--all` — 압축 한도 대신 표시되는 모든 라우팅 일치 항목을 반환합니다.

`workflow` 및 `workflows`는 여전히 스킬 메모리로 라우팅되지만, 일반 유형 단어 자체가 넓은 일치를 유발하지는 않습니다.

`auto` 공개 모드에서 JSON의 `selected` 및 `entries` 목록은 확장된 본문만 설명합니다. 카드는 별도로 보고됩니다. `engram.config.json`의 `load` 블록에서 `load.expand_top` 및 `load.disclosure`를 구성하세요([프로필 / 워크스페이스 / 구성](profiles-workspaces-config.md#load-configuration) 참조).

## search

```bash
engram search "<topic>"
engram search --semantic "<topic>"
```

기본 검색은 결정론적 어휘 검색입니다. `search --semantic`은 임베딩 기반 의미 검색이 아니라 결정론적 로컬 유사성을 추가합니다. `search --json` 결과에는 `score` 필드가 포함됩니다.

## graph

```bash
engram graph "<topic>"
engram graph --rebuild
```

그래프 라우팅을 검사합니다. 수동 편집 후 `engram graph --rebuild`를 실행하세요. 그래프는 종속성 계층을 보고하며, `engram load`는 더 깊은 메모리보다 먼저 라우팅된 필수 구성 요소를 동일한 압축 팩으로 가져옵니다.

그래프의 관련 엣지와 벡터 일치는 관련 없는 메모리를 자동으로 로드하지 않습니다. 의미 있는 쿼리 용어와 이미 일치하는 메모리를 재정렬하거나 확장하는 데만 도움을 줍니다. 명시적인 `depends_on` 전제 조건은 자체 용어 일치 없이도 로드될 수 있습니다.

## 종속성 계층 {#dependency-layers}

```yaml
depends_on: [release-foundation]
level: advanced
```

한 메모리가 다른 메모리를 반복하지 않고 기반으로 삼아야 할 때 프론트매터 `depends_on`을 사용하세요.

## 다음 단계 {#next-steps}

- [save / save-session / observe](save-session.md)
- [개념: 읽기 경로 및 라우팅](../concepts/read-path.md)
