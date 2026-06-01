# Understand Engram

Read this before the command guide. Engram is useful because of who owns memory, not because it has many commands.

## One-Sentence Model

Engram is a file protocol that lets AI agents use durable memory while humans decide what becomes durable.

## What Engram Is

Engram is a knowledge memory center for:

- project rules
- team decisions
- repeatable workflows
- durable facts
- personal preferences that should travel across projects

The memory is plain Markdown. The index, graph, hashes, and adapter files exist to make that Markdown easier and safer to use.

## What Engram Is Not

Engram is not:

- a hidden brain for an agent
- a vendor-owned memory silo
- a replacement for project documentation
- a vector database pretending to be authority
- an automatic recorder that saves everything forever

Agents may suggest memory. Humans approve, reject, edit, archive, and own memory.

## The Core Promise

Engram tries to make AI memory:

- reviewable: you can read it in a normal editor
- portable: you can sync it with Git and use it across agents
- correctable: wrong memory can be archived instead of silently haunting future work
- private by default: ignore rules and approval gates stop accidental capture
- boring on purpose: Markdown is easier to trust than invisible platform state

## The Layers

| Layer | Meaning |
| --- | --- |
| Markdown | durable source of truth |
| JSON index | fast lookup layer |
| JSON graph | topic and relationship routing layer |
| Hashes | integrity checks |
| Approval | trust boundary before writes |
| Ignore rules | privacy controls |
| Git | history, portability, review, recovery |
| Agent adapters | convenience layer for Codex, Claude, Cursor, Gemini, and other agents |

Generated JSON helps agents find memory faster, but it is not the authority. If generated files disagree with Markdown, Markdown wins.

## Memory Lifecycle

1. A session, file, or human note contains useful knowledge.
2. An agent proposes concise memory candidates.
3. A human approves all, selects some, adds a note, or rejects them.
4. Engram writes approved Markdown memory.
5. Engram refreshes hashes, index, graph, and changelog.
6. Future agents load only the memory relevant to the current task.
7. If memory becomes wrong, Engram archives it with a reason.

This lifecycle keeps memory active without making it invisible.

## Human, Agent, Engram, Git

| Actor | Role |
| --- | --- |
| Human | chooses what becomes durable memory |
| Agent | notices patterns and proposes candidates |
| Engram | enforces schema, safety, routing, approval, and maintenance |
| Git | carries memory between machines and gives review history |

The agent is helpful, but the agent is not the owner.

## Good Memory

Good Engram memory is:

- stable enough to matter next week
- specific enough to route later
- short enough to load into an agent context
- safe enough to share with the intended scope
- written as a rule, workflow, or knowledge item

Bad memory is temporary chat noise, secrets, credentials, one-off speculation, or facts that nobody has approved.

## Scope

Workspace memory lives in:

```text
<project>/.agents/.engram/
```

Global memory is optional and lives wherever the user configures it.

Workspace memory wins. Global memory is fallback for reusable preferences, personal habits, or team-wide defaults.

## Why Not Only Built-In Agent Memory

Built-in memory is convenient, but it can be hard to inspect, diff, export, share, or correct. It often belongs to one app or account.

Engram makes the durable layer visible. Built-in memory can still help, but Engram should be the owned source when the knowledge matters.

## Limits To Know

Current Engram search is deterministic lexical search. Graph vectors are local hashed word vectors, not semantic embeddings. Contradiction detection is advisory. Encryption config exists, but encrypted storage is not implemented yet.

These limits are intentional to state clearly. Engram should tell users what is real today and what is future work.

Next: [AI-agent quickstart](quickstart.md).
