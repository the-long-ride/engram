---
title: Cline
sidebar_position: 9
description: Engram integration with Cline via workspace rules.
---

# Cline

Cline reads workspace rules from `.clinerules`.

## Install

```bash
engram link cline
```

## Files written

| File | Purpose |
| --- | --- |
| `.clinerules` | Cline-style workspace rules |

## Compact/manual fallback target

Cline is a compact/manual fallback target. Hook support is plugin-based and not aligned with Engram's file-first adapter installer in v1, so hook install is skipped and no hook config is written.

## Next steps

- [Agent Integrations overview](overview.md)
