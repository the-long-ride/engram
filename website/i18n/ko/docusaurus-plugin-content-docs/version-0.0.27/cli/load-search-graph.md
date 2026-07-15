---
title: load / search / graph
sidebar_position: 2
description: 읽기 명령 — 라우팅된 메모리 로드, 보관소 검색 및 그래프 라우팅 검사.
---

# load / search / graph

읽기 명령은 라우팅된 메모리를 로드하고, 보관소를 검색하고, 그래프 라우팅을 검사합니다.

## load

```bash
engram load "<task>"
engram load "<task>"
engram load --dry-run "<task>"
engram load --all "<task>"
```

`load`는 먼저 `rule`, `knowledge` 및 일반적인 불용어(stopwords)와 같은 일반적인 메모리 단어를 무시하고 의미 있는 쿼리 단어에 라우팅을 고정합니다. 그런 다음 더 넓은 후보 풀을 요약된 컨텍스트 팩으로 정제합니다. 일반 로드는 `loaded 8 memory files / 14 total related memories`와 같이 선택된 개수와 총 관련 개수를 보고합니다.

- `--full` — 에이전트 대상 요약 경로 (frontmatter의 `id`, `type`, `tags`, `confidence`, `depends_on`만 포함, 선택된 규칙 변트 하나 포함)
- `--dry-run` — 콘텐츠를 인쇄하지 않고 후보 수, 축소 태그 및 일치 이유 표시
- `--all` — 요약 제한 대신 표시되는 모든 라우팅 일치 반환

`workflow` 및 `workflows`는 여전히 기술 메모리로 라우팅되지만 일반 유형 단어 자체가 광범위한 일치를 생성하지는 않습니다.

## search

```bash
engram search "<topic>"
engram search --semantic "<topic>"
```

기본 검색은 결정론적 어휘 검색입니다. `search --semantic`은 임베딩 지원 의미 체계 검색이 아닌 결정론적 로컬 유사성을 추가합니다.

## graph

```bash
engram graph "<topic>"
engram graph --rebuild
```

그래프 라우팅을 검사합니다. 수동 편집 후 `engram graph --rebuild`를 실행합니다. 그래프는 종속성 레이어를 보고하고, `engram load`는 더 깊은 메모리 전에 라우팅된 전제 조건을 동일한 요약 컨텍스트 팩으로 가져옵니다.

그래프 관련 에지와 벡터 히트는 관련 없는 메모리를 자체적으로 로드할 수 없으며 의미 있는 쿼리 단어와 이미 겹치는 메모리를 다시 순 매기거나 확장하는 데만 도움이 됩니다. 명시적인 `depends_on` 전제 조건은 자체 키워드 중복 없이 로드될 수 있습니다.

## 종속성 레이어 (Dependency layers)

```yaml
depends_on: [release-foundation]
level: advanced
```

메모리가 다른 메모리를 반복하는 대신 빌드해야 하는 경우 `depends_on` frontmatter를 사용합니다.

## 다음 단계

- [save / save-session / observe](save-session.md)
- [개념: 읽기 경로 및 라우팅](../concepts/read-path.md)

