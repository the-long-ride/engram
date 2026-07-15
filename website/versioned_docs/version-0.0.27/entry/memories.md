---
title: Memories tab
sidebar_position: 8
description: Inspect the memory graph, preview memories, edit, and archive.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Memories tab

The Memories tab inspects the memory graph and performs memory maintenance actions.

## Scope chips

Filter the graph by memory source. Compare workspace vs global memory. Start with the current workspace only when the graph feels noisy.

## Type chips

Filter the graph by memory type. Inspect rules, skills, or knowledge separately.

## Semantic links toggle

Shows semantic graph edges. Turn off when the graph is visually noisy.

## Refresh / rebuild

Reloads or rebuilds graph data. Use after edits, imports, archive actions, or config changes.

## Memory preview

Reads selected memory content. Useful to audit what the agent will receive.

<RiskCallout level="caution">
Sensitive local content may be visible in the browser. Treat the panel as open while previewing.
</RiskCallout>

## Edit memory

Opens the file in an editor and copies the path. Use for manual correction or review. The source of truth is the Markdown file.

## Archive memory

Removes memory from active routing while preserving it under `archive/`. Use archive, not delete, for auditability.

<RiskCallout level="caution">
Archiving changes routing immediately. Use archive, not manual deletion, so history is preserved.
</RiskCallout>

## CLI equivalent

```bash
engram graph "<topic>"
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

## Next steps

- [Core tab](core.md)
- [Runtime tab](runtime.md)
