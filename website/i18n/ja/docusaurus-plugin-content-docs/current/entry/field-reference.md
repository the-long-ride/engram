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

## Core {#core}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="enabled"></span>`enabled` | toggle | `true` | risky | Master switch. Disabling stops Engram behavior. |
| <span id="scope"></span>`scope` | select | `both` | risky | Save target: `workspace`, `global`, `both`. |
| <span id="update"></span>`update` | select | `auto` | normal | Quiet package upgrade check: `auto`, `manual`, `off`. |
| <span id="read"></span>`read` | select | `auto` | normal | When hooks inject memory: `auto`, `startup`, `always`, `manual`, `off`. |
| <span id="proof"></span>`proof` | select | `off` | normal | Hook proof line: `off`, `compact`. |
| <span id="global-path"></span>`global_path` | text | empty | risky | Filesystem path for global memory. |
| <span id="default-profile"></span>`default_profile` | select | empty | risky | Profile used when none is explicitly set. |
| <span id="roles"></span>`roles` | roles | empty | normal | Comma-separated role names for routing. |

## Ignore Rules {#ignore-rules}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="ignore-source"></span>`ignore.source` | select | `engramignore` | normal | Scan-rule sources: `engramignore`, `gitignore`, `both`, `off`. |
| <span id="ignore-gitignore-path"></span>`ignore.gitignore_path` | text | `.gitignore` | normal | Git ignore file path. |
| <span id="ignore-engramignore-path"></span>`ignore.engramignore_path` | text | `.engramignore` | normal | Engram ignore file path. |
| <span id="ignore-global-engramignore"></span>`ignore.global_engramignore` | toggle | `true` | normal | Applies global ignore rules when configured. |
| <span id="ignore-also-ignore"></span>`ignore.also_ignore` | list | `*.secret`, `private/**` | normal | Extra comma-separated glob patterns. |
| <span id="ignore-global-patterns"></span>`ignore.global_patterns` | textarea | empty | normal | One global glob per line; inject syncs a managed workspace block. |

## Load Routing {#load-routing}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="load-limit"></span>`load.limit` | number 1–32 | `8` | normal | Max memories returned by normal load. |

## Memory Limits {#memory-limits}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="memory-rule-line-target"></span>`memory.rule_line_target` | number 50–200, step 10 | `70` | normal | Recommended line count for rules. |
| <span id="memory-rule-line-hard-limit"></span>`memory.rule_line_hard_limit` | number 50–200, step 10 | `100` | risky | Hard max line count for rules. |

## Graph {#graph}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="graph-enabled"></span>`graph.enabled` | toggle | `true` | normal | Enables dependency/relationship routing. |
| <span id="graph-max-related"></span>`graph.max_related` | number 1–20 | `4` | normal | Limits related memories from graph edges. |
| <span id="graph-min-related-score"></span>`graph.min_related_score` | number 0–1, step 0.01 | `0.22` | normal | Min similarity score for related edges. |

## Vector Search {#vector-search}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="vector-enabled"></span>`vector.enabled` | toggle | `true` | normal | Enables optional local vector routing. |
| <span id="vector-provider"></span>`vector.provider` | select | `sqlite-vec` | normal | The only supported local vector provider. |
| <span id="vector-auto-threshold"></span>`vector.auto_threshold` | number 10–1000 | `100` | normal | Memory count where vector search activates. |
| <span id="vector-candidate-pool"></span>`vector.candidate_pool` | number 8–100 | `24` | normal | Candidates considered before reranking. |
| <span id="vector-dimensions"></span>`vector.dimensions` | number 16–512 | `64` | normal | Embedding dimensions; rebuild after change. |

## Rule Variants {#rule-variants}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="rule-variants-enabled"></span>`rule_variants.enabled` | toggle | `false` | normal | Enables role/strictness variants. |
| <span id="rule-variants-active"></span>`rule_variants.active` | select | `balanced` | normal | Active variant: `light`, `balanced`, `strict`. |

## Live Sync {#live-sync}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="live-sync-enabled"></span>`live_sync.enabled` | toggle | `false` | normal | Sync generated agent context files on save. |
| <span id="live-sync-targets"></span>`live_sync.targets` | list | `agents-md`, `claude-md`, `cursorrules` | normal | Generated context targets refreshed by live sync. |

## Global Git {#global-git}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="global-git-enabled"></span>`global_git.enabled` | toggle | `true` | risky | Enables Git behavior for global memory. |
| <span id="global-git-remote"></span>`global_git.remote` | text | `origin` | risky | Git remote name; no whitespace. |
| <span id="global-git-remote-url"></span>`global_git.remote_url` | text | empty | risky | Shared global memory remote URL. |
| <span id="global-git-branch"></span>`global_git.branch` | text | `main` | risky | Target branch for sync. |
| <span id="global-git-auto-sync"></span>`global_git.auto_sync` | toggle | `true` | risky | Auto pull/push behavior. |
| <span id="global-git-auto-resolve"></span>`global_git.auto_resolve` | toggle | `true` | risky | Auto conflict handling; review diffs. |

## Pattern Mining {#pattern-mining}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="pattern-mining-enabled"></span>`pattern_mining.enabled` | toggle | `false` | normal | Experimental recurring-pattern extraction. |
| <span id="pattern-mining-threshold"></span>`pattern_mining.threshold` | number 1–20 | `3` | normal | Repetitions before a pattern matters. |
| <span id="pattern-mining-lookback-sessions"></span>`pattern_mining.lookback_sessions` | number 1–100 | `20` | normal | Recent sessions to inspect. |

## PR Workflow {#pr-workflow}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="pr-workflow-enabled"></span>`pr_workflow.enabled` | toggle | `false` | risky | Experimental team PR workflow. |
| <span id="pr-workflow-provider"></span>`pr_workflow.provider` | text | empty | risky | Provider identifier for configured team workflow. |
| <span id="pr-workflow-repo"></span>`pr_workflow.repo` | text | empty | risky | Repository identifier for configured team workflow. |
| <span id="pr-workflow-target-branch"></span>`pr_workflow.target_branch` | text | `main` | risky | Branch receiving memory PRs. |

## Encryption {#encryption}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="encryption-enabled"></span>`encryption.enabled` | toggle | `false` | risky | Future/advanced encryption mode. |
| <span id="encryption-scope"></span>`encryption.scope` | select | `global` | risky | Scope: `workspace`, `global`. |
| <span id="encryption-key-source"></span>`encryption.key_source` | select | `portable-file` | risky | Key source strategy; backup loss risk. |

## Non-config controls

See the per-tab pages for non-config controls:

- [Construct tab](construct.md)
- [Memories tab](memories.md)
- [Review tab](review.md)
- [Maintain tab](core.md)
- [Connections tab](connections.md)

Profile and workspace management are available in the Construct tab and through `engram profile` and `engram workspace`. See [Profiles and scope resolution](../concepts/profiles.md).

## Next steps

- [Construct tab](construct.md)
- [Field authoring guidelines](field-authoring-guidelines.md)
