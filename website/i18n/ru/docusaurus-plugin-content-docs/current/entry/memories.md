---
title: Memories tab
sidebar_position: 6
description: Inspect the memory graph, preview memories, edit, and archive.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Memories tab

The Memories tab inspects active memory, explores its graph, and performs maintenance actions.

## Search

Use the search field to match text anywhere in each Markdown memory file. The search is case-insensitive and works together with the scope and type filters.

The search mode menu has two options:

- **Text matches only** shows memories whose file content or metadata directly matches the query.
- **Text matches + related memories** also shows connected dependency, duplicate, and semantic memories.

Clear the field to restore the full graph for the selected filters.

## Scope chips {#scope-chips}

Filter the graph by memory source. Compare workspace vs global memory. Start with the current workspace only when the graph feels noisy.

## Type chips {#type-chips}

Filter the graph by memory type. Inspect rules, skills, or knowledge separately.

## Semantic links toggle {#semantic-links-toggle}

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

<!-- evidence-foundation:v3:start -->
## Evidence-backed memory

The detail panel mirrors CLI/index metadata. It shows `authority`, `revision`, `evidence_refs`, `derived_from`, `supersedes`, `superseded_by`, `valid_from`, `valid_until`, and `last_confirmed` when present. These fields explain why a memory exists and which immutable trace supports it; the Web UI does not turn evidence into an instruction.
<!-- evidence-foundation:v3:end -->

## CLI equivalent

```bash
engram graph "<topic>"
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

## Next steps

- [Maintain tab](core.md)
- [CLI: verify / repair / quality-check](../cli/verify-repair-quality.md)
