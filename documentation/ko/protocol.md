# 인간 소유 Memory Protocol

Engram은 단순한 "agent memory"가 아닙니다. inspect 가능하고 portable하며 인간이 governance하는 memory protocol입니다.

## Contract

Markdown은 durable memory입니다.

JSON index와 graph는 acceleration layers입니다.

Approval은 trust boundary입니다.

Hashes는 integrity checks입니다.

Ignore rules는 privacy controls입니다.

Git은 portability와 audit history입니다.

Agent adapters는 convenience이며 authority가 아닙니다.

agent는 memory를 제안할 수 있지만, 무엇이 memory가 되는지는 인간이 소유합니다.

## Memory Types

| Type | Use |
| --- | --- |
| Rule | preference, correction, constraint |
| Skill | repeatable workflow, checklist, procedure |
| Knowledge | objective fact, decision, implementation detail |

모든 active memory는 `Context`, `Content`, `Example` 섹션을 가집니다.

## Write Flow

1. Agent가 candidates를 제안합니다.
2. Engram이 type과 scope를 parse합니다.
3. schema, secrets, prompt injection, path safety를 검사합니다.
4. 인간이 preview를 봅니다.
5. 인간이 `A`, `A 1,3`, `B <note>`, `C`로 응답합니다.
6. 승인된 memory만 쓰입니다.
7. index, graph, hashes, changelog가 갱신됩니다.

## Read Flow

1. Engram이 workspace/global index를 load합니다.
2. Workspace가 global duplicate보다 우선합니다.
3. Ignore rules와 roles가 noise를 거릅니다.
4. Graph-aware routing이 compact context를 선택합니다.
5. 출력 전 hash와 safety checks가 실행됩니다.

protocol이 없으면 memory는 invisible state가 됩니다. Engram은 memory를 files, diffs, hashes, review gates로 되돌립니다.

다음: [Operations](operations.md).

