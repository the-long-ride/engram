---
title: 메모리 유형
sidebar_position: 2
description: Engram 메모리는 규칙(Rule), 기술(Skill), 지식(Knowledge) 유형으로 나뉘어 라우팅과 검토가 집중력 있게 유지됩니다.
---

# 메모리 유형

활성화된 모든 Engram 메모리에는 유형이 있습니다. 유형은 라우팅, 검토 및 에이전트에게 메모리가 렌더링되는 방식을 제어합니다.

| 유형 | 용도 |
| --- | --- |
| Rule | 사용자 선호도, 교정, 제약 조건, 항상/절대 수행해야 할 가이드 |
| Skill | 반복 가능한 워크플로, 체크리스트, 절차, 런북 |
| Knowledge | 객관적인 프로젝트 사실, 결정, 구현 세부 사항 |

활성화된 모든 메모리 파일에는 `Context`, `Content`, `Example` 섹션이 있습니다. 규칙 메모리는 로드된 가이드가 유용하게 유지되도록 간결한 줄 제한을 목표로 합니다.

## 좋은 메모리

좋은 Engram 메모리의 특징은 다음과 같습니다.

- 다음 주에도 유효할 만큼 충분히 안정적임
- 나중에 라우팅할 수 있을 만큼 충분히 구체적임
- 에이전트 컨텍스트에 로드할 수 있을 만큼 충분히 짧음
- 의도된 범위 내에서 공유할 수 있을 만큼 충분히 안전함
- 규칙, 워크플로 또는 지식 항목으로 작성됨

나쁜 메모리는 일시적인 채팅 노이즈, 비밀번호/자격 증명, 일회성 추측 또는 아무도 승인하지 않은 사실 등입니다.

## 규칙 변형 (Rule variants)

Engram은 항상 규칙 메모리를 가벼운(light), 균형 잡힌(balanced), 엄격한(strict) 버전으로 저장합니다. 규칙 변형 모드는 에이전트용 메모리의 렌더링 렌즈 역할을 합니다.

- **Strict**는 낮은 등급의 모델이 통제된 상태를 유지하도록 돕습니다.
- **Light** 또는 **balanced** 문구는 대개 강력한 모델이 규칙으로 인해 추론에 제한을 받지 않도록 돕습니다.

변형이 꺼져 있을 때 Engram은 기본적으로 균형 잡힌 규칙 문구를 렌더링합니다. 설정 조정:

```bash
engram set-rule-variant strict|balanced|light|off
```

## 에이전트용 출력 (`--full`)

`engram load "<task>"`가 실행되면 AI 에이전트를 위해 출력이 간소화됩니다.

| 항목 | 인간 (`engram load`) | 에이전트 (`--full`) |
| --- | --- | --- |
| Frontmatter | 모든 필드 (id, type, tags, confidence, scope, author, created, updated, depends_on 등) | `id`, `type`, `tags`, `confidence`, `depends_on`만 포함 |
| 규칙 본문 | 세 가지 변형이 모두 포함된 전체 `## Rule Variants` 섹션 | `## Rule variants (1/3 based on current: <active>)` 아래에 선택된 단 하나의 변형 |
| 비규칙 내용 | 전체 `## Content` 섹션 | 동일한 내용, 제목 변경 없음 |

MCP `engram_load` 및 SessionStart 훅은 기본적으로 `--full`를 사용합니다 (MCP 도구에서 `full: true`로 옵트아웃 가능). 스킬셋 어댑터는 생성된 지침에 `--full`를 하드코딩합니다.

## 다음 단계

- [작업 공간 메모리 vs 글로벌 메모리](scopes.md)
- [읽기 경로 및 라우팅](read-path.md)

