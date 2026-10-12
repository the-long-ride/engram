---
title: 쓰기 경로와 승인
sidebar_position: 6
description: 에이전트는 제안하고 사람이 승인합니다. 승인된 메모리만 기록되며, 이후 인덱스, 그래프, 해시, 변경 로그가 갱신됩니다.
---

# 쓰기 경로와 승인

쓰기 흐름은 신뢰 경계입니다. 에이전트는 제안하고, 사람이 승인합니다.

## 쓰기 흐름 {#write-flow}

1. 에이전트가 하나 이상의 후보를 제안합니다.
   `save-session --query-level <n>`을 사용하면 에이전트는 접근 가능한 최근 사람-에이전트 채팅을 최대 n개까지 고려할 수 있지만, 이는 제안을 위한 컨텍스트로만 사용됩니다.
   자연어 `/engram ss -f last 50 sessions`는 같은 범위에 명시적인 강제 승인을 더한 것으로, `engram save-session --query-level 50 --force`와 같습니다.
2. Engram이 후보의 유형과 대상 범위를 파싱합니다.
3. Engram이 스키마, 비밀 정보, 프롬프트 인젝션 패턴, 경로 안전성을 검사합니다.
4. 사람이 미리 보기를 확인합니다. 각 후보에는 결정적인 `Verdict:` 줄이 하나 붙습니다. `ADD`, `UPDATE <id>`, `SUPERSEDE <id>`, `NOOP duplicate of <id>` 중 하나입니다(모델 호출 없음).
5. 직접 CLI 응답에는 `A`, `A 1,3`, `B <note>`, `C`를 사용합니다.
6. AI 에이전트 채팅 응답에는 표시된 후보를 그대로 보여 준 뒤 `yes`, `audit`, `cancel`을 사용합니다.
7. 승인된 메모리만 기록됩니다. `A`와 `B`는 `NOOP` 후보를 건너뛰고, `SUPERSEDE`를 승인하면 이전 메모리가 대체됨으로 표시됩니다. `--force`와 자동 저장은 `SUPERSEDE`를 적용하지 않고 검토를 위해 보류합니다.
8. 인덱스, 그래프, 해시, 변경 로그가 갱신됩니다.

## 승인 단어 {#approval-words}

승인 단어는 `yes`, `approve`, `confirm`, `save`입니다. 감사 단어는 `audit`, `revise`, `correct`, 또는 수정된 대체 텍스트입니다. 취소 단어는 `cancel`, `stop`, 또는 거부입니다. 후보를 정확히 표시한 뒤의 승인만이 해당 후보에 대한 `engram save-session --force`를 허가합니다.

직접 터미널 CLI는 계속 A/B/C를 사용합니다. MCP 제안 도구는 계속 쓰기를 수행하지 않습니다.

## 관련 메모리 힌트 {#related-memory-hints}

`engram save`가 관련된 활성 메모리를 찾으면, 승인 미리 보기에 권장 `depends_on` 또는 중복 가능성 경고와 함께 해당 메모리가 표시됩니다. 수락하면 미리 보기가 그대로 저장됩니다. 저장하기 전에 의존성을 재구성하거나 중복을 아카이브하려면 먼저 거부하세요.

`save-session --force`에서는 이러한 관련 메모리 힌트가 나타나면 Engram이 쓰기 전에 멈춥니다. 에이전트는 이 응답을 활용해 구조화된 재실행을 구상해야 합니다. 의존성에는 `DEPENDS_ON: memory-id`를, 선행 메모리보다 깊은 메모리에는 `LEVEL: advanced`를, 후보를 중복 가능성이 있는 메모리에 병합해야 할 때는 `UPDATE: memory-id`를 추가합니다.

<!-- evidence-foundation:v3:start -->
## 증거 기반 메모리

활성 메모리가 되기 전에 검토해야 하는 소스 자료의 경우:

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<observation>.md
```

첫 번째 명령은 소스를 정제하고, `trace_id`로 식별되는 변경 불가능한 추적과 편집 가능한 인박스 래퍼를 기록합니다. 두 번째 명령은 래퍼를 해당 추적으로 확인하고 해시와 범위를 검증한 다음, 사람이 승인한 스키마 v3 메모리만 `evidence_refs`와 함께 기록합니다. `## Raw Note`를 편집해도 추적의 증거는 바뀌지 않습니다.
<!-- evidence-foundation:v3:end -->

## 저장 시점의 안전성 검사 {#safety-checks-at-save-time}

- 스키마 검증
- 비밀 정보 스캔
- 프롬프트 인젝션 스캔
- 경로 안전성
- 해시 무결성

## 이것이 중요한 이유 {#why-this-matters}

프로토콜이 없으면 메모리는 보이지 않는 상태가 될 수 있습니다. 보이지 않는 상태는 검토하기 어렵고, 공유하기 어려우며, 에이전트가 실수로 오염시키기 쉽습니다.

Engram은 메모리를 일부러 평범하게 만듭니다. 파일, diff, 해시, 검토 게이트, 그리고 사람이 다시 실행할 수 있는 명령으로 이루어집니다.

## 다음 단계 {#next-steps}

- [개인정보 보호, 무시 규칙, 안전성](safety.md)
- [CLI: save / save-session / observe](../cli/save-session.md)
