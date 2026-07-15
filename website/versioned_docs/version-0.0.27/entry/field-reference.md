---
title: Complete field reference
sidebar_position: 10
description: Searchable reference for every Entry Web UI input and control.
---

# Complete field reference

This page is the canonical end-user field reference for every Entry Web UI input and control.

## How to read this reference

Each field lists:

- **Config key** — the key used in config files and the CLI
- **Control** — the input type
- **Default** — the safe default value
- **Risk** — `normal`, `caution`, or `risky`
- **Notes** — what the field does and when to change it

## Core

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| `enabled` | toggle | `true` | risky | Master switch. Disabling stops Engram behavior. |
| `scope` | select | `both` | risky | Save target: `workspace`, `global`, `both`. |
| `read` | select | `auto` | normal | When hooks inject memory: `auto`, `startup`, `always`, `manual`, `off`. |
| `proof` | select | `off` | normal | Hook proof line: `off`, `compact`. |
| `global_path` | text | empty | risky | Filesystem path for global memory. |
| `default_profile` | select | empty | risky | Profile used when none is explicitly set. |
| `roles` | roles | empty | normal | Comma-separated role names for routing. |
| `theme` | select | `dark` | hidden | Internal/hidden. Not user-facing. |

## Load Routing

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| `load.limit` | number 1–32 | `8` | normal | Max memories returned by normal load. |

## Memory Limits

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| `memory.rule_line_target` | number 50–200, step 10 | `70` | normal | Recommended line count for rules. |
| `memory.rule_line_hard_limit` | number 50–200, step 10 | `100` | risky | Hard max line count for rules. |

## Graph

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| `graph.enabled` | toggle | `true` | normal | Enables dependency/relationship routing. |
| `graph.max_related` | number 1–20 | `4` | normal | Limits related memories from graph edges. |
| `graph.min_related_score` | number 0–1, step 0.01 | `0.22` | normal | Min similarity score for related edges. |

## Vector Search

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| `vector.enabled` | toggle | `true` | normal | Enables optional local vector routing. |
| `vector.auto_threshold` | number 10–1000 | `100` | normal | Memory count where vector search activates. |
| `vector.candidate_pool` | number 8–100 | `24` | normal | Candidates considered before reranking. |
| `vector.dimensions` | number 16–512 | `64` | normal | Embedding dimensions; rebuild after change. |

## Rule Variants

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| `rule_variants.enabled` | toggle | `false` | normal | Enables role/strictness variants. |
| `rule_variants.active` | select | `balanced` | normal | Active variant: `light`, `balanced`, `strict`. |

## Live Sync

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| `live_sync.enabled` | toggle | `false` | normal | Sync generated agent context files on save. |

## Global Git

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| `global_git.enabled` | toggle | `true` | risky | Enables Git behavior for global memory. |
| `global_git.remote` | text | `origin` | risky | Git remote name; no whitespace. |
| `global_git.remote_url` | text | empty | risky | Shared global memory remote URL. |
| `global_git.branch` | text | `main` | risky | Target branch for sync. |
| `global_git.auto_sync` | toggle | `true` | risky | Auto pull/push behavior. |
| `global_git.auto_resolve` | toggle | `true` | risky | Auto conflict handling; review diffs. |

## Pattern Mining

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| `pattern_mining.enabled` | toggle | `false` | normal | Experimental recurring-pattern extraction. |
| `pattern_mining.threshold` | number 1–20 | `3` | normal | Repetitions before a pattern matters. |
| `pattern_mining.lookback_sessions` | number 1–100 | `20` | normal | Recent sessions to inspect. |

## PR Workflow

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| `pr_workflow.enabled` | toggle | `false` | risky | Experimental team PR workflow. |
| `pr_workflow.target_branch` | text | `main` | risky | Branch receiving memory PRs. |

## Encryption

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| `encryption.enabled` | toggle | `false` | risky | Future/advanced encryption mode. |
| `encryption.scope` | select | `global` | risky | Scope: `workspace`, `global`. |
| `encryption.key_source` | select | `portable-file` | risky | Key source strategy; backup loss risk. |

## Non-config controls

See the per-tab pages for non-config controls:

- [Connections tab](connections.md)
- [Profiles tab](profiles.md)
- [Workspaces tab](workspaces.md)
- [Core tab](core.md)
- [Memories tab](memories.md)
- [Runtime tab](runtime.md)

## Next steps

- [Construct tab](construct.md)
- [Field authoring guidelines](field-authoring-guidelines.md)
