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

## Simulateur de routage

Utilisez la barre **Simulate route** pour tester comment Engram route une requête avant qu’un agent ne la voie. L’envoi d’une requête appelle `/api/recall?simulate=true` et détaille :

- **Packed bodies** — mémoires incluses en entier dans la charge routée
- **Cards** — cartes de mémoire compactes incluses à côté des corps complets
- **Omitted candidates** — mémoires correspondantes exclues par le classement ou les limites de budget
- **Token budget** — utilisation du budget de tokens sur l’ensemble de la réponse simulée

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

## Badges Working et Noisy

Les cartes et le panneau de détails affichent des badges d’état pour mettre en évidence les mémoires nécessitant une attention particulière :

- **Working** — signale les mémoires actives stockées dans le niveau `working/` (ignoré par Git). Utilisez le bouton **Promote** (qui appelle immédiatement `POST /api/memory/promote`) pour déplacer une mémoire `working/` active vers le stockage durable sans passer par la CLI.
- **Noisy** — signale les mémoires qui correspondent fréquemment sans apporter de valeur afin que vous puissiez resserrer leurs déclencheurs, les modifier ou les archiver.

## Archiver une mémoire

Retire la mémoire du routage actif tout en la conservant sous `archive/`. Cliquer sur archiver ouvre la boîte de dialogue de confirmation **Delete memory?** (sans champ modal de motif ; enregistre par défaut `'Deleted from Memories graph view'`). Utilisez l’archivage, et non la suppression manuelle, pour préserver la traçabilité.

<RiskCallout level="caution">
Archiving changes routing immediately. Use archive, not manual deletion, so history is preserved.
</RiskCallout>

<!-- evidence-foundation:v3:start -->
## Mémoire étayée par des preuves

The detail panel mirrors CLI/index metadata. It shows `authority`, `revision`, `evidence_refs`, `derived_from`, `supersedes`, `superseded_by`, `valid_from`, `valid_until`, and `last_confirmed` when present. These fields explain why a memory exists and which immutable trace supports it; the Web UI does not turn evidence into an instruction.
<!-- evidence-foundation:v3:end -->

## CLI equivalent

```bash
engram graph "<topic>"
engram why <id> "<query>"
engram promote <id>
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

## Next steps

- [Core tab](core.md)
- [CLI: verify / repair / quality-check](../cli/verify-repair-quality.md)
