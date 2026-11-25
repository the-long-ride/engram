---
title: Entry Web UI overview
sidebar_position: 1
description: The Entry Web UI is the local-only control panel for configuring Engram memory and agent connections.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Entry Web UI overview

The Entry Web UI is the local-only control panel for Engram. Use it to configure memory roots, link AI agents, tune routing, review findings, inspect the memory graph, and debug resolved config without editing JSON by hand.

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
The Entry panel is local-only. Treat it as open while you are configuring memory, then close the server from the sidebar footer when finished.
</RiskCallout>

## Relationship to CLI commands

Every visible control maps to a CLI command or config key. Where a CLI equivalent exists, the field reference lists it. The CLI remains the source of truth for scripting and automation.

## Navigation and URL routing

The Entry Web UI uses URL `#hash` routing so each tab can be bookmarked, reloaded, or navigated with browser history:

- `#config` — Construct
- `#author` — Git
- `#upgrade` — Updates
- `#recall` — Memories
- `#review` — Review
- `#maintain` — Core
- `#connect` — Connections

The sidebar includes a **Workspace** section for workspace-scoped controls and displays a pending review count badge on **Review** whenever findings, deferred candidates, or receipts await triage. On narrow viewports, the sidebar collapses into a mobile drawer that you can dismiss with the close button or by pressing `Escape`.

## Tabs at a glance

| Tab | Hash | Job |
| --- | --- | --- |
| [Construct](construct.md) | `#config` | Configure Engram runtime fields, profiles, workspaces, and runtime state |
| [Git](../operations/git-author-settings.md) | `#author` | Manage author identity and Global Git configuration |
| [Updates](../operations/configuration-upgrades.md) | `#upgrade` | Check package updates and apply configuration upgrades |
| [Memories](memories.md) | `#recall` | Search, simulate routes, inspect, promote, and archive active memory |
| [Review](review.md) | `#review` | Triage session-learning receipts, findings, and deferred memory writes |
| [Core](core.md) | `#maintain` | Review duplicate and conflicting memories |
| [Connections](connections.md) | `#connect` | Check Doctor health, detect agents, and link supported AI agents |

## Next steps

- [Launching the control panel](launch.md)
- [Construct tab](construct.md)
- [Core tab](core.md)
- [Complete field reference](field-reference.md)


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
