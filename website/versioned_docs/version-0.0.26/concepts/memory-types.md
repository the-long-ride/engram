---
title: Memory types
sidebar_position: 2
description: Engram memory is typed — Rule, Skill, and Knowledge — so routing and review stay focused.
---

# Memory types

Every active Engram memory has a type. The type controls routing, review, and how the memory is rendered to agents.

| Type | Use |
| --- | --- |
| Rule | user preference, correction, constraint, always/never guidance |
| Skill | repeatable workflow, checklist, procedure, runbook |
| Knowledge | objective project fact, decision, implementation detail |

Every active memory file has `Context`, `Content`, and `Example` sections. Rule memories also target concise line limits so loaded guidance stays useful.

## Good memory

Good Engram memory is:

- stable enough to matter next week
- specific enough to route later
- short enough to load into an agent context
- safe enough to share with the intended scope
- written as a rule, workflow, or knowledge item

Bad memory is temporary chat noise, secrets, credentials, one-off speculation, or facts that nobody has approved.

## Rule variants

Engram always saves rule memories with light, balanced, and strict versions. Rule variant mode is a render lens for agent-facing memory:

- **Strict** helps lower-tier models stay controlled.
- **Light** or **balanced** wording usually helps stronger models so rules do not limit their reasoning.

When variants are off, Engram renders balanced rule wording by default. Tune with:

```bash
engram set-rule-variant strict|balanced|light|off
```

## Agent-facing output (`--full`)

When `engram load "<task>"` runs, the output is slimmed for AI agents:

| Aspect | Human (`engram load`) | Agent (`--full`) |
| --- | --- | --- |
| Frontmatter | All fields (id, type, tags, confidence, scope, author, created, updated, depends_on, etc.) | Only `id`, `type`, `tags`, `confidence`, `depends_on` |
| Rule body | Full `## Rule Variants` section with all three variants | One selected variant under `## Rule variants (1/3 based on current: <active>)` |
| Non-rule content | Full `## Content` section | Same content, unchanged heading |

MCP `engram_load` and SessionStart hooks default to `--full` (opt-out via `full: true` on the MCP tool). Skillset adapters hardcode `--full` in their generated instructions.

## Next steps

- [Workspace vs global memory](scopes.md)
- [Read path and routing](read-path.md)

