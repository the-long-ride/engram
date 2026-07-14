---
title: Construct tab
sidebar_position: 4
description: Configure every Engram runtime field from the Construct tab. Each field has a use case, safe default, validation, and risk warning.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Construct tab

The Construct tab exposes every Engram runtime config field, grouped exactly like the UI. Each field has a description, use cases, safe default, validation, and risk warning.

<RiskCallout level="caution">
Fields marked **risky** can disable Engram, change save targets, change Git behavior, or affect memory security. Read the warning before changing them.
</RiskCallout>

## Core group

### Enabled

**Config key:** `enabled`  
**Control:** toggle  
**Default:** `true`  
**Risk:** risky

Master switch. Disabling it stops Engram behavior entirely. Use only for temporary shutdown or testing.

### Save Target

**Config key:** `scope`  
**Control:** select — `workspace`, `global`, `both`  
**Default:** `both`  
**Risk:** risky

Controls where new approved memories are saved. Use `workspace` for repo-specific memory, `global` for personal/team memory, `both` for fresh installs that want both.

### Update Mode

**Config key:** `update`  
**Control:** select — `auto`, `manual`, `off`  
**Default:** `auto`  
**Risk:** normal

Controls the quiet one-time package upgrade check run by normal commands. Use `manual` or `off` only when upgrades are managed outside Engram.

### Read Mode

**Config key:** `read`  
**Control:** select — `auto`, `startup`, `always`, `manual`, `off`  
**Default:** `auto`  
**Risk:** normal

Controls when agent hooks inject memory context. `auto` loads on session start and reinjects only when routed context changes. `manual` and `off` reduce automation at the cost of context bloat.

### Proof Mode

**Config key:** `proof`  
**Control:** select — `off`, `compact`  
**Default:** `off`  
**Risk:** normal

Whether hooks append a compact `Engram proof:` line on each eligible turn. Useful for debugging and audit visibility.

### Global Memory Path

**Config key:** `global_path`  
**Control:** text/path  
**Default:** empty until configured  
**Risk:** risky

Filesystem path for global memory. Use a stable, user-owned folder such as `~/Documents/engram`. Avoid temp folders, synced public folders, and directories you cannot write to.

<RiskCallout level="risky">
Using a cloud-synced public folder for private memory can leak secrets. Use a private path or a private Git repo.
</RiskCallout>

**CLI equivalent:**

```bash
engram update-global-folder ~/Documents/engram
engram ugf ~/Documents/engram
```

### Default Profile

**Config key:** `default_profile`  
**Control:** select  
**Default:** empty  
**Risk:** risky

Profile used when none is explicitly set. See [Profiles and scope resolution](../concepts/profiles.md).

### Active Roles

**Config key:** `roles`  
**Control:** roles/comma input  
**Default:** empty list  
**Risk:** normal

Restricts and reranks memories by role. Use safe names matching `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$`.

## Ignore Rules group

| Field | Control | Default | Notes |
| --- | --- | --- | --- |
| `ignore.source` | select | `engramignore` | Choose `engramignore`, `gitignore`, `both`, or `off` as scan-rule sources. |
| `ignore.gitignore_path` | text | `.gitignore` | Git ignore file to use when enabled. |
| `ignore.engramignore_path` | text | `.engramignore` | Engram ignore file to use when enabled. |
| `ignore.global_engramignore` | toggle | `true` | Apply global ignore rules when global memory is configured. |
| `ignore.also_ignore` | list | `*.secret`, `private/**` | Additional comma-separated glob patterns. |

### Global Ignore Patterns

**Config key:** `ignore.global_patterns`  
**Control:** textarea, one glob pattern per line  
**Default:** empty list  
**Risk:** normal

Patterns apply to global memory reads. Every `engram inject` synchronizes them into a managed block in the workspace `.engramignore`; human-authored lines outside that block are preserved.

### Auto-save policy

The **Auto-save policy** editor writes `.agents/engram.policy.json`. It controls whether policy-approved candidates can save without an interactive prompt; normal saves remain approval-based.

Configure enablement, `review_only` or `autonomous` mode, allowed type/scope/source, confidence threshold, daily limit, rollback retention, review rule limit, recall benchmark, and required metadata. The editor currently selects one allowed value per type, scope, and source; save a JSON policy directly if you need multiple values.

## Load Routing group

### Load Limit

**Config key:** `load.limit`  
**Control:** number 1–32  
**Default:** `8`  
**Risk:** normal

Max memories returned by normal load. Lower values reduce context bloat for low-context models; higher values help deep architecture tasks.

## Memory Limits group

### Rule Line Target

**Config key:** `memory.rule_line_target`  
**Control:** number 50–200, step 10  
**Default:** `70`  
**Risk:** normal

Recommended size for rule memories. Concise rules route better than overlong policies.

### Rule Line Hard Limit

**Config key:** `memory.rule_line_hard_limit`  
**Control:** number 50–200, step 10  
**Default:** `100`  
**Risk:** risky

Hard maximum for rule memories.

<RiskCallout level="risky">
Raising this can increase context bloat and reduce routing quality. Keep rules concise.
</RiskCallout>

## Graph group

### graph.enabled

**Control:** toggle  
**Default:** `true`  
**Risk:** normal

Enables dependency/relationship routing via `depends_on`, related memories, and the graph view.

### graph.max_related

**Control:** number 1–20  
**Default:** `4`  
**Risk:** normal

Limits related memories pulled through graph signals.

### graph.min_related_score

**Control:** number 0–1, step 0.01  
**Default:** `0.22`  
**Risk:** normal

Minimum similarity score for related edges. Raise for precision, lower for recall.

## Vector Search group

### vector.provider

**Control:** select — `sqlite-vec`  
**Default:** `sqlite-vec`  
**Risk:** normal

Selects the local vector provider. `sqlite-vec` is the only supported provider.

### vector.enabled

**Control:** toggle  
**Default:** `true`  
**Risk:** normal

Enables optional local vector routing. No cloud dependency.

### vector.auto_threshold

**Control:** number 10–1000  
**Default:** `100`  
**Risk:** normal

Memory count where vector search activates. Small vaults may not need vector search.

### vector.candidate_pool

**Control:** number 8–100  
**Default:** `24`  
**Risk:** normal

How many candidates vector search considers before reranking. Higher improves recall at latency cost.

### vector.dimensions

**Control:** number 16–512  
**Default:** `64`  
**Risk:** normal

Embedding dimensions for the local vector sidecar. Changing this requires a rebuild.

## Rule Variants group

### rule_variants.enabled

**Control:** toggle  
**Default:** `false`  
**Risk:** normal

Enables role/strictness variants. Use when teams need light/balanced/strict routing.

### rule_variants.active

**Control:** select — `light`, `balanced`, `strict`  
**Default:** `balanced`  
**Risk:** normal

Controls strictness of loaded rules. `strict` helps lower-tier models; `light`/`balanced` usually suit stronger models.

## Live Sync group

### live_sync.enabled

**Control:** toggle  
**Default:** `false`  
**Risk:** normal

Syncs generated agent context files on save.

### live_sync.targets

**Control:** list  
**Default:** `agents-md`, `claude-md`, `cursorrules`

Comma-separated generated context targets refreshed when live sync runs.

## Global Git group

<RiskCallout level="risky">
All Global Git fields are risky. They control audit history and team sync behavior for global memory. Review each before enabling.
</RiskCallout>

| Field | Control | Default | Notes |
| --- | --- | --- | --- |
| `global_git.enabled` | toggle | `true` | Enables Git behavior for global memory |
| `global_git.remote` | text | `origin` | Git remote name; cannot contain whitespace |
| `global_git.remote_url` | text | empty | Shared global memory remote URL; HTTPS/SSH accepted |
| `global_git.branch` | text | `main` | Target branch for sync |
| `global_git.auto_sync` | toggle | `true` | Auto pull/push behavior |
| `global_git.auto_resolve` | toggle | `true` | Auto conflict handling — review memory diffs |

## Pattern Mining group

| Field | Control | Default | Notes |
| --- | --- | --- | --- |
| `pattern_mining.enabled` | toggle | `false` | Experimental recurring-pattern extraction |
| `pattern_mining.threshold` | number 1–20 | `3` | Repetitions before a pattern candidate matters |
| `pattern_mining.lookback_sessions` | number 1–100 | `20` | Recent sessions to inspect |

## PR Workflow group

| Field | Control | Default | Notes |
| --- | --- | --- | --- |
| `pr_workflow.enabled` | toggle | `false` | Experimental team PR workflow for memory changes |
| `pr_workflow.provider` | text | empty | Provider identifier for an already configured team workflow |
| `pr_workflow.repo` | text | empty | Repository identifier for an already configured team workflow |
| `pr_workflow.target_branch` | text | `main` | Branch receiving memory PRs |

## Encryption group

<RiskCallout level="risky">
Encryption config exists, but encrypted storage is not implemented yet. Document current limitations clearly to users.
</RiskCallout>

| Field | Control | Default | Notes |
| --- | --- | --- | --- |
| `encryption.enabled` | toggle | `false` | Future/advanced encryption mode |
| `encryption.scope` | select — `workspace`, `global` | `global` | Which scope encryption applies to |
| `encryption.key_source` | select — `portable-file` | `portable-file` | Key source strategy; backup loss risk |

## Next steps

- [Complete field reference](field-reference.md)
- [Profiles tab](profiles.md)
- [Runtime tab](runtime.md)
