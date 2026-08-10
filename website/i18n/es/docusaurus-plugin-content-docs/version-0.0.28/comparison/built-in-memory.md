---
title: Built-in agent memory
sidebar_position: 2
description: Engram treats built-in agent memory as a convenience layer, not the authority.
---

# Built-in agent memory

Built-in agent memory is convenient, but often tied to one host. It can be hard to diff, export, review, or share with another agent.

Engram treats built-in memory as a convenience layer, not the authority. The authority remains files the human owns.

| Dimension | Engram | Built-in agent memory |
| --- | --- | --- |
| Source of truth | Approved Markdown files | Vendor-owned hidden state |
| Portability | Git-native, agent-agnostic | Tied to one app or account |
| Review | Git diff and Markdown review | Hard to inspect or export |
| Best fit | teams that need ownership and auditability | quick personal recall within one host |

## Next steps

- [agentmemory](agentmemory.md)
- [Comparison overview](overview.md)
