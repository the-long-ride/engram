---
title: Core tab
sidebar_position: 7
description: Review duplicate and conflicting memories with scope and type filters.
---

# Core tab

The Core tab reviews duplicate and conflicting memories. It is the metacognition workspace inside the Entry panel.

## Scope chips: profile / global / workspace

Filter duplicate/conflict analysis by memory source. Audit one scope or compare cross-scope duplicates. Keep at least one scope selected.

## Type chips: rule / skill / workflow / knowledge

Filter duplicate candidates by memory type. Focus cleanup on rules first or knowledge facts first. Document type meanings inline so users understand when duplicates are harmless.

## Include semantic candidates

Adds semantic duplicate search, not just exact/lexical matches. Use when cleaning mature memory stores; expect more false positives.

## Copy prompt

Copies an `/engram` prompt for a stronger agent or model to resolve duplicates. Use for human-guided cleanup and review. Remind users to review generated changes through approval gates.

## Preview

Shows the prompt before copying. Encourage preview for risky cleanup operations.

## CLI equivalent

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
engram metacognize --workspace --force
```

## Next steps

- [Memories tab](memories.md)
- [CLI: verify / repair / quality-check](../cli/verify-repair-quality.md)

