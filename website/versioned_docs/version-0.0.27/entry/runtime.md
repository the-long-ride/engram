---
title: Runtime tab
sidebar_position: 9
description: Read-only resolved config and paths, plus the close-server action.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Runtime tab

The Runtime tab is the read-only resolved config and paths report. Treat it as the first troubleshooting page.

## Runtime report groups

The report groups resolved values for:

- **Profile** — active profile and resolution source
- **Memory roots** — workspace and global memory paths
- **Core config** — enabled, scope, read, proof, roles
- **Routing** — load limit, graph, vector settings
- **Graph** — enabled, max related, min score
- **Git detection** — remote, remote URL, branch, auto sync

Each output explains what Engram actually resolved, not just what was configured. Use it to debug profile, root, Git, routing, and hook behavior.

## Close server

Stops the local Entry server. Use it for security hygiene after config work.

<RiskCallout level="risky">
The panel is local-only. Close the server from the Runtime tab when you are done to avoid leaving it open.
</RiskCallout>

## CLI equivalent

```bash
engram config view
engram entry
```

## Next steps

- [Complete field reference](field-reference.md)
- [Operations troubleshooting](../operations/troubleshooting.md)
