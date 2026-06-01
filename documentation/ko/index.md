# Engram

Engram은 AI agent를 위한 인간 소유 메모리 프로토콜입니다. 프로젝트, 팀, 개인 선호에 관한 오래가는 지식을 읽고, 검토하고, 동기화하고, 복구할 수 있는 파일에 저장합니다.

Engram은 agent의 숨겨진 두뇌가 아닙니다. agent는 memory를 제안할 수 있지만, 진짜 source of truth는 `.agents/.engram/` 또는 선택적 global memory 폴더 안의 승인된 Markdown입니다.

## 해결하는 문제

AI agent는 프로젝트 결정을 잊고, 설정 질문을 반복하고, 오래된 컨텍스트와 새 지시를 섞습니다. 내장 메모리는 보통 특정 벤더, 앱, 기기에 묶입니다.

Engram의 계약:

- 승인된 facts, rules, workflows는 Markdown에 저장
- index와 graph는 가속 레이어
- 모든 쓰기는 인간 승인 필요
- hash는 무결성 체크
- ignore rules는 privacy control
- Git은 history, portability, team review 제공

## Mental Model

| Layer | 역할 |
| --- | --- |
| Markdown | durable source of truth |
| JSON index | 빠른 lookup |
| JSON graph | topic/relationship routing |
| Approval gate | trust boundary |
| Hashes | 읽기 전 integrity check |
| Ignore rules | privacy controls |
| Git | audit history와 sync |
| Agent adapters | 편의 기능, 권위 아님 |

## Scope 우선순위

1. Workspace memory: `<project>/.agents/.engram/`
2. Global memory: `$ENGRAM_GLOBAL_DIR` 또는 `engram init --global-path <path>`

Workspace가 우선입니다. Global은 여러 repo에서 재사용할 선호와 팀 컨텍스트 fallback입니다.

## 현재 기능

- `save`: 하나의 승인된 memory 저장
- `save-session` / `ss`: session에서 여러 memory 저장
- `observe`: active memory가 아닌 raw note 저장
- `take-control`: 기존 guidance/docs 가져오기
- `graph`, `quality-check`: review signal
- `archive`: 잘못되었거나 오래된 memory 제외
- `repair`: rebuild에서 skipped 된 invalid memory 보고
- `benchmark`: retrieval regression 확인
- agent skillsets, slash adapters, MCP-style proposal tools

명령을 쓰기 전에 concept page를 읽으세요: [Engram 이해하기](understanding.md).

다음: [AI agent quickstart](quickstart.md).
