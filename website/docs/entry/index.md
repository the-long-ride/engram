---
title: Entry Web UI overview
sidebar_position: 1
description: The Entry Web UI is the local-only control panel for configuring Engram memory, profiles, workspaces, and agent connections.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Entry Web UI overview

The Entry Web UI is the local-only control panel for Engram. Use it to configure memory roots, link AI agents, tune routing, review duplicates, inspect the memory graph, and debug runtime config without editing JSON by hand.

## When to use it

- First-time setup of a workspace or global memory root
- Linking or unlinking AI agents without remembering CLI flags
- Tuning routing, graph, vector, and rule variant settings
- Reviewing duplicate or conflicting memories
- Inspecting the memory graph
- Debugging resolved config, paths, and Git detection

## Local-only access model

The panel runs on your machine. It is not a cloud service. Close the server when you are done for security hygiene.

<RiskCallout level="risky">
The Entry panel is local-only. Treat it as open while you are configuring memory, then close the server from the Runtime tab when finished.
</RiskCallout>

## Relationship to CLI commands

Every visible control maps to a CLI command or config key. Where a CLI equivalent exists, the field reference lists it. The CLI remains the source of truth for scripting and automation.

## Tabs at a glance

| Tab | Job |
| --- | --- |
| [Construct](construct.md) | Configure every Engram runtime field |
| [Recall](memories.md) | Search, inspect, and archive active memory |
| [Review](review.md) | Resolve findings and confirm reviewed memory writes |
| [Profiles](profiles.md) | Manage isolated global memory profiles |
| [Workspaces](workspaces.md) | Register and link project repos |
| [Core](core.md) | Review duplicate and conflicting memories |
| [Connections](connections.md) | Detect and link supported AI agents |
| [Runtime](runtime.md) | Read-only resolved config and paths |

## Next steps

- [Launching the control panel](launch.md)
- [Construct tab](construct.md)
- [Review tab](review.md)
- [Complete field reference](field-reference.md)
