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

New files use `schema_version: 3`. Rule and skill memories default to `authority: instruction`; knowledge defaults to `authority: reference`. `revision` starts at 1 and increments on updates. Trace IDs belong in `evidence_refs`, while session or source identities belong in `derived_from`.

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

## Compact output by default

When `engram load "<task>"` runs, the output is slimmed for AI agents by default:

| Aspect | Default (`engram load`) | Full (`engram load --full`) |
| --- | --- | --- |
| Frontmatter | `id`, `type`, `tags`, `confidence`, `authority`, `depends_on`, `evidence_refs` | Full schema v3 and legacy fields, including provenance, revision, supersession, and validity |
| Rule body | One selected variant under `## Rule variants (1/3 based on current: <active>)` | Full `## Rule Variants` section with all three variants |
| Non-rule content | Same content, unchanged heading | Same content, unchanged heading |

MCP `engram_load` and SessionStart hooks use compact output by default. Pass `full: true` on the MCP tool or `engram load --full "<task>"` when broader legacy output is needed.

<!-- evidence-foundation:v3:start -->
## Mémoire étayée par des preuves

New files use `schema_version: 3`. Rule and skill memories default to `authority: instruction`; knowledge defaults to `authority: reference`. `revision` starts at 1 and increments on updates. Trace IDs belong in `evidence_refs`, while session or source identities belong in `derived_from`. Legacy v1 (`Context` + `Content` + `Example`) and v2 (`Content`, optional `Origin`) remain readable.
<!-- evidence-foundation:v3:end -->

## Next steps

- [Workspace vs global memory](scopes.md)
- [Read path and routing](read-path.md)


## Git author identity

Engram can store a global author and an optional workspace override. Resolution is workspace, global, then read-only Git fallback. Settings affect future memories only; a workspace override never changes global Git configuration. Use explicit plan and confirmation for global Git sync or legacy-memory migration.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Read the complete [Git author settings guide](../operations/git-author-settings.md).


<!-- configuration-upgrade-inventory -->
## Configuration upgrade inventory

After a package update, run `engram upgrade --latest --plan` before `engram upgrade --latest`. The shared inventory scans workspace and global Engram-managed memories, instructions, skillsets, configs, hooks, and plugins. User-authored bytes are preserved; ambiguous mixed files are reported as conflicts. See [Configuration upgrades](../operations/configuration-upgrades.md).
