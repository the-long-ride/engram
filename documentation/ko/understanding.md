# Engram 이해하기

명령 가이드 전에 이 페이지를 읽으면 좋습니다. Engram의 핵심은 명령 수가 아니라 memory의 소유권입니다.

## 한 문장 모델

Engram은 AI agent가 오래가는 memory를 쓰게 하면서, 무엇이 durable memory가 될지는 사람이 결정하게 하는 file protocol입니다.

## Engram이란

Engram은 다음을 위한 knowledge memory center입니다:

- project rules
- team decisions
- repeatable workflows
- durable facts
- 여러 프로젝트에 따라가야 하는 personal preferences

Memory 자체는 평범한 Markdown입니다. index, graph, hash, adapter는 그 Markdown을 더 쉽고 안전하게 쓰기 위한 장치입니다.

## Engram이 아닌 것

Engram은 다음이 아닙니다:

- agent의 숨겨진 두뇌
- 특정 vendor가 소유한 memory silo
- project documentation의 대체품
- authority인 척하는 vector database
- 모든 것을 영원히 저장하는 automatic recorder

Agent는 memory를 제안할 수 있습니다. 사람은 memory를 승인, 거절, 수정, archive하고 소유합니다.

## 핵심 약속

Engram은 AI memory를 이렇게 만들려고 합니다:

- reviewable: 일반 editor에서 읽을 수 있음
- portable: Git으로 sync하고 여러 agent에서 사용 가능
- correctable: 잘못된 memory를 이유와 함께 archive 가능
- private by default: ignore rules와 approval gate가 실수 저장을 줄임
- deliberately simple: 보이지 않는 platform state보다 Markdown을 신뢰하기 쉬움

## 레이어

| Layer | 의미 |
| --- | --- |
| Markdown | durable source of truth |
| JSON index | 빠른 lookup layer |
| JSON graph | topic/relationship routing layer |
| Hashes | integrity checks |
| Approval | 쓰기 전 trust boundary |
| Ignore rules | privacy controls |
| Git | history, portability, review, recovery |
| Agent adapters | Codex, Claude, Cursor, Gemini 등 agent를 위한 convenience layer |

생성된 JSON은 agent가 memory를 빨리 찾도록 돕지만 authority는 아닙니다. JSON과 Markdown이 다르면 Markdown이 이깁니다.

## Memory Lifecycle

1. session, file, human note에 유용한 지식이 있습니다.
2. agent가 짧은 memory candidate를 제안합니다.
3. 사람이 전부 승인, 일부 선택, note 추가, 또는 거절합니다.
4. Engram이 승인된 Markdown memory를 씁니다.
5. Engram이 hash, index, graph, changelog를 갱신합니다.
6. 이후 agent는 현재 task와 관련된 memory만 load합니다.
7. memory가 틀리면 Engram이 이유와 함께 archive합니다.

이 lifecycle은 memory를 살아 있게 만들지만 보이지 않는 상태로 만들지 않습니다.

## Human, Agent, Engram, Git

| Actor | 역할 |
| --- | --- |
| Human | 무엇이 durable memory가 될지 결정 |
| Agent | pattern을 발견하고 candidate 제안 |
| Engram | schema, safety, routing, approval, maintenance 적용 |
| Git | memory를 기기 간 이동시키고 review history 제공 |

Agent는 도움이 되지만 owner는 아닙니다.

## 좋은 Memory

좋은 Engram memory는:

- 다음 주에도 의미 있을 만큼 안정적
- 나중에 routing될 만큼 구체적
- agent context에 들어갈 만큼 짧음
- 의도한 scope에 안전함
- rule, workflow, knowledge 중 하나로 명확함

나쁜 memory는 임시 chat noise, secret, credential, 일회성 추측, 승인되지 않은 fact입니다.

## Scope

Workspace memory 위치:

```text
<project>/.agents/.engram/
```

Global memory는 optional이며 사용자가 설정한 곳에 둡니다.

Workspace가 우선입니다. Global은 reusable preference, personal habit, team default의 fallback입니다.

## Built-In Agent Memory만 쓰지 않는 이유

Built-in memory는 편하지만 inspect, diff, export, share, correct가 어려울 수 있습니다. 보통 특정 app이나 account에 속합니다.

Engram은 durable layer를 보이게 만듭니다. Built-in memory도 도움은 되지만, 중요한 지식은 사람이 소유한 Engram을 source로 두는 것이 좋습니다.

## 알아둘 한계

기본 search는 deterministic lexical search입니다. `engram search --semantic`은 로컬 deterministic similarity를 사용하며 embedding-backed semantic search는 아닙니다. Graph vector는 local hashed word vector이며 semantic embedding이 아닙니다. Contradiction detection은 advisory signal입니다. Encryption config는 있지만 encrypted storage는 아직 구현되지 않았습니다.

이 한계를 명확히 말하는 것이 중요합니다. Engram은 오늘 실제로 있는 것과 future work를 분리해서 보여줘야 합니다.

다음: [AI agent quickstart](quickstart.md).
