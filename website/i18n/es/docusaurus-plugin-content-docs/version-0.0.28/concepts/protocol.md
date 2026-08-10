---
title: Human-owned memory protocol
sidebar_position: 1
description: Engram is a protocol that makes AI agent memory inspectable, portable, and governed by humans.
---

# Human-owned memory protocol

Engram is not just "agent memory." It is a protocol that makes memory inspectable, portable, and governed by humans.

## The contract

- Markdown is durable memory.
- JSON index and graph files are acceleration layers.
- Approval is the trust boundary.
- Hashes are integrity checks.
- Ignore rules are privacy controls.
- Git is portability and audit history.
- Agent adapters are convenience, not authority.

Agents can suggest memory, but humans own what becomes memory.

## One-sentence model

Engram is a file protocol that lets AI agents use durable memory while humans decide what becomes durable.

## What Engram is

Engram is a knowledge memory center for:

- project rules
- team decisions
- repeatable workflows
- durable facts
- personal preferences that should travel across projects

The memory is plain Markdown. The index, graph, hashes, and adapter files exist to make that Markdown easier and safer to use.

## What Engram is not

Engram is not:

- a hidden brain for an agent
- a vendor-owned memory silo
- a replacement for project documentation
- a vector database pretending to be authority
- an automatic recorder that saves everything forever

Agents may suggest memory. Humans approve, reject, edit, archive, and own memory.

## The core promise

Engram tries to make AI memory:

- **reviewable**: you can read it in a normal editor
- **portable**: you can sync it with Git and use it across agents
- **correctable**: wrong memory can be archived instead of silently haunting future work
- **private by default**: ignore rules and approval gates stop accidental capture
- **boring on purpose**: Markdown is easier to trust than invisible platform state

## The layers

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

Memory files may declare `depends_on: [...]` in frontmatter when one rule, skill, or knowledge item needs another as a prerequisite. The graph derives foundation-to-deep layers from those dependencies, and default `engram load` keeps prerequisites before dependent memories inside the compact agent-facing route. SessionStart hooks call that routed load path at startup and inject only changed context, while prompt-turn hooks reuse or skip unchanged routes.

## Memory lifecycle

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

## Why not only built-in agent memory

Built-in memory is convenient, but it can be hard to inspect, diff, export, share, or correct. It often belongs to one app or account.

Engram makes the durable layer visible. Built-in memory can still help, but Engram should be the owned source when the knowledge matters.

## Next steps

- [Memory types](memory-types.md)
- [Read path and routing](read-path.md)
- [Write path and approval](write-path.md)
