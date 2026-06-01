# Human-Owned Memory Protocol

Engram - это не просто "agent memory." Это протокол, который делает memory проверяемой, переносимой и управляемой человеком.

## Contract

Markdown - durable memory.

JSON index и graph - acceleration layers.

Approval - trust boundary.

Hashes - integrity checks.

Ignore rules - privacy controls.

Git - portability and audit history.

Agent adapters - convenience, not authority.

Agents can suggest memory, but humans own what becomes memory.

## Memory Types

| Type | Use |
| --- | --- |
| Rule | preference, correction, constraint |
| Skill | repeatable workflow, checklist, procedure |
| Knowledge | objective fact, decision, implementation detail |

Каждая active memory содержит `Context`, `Content`, `Example`.

## Write Flow

1. Agent предлагает candidates.
2. Engram определяет type и scope.
3. Проверяет schema, secrets, prompt injection, path safety.
4. Human видит preview.
5. Human отвечает `A`, `A 1,3`, `B <note>` или `C`.
6. Записывается только approved memory.
7. Обновляются index, graph, hashes, changelog.

## Read Flow

1. Engram грузит workspace/global index.
2. Workspace побеждает global duplicates.
3. Ignore rules и roles фильтруют noise.
4. Graph-aware routing выбирает compact context.
5. Hash и safety checks выполняются перед выводом.

Без protocol memory становится invisible state. Engram возвращает ее в files, diffs, hashes и review gates.

Далее: [Operations](operations.md).

