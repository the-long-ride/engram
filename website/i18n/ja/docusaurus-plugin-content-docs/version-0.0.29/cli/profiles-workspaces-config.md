---
title: profiles / workspaces / config
sidebar_position: 5
description: Manage profiles, save targets, load limits, read/proof modes, roles, and runtime config.
---

# profiles / workspaces / config

Manage profiles, save targets, load limits, read/proof modes, roles, and runtime config.

## profile

```bash
engram profile status
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

Profile resolution order is explicit `--profile` or `ENGRAM_PROFILE`, then the workspace `default_profile`, then the active user profile. If workspace `W` is pinned to profile `B` while the user default remains profile `A`, every normal load, MCP load, and agent-hook injection for `W` reads profile `B` global memory and never profile `A`. An explicit profile different from the workspace default uses that profile's global memory and disables workspace memory for that command.

## set-save-target

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

## set-load-limit

```bash
engram set-load-limit 1..32
engram set-load-limit status
engram set-load-limit reset
```

<a id="load-configuration"></a>
## Load configuration

These keys live in the `load` block of `.agents/.engram/engram.config.json`; `engram config set` does not accept them.

| Key | Default | Meaning |
| --- | --- | --- |
| `load.disclosure` | `auto` | `auto` expands the top hits and cards the rest; `full` keeps the untiered output |
| `load.expand_top` | `3` | Bodies expanded under `auto` disclosure |
| `load.working_ttl_days` | `14` | Days an approved `OBJECTIVE: task` memory stays in the working tier (1 to 365). Also editable in the Entry Construct tab |

## set-read

```bash
engram set-read startup|auto|always|manual|off
engram set-read status
```

## set-proof

```bash
engram set-proof off|compact
engram set-proof status
```

## set-role

```bash
engram set-role frontend
engram set-role backend security
engram set-role
```

When `engram set-role ...` or `engram set-rule-variant ...` succeeds, the CLI returns an `Agent action:` line. Engram-aware slash adapters and MCP hosts should immediately rerun `engram load "<current task/request>"`.

## set-rule-variant

```bash
engram set-rule-variant strict|balanced|light|off|status
```

## config

```bash
engram config view
engram config set <key> <value>
```

### Key settings reference

| Key | Description | Default | Range / Options |
| --- | --- | --- | --- |
| `memory.rule_line_target` | Recommended line count target for rule memories | `70` | `50` to `200` |
| `memory.rule_line_hard_limit` | Maximum allowed line count for rule memories | `100` | `50` to `200` |
| `memory.include_author_email` | Write `author_email` into new memory frontmatter (`author_name` is always written) | `false` | `true`, `false` |
| `load.limit` | Max memories returned by normal load | `8` | `1` to `32` |
| `rule_variants.enabled` | Enable or disable rule variants generation | `false` | `true`, `false` |
| `rule_variants.active` | Active rule variant mode | `balanced` | `light`, `balanced`, `strict` |
| `graph.enabled` | Enable or disable graph-aware routing | `true` | `true`, `false` |
| `graph.max_related` | Max related memories to fetch from graph edges | `4` | `1` to `20` |
| `graph.min_related_score` | Min similarity score to add graph edges | `0.22` | `0.0` to `1.0` |
| `vector.enabled` | Enable or disable vector search fallback | `true` | `true`, `false` |
| `live_sync.enabled` | Sync generated agent context files on save | `false` | `true`, `false` |
| `global_git.enabled` | Enable global Git repo sync automation | `true` | `true`, `false` |
| `global_git.remote` | Git remote name for global sync | `origin` | String |
| `global_git.branch` | Git branch name for global sync | `main` | String |

These settings are also manageable visually under the **Construct** tab in `engram entry`.

## Next steps

- [verify / repair / quality-check](verify-repair-quality.md)
- [Entry Web UI: Construct tab](../entry/construct.md)


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
