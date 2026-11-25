---
title: Changelog
sidebar_position: 5
description: Engram release history.
---

# Changelog

Engram release history lives in the repository [`CHANGELOG.md`](https://github.com/the-long-ride/engram/blob/main/CHANGELOG.md).

For the current package version, see [`package.json`](https://github.com/the-long-ride/engram/blob/main/package.json).

## Current version

The current released Engram version is `0.1.0`.

## 0.1.0 highlights

- **Retrieval and tokenization**: 3-stream BM25F (`title`, `tags`, `body`), 24 concept clusters plus corpus co-occurrence bridges when exact anchors are absent, and Unicode/Vietnamese/CJK tokenization.
- **Freshness, ordering, and startup compression**: `knowledgeFreshnessBoost` recency/working-tier scoring, `orderForAgentConsumption` attention-aware topological ordering, and `hookStartupAuto` startup card compression in `read: auto` mode.
- **Closed-loop usage telemetry**: outcome tracking in local, gitignored `usage.json` (`applied`, `corrected`, and noise decay after repeated zero-utility injections) plus `engram stats --backfill`.
- **Option A session learning and working notes**: deterministic prompt-time and transcript learning into expiring gitignored `working/` memories and staged `inbox/r-*.json` receipts (`engram review inbox|triage|apply|dismiss`), `engram working note` / `engram_note` MCP tool, and opt-in `SessionEnd` transcript queueing (`engram link claude|codex --session-end`).
- **CLI ergonomics**: `engram status` (`engram stat`), `engram why <id> ["<query>"]`, `engram help --compact`, `engram graph link <parent-id> <child-id...>`, `engram review triage`, and `engram benchmark --from-git`.
- **Entry Web UX and security**: upgraded Entry Web UI workflows and zero-vulnerability dependencies.

## Upgrade

```bash
npm install -g @the-long-ride/engram@latest
engram upgrade
```

See [Release and upgrade process](release-upgrade.md) for details.
