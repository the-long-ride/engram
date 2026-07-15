---
title: Copilot
sidebar_position: 8
description: Engram integration with GitHub Copilot via repository and user custom instructions.
---

# Copilot

GitHub Copilot reads repository custom instructions from `.github/copilot-instructions.md`. For global Copilot installs, Engram appends its managed block to `~/.copilot/copilot-instructions.md`.

## Install

```bash
engram link copilot
```

## Files written

| File | Purpose |
| --- | --- |
| `.github/copilot-instructions.md` | Repository custom instructions |

## Global install

```bash
engram link --global copilot
```

Appends a managed block to `~/.copilot/copilot-instructions.md`.

## Compact/manual fallback target

Copilot is a compact/manual fallback target. It receives the full compact protocol because current hooks expose session-start context but no reliable prompt-time context injection in v1. Hook install is skipped; no hook config is written.

## Next steps

- [Agent Integrations overview](overview.md)
- [Hooks and proof lines](hooks.md)
