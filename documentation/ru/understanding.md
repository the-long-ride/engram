# Понять Engram

Прочитайте эту страницу перед справочником команд. Ценность Engram не в количестве команд, а в том, кто владеет памятью.

## Модель В Одном Предложении

Engram - это файловый протокол, который позволяет AI agents использовать долговечную память, но оставляет человеку решение о том, что станет долговечным.

## Что Такое Engram

Engram - это knowledge memory center для:

- правил проекта
- решений команды
- повторяемых workflows
- долговечных facts
- личных preferences, которые должны переноситься между проектами

Memory хранится как обычный Markdown. Index, graph, hashes и adapters нужны, чтобы этот Markdown было проще и безопаснее использовать.

## Чем Engram Не Является

Engram не является:

- скрытым мозгом agent
- vendor-owned memory silo
- заменой документации проекта
- vector database, который притворяется authority
- автоматическим recorder, который сохраняет все навсегда

Agents могут предлагать memory. Люди approve, reject, edit, archive и own memory.

## Главная Обещанная Ценность

Engram старается сделать AI memory:

- reviewable: ее можно читать в обычном editor
- portable: ее можно sync через Git и использовать разными agents
- correctable: wrong memory можно archive с причиной
- private by default: ignore rules и approval gate уменьшают случайные сохранения
- intentionally simple: Markdown легче доверять, чем невидимому platform state

## Слои

| Layer | Meaning |
| --- | --- |
| Markdown | durable source of truth |
| JSON index | fast lookup layer |
| JSON graph | topic and relationship routing layer |
| Hashes | integrity checks |
| Approval | trust boundary перед записью |
| Ignore rules | privacy controls |
| Git | history, portability, review, recovery |
| Agent adapters | convenience layer для Codex, Claude, Cursor, Gemini и других agents |

Generated JSON помогает agent быстрее находить memory, но не является authority. Если JSON и Markdown расходятся, выигрывает Markdown.

## Жизненный Цикл Memory

1. Session, file или human note содержит полезное знание.
2. Agent предлагает короткие memory candidates.
3. Human approves all, chooses some, adds note, or rejects.
4. Engram записывает approved Markdown memory.
5. Engram обновляет hashes, index, graph и changelog.
6. Future agents load только memory, relevant для текущей task.
7. Если memory стала wrong, Engram archives it with a reason.

Этот lifecycle держит memory активной, но не делает ее невидимым состоянием.

## Human, Agent, Engram, Git

| Actor | Role |
| --- | --- |
| Human | решает, что станет durable memory |
| Agent | замечает patterns и предлагает candidates |
| Engram | применяет schema, safety, routing, approval и maintenance |
| Git | переносит memory между machines и хранит review history |

Agent полезен, но не является owner.

## Хорошая Memory

Хорошая Engram memory:

- достаточно стабильна, чтобы иметь смысл на следующей неделе
- достаточно конкретна, чтобы потом routing ее нашел
- достаточно коротка, чтобы войти в agent context
- безопасна для выбранного scope
- явно является rule, workflow или knowledge

Плохая memory - это временный chat noise, secrets, credentials, разовая speculation или facts без approval.

## Scope

Workspace memory находится здесь:

```text
<project>/.agents/.engram/
```

Global memory optional и находится там, где user ее настроил.

Workspace имеет приоритет. Global - fallback для reusable preferences, personal habits или team defaults.

## Почему Не Только Built-In Agent Memory

Built-in memory удобна, но ее часто трудно inspect, diff, export, share или correct. Обычно она принадлежит одной app или account.

Engram делает durable layer видимым. Built-in memory может помогать, но если знание важно, owned source должен быть Engram.

## Ограничения, Которые Нужно Знать

Default search - deterministic lexical search. `engram search --semantic` adds deterministic local similarity, not embedding-backed semantic search. Graph vectors - local hashed word vectors, не semantic embeddings. Contradiction detection является advisory. Encryption config есть, но encrypted storage еще не реализован.

Эти ограничения нужно говорить явно. Engram должен показывать, что реально есть сегодня, а что является future work.

Далее: [AI-agent quickstart](quickstart.md).
