---
title: Profiles and scope resolution
sidebar_position: 4
description: Profiles isolate global memory roots for company, team, and personal contexts.
---

# Profiles and scope resolution

Profiles isolate global memory roots for company, team, and personal contexts. They keep client, company, and personal memory from leaking across boundaries.

## Create and switch profiles

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

## Resolution order

Profile resolution order is:

1. Explicit `--profile` or `ENGRAM_PROFILE`
2. The workspace `default_profile`
3. The active user profile

If workspace `W` is pinned to profile `B` while the user default remains profile `A`, every normal load, MCP load, and agent-hook injection for `W` reads profile `B` global memory and never profile `A`. An explicit profile different from the workspace default uses that profile's global memory and disables workspace memory for that command.

## When to use profiles

- Personal memory that should never reach a client repo
- Company memory that should never reach a personal repo
- Client-isolated memory for consultants working across engagements
- Team-shared memory that should not bleed into individual experiments

## SQLite config DB fallback

Engram's SQLite config DB is an optimization for workspace/profile management. If the DB cannot be opened or initialized, normal read/write commands fall back to JSON config snapshots. DB-specific commands report SQLite as unavailable instead of blocking normal memory use.

## Next steps

- [Workspace vs global memory](scopes.md)
- [Write path and approval](write-path.md)
