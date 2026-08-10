---
title: Types de mémoire
sidebar_position: 2
description: La mémoire Engram est typée — Rule, Skill et Knowledge — afin que le routage et la révision restent ciblés.
---

# Types de mémoire

Chaque mémoire Engram active a un type. Le type contrôle le routage, la révision et la façon dont la mémoire est présentée aux agents.

| Type | Utilisation |
| --- | --- |
| Rule | préférence de l'utilisateur, correction, contrainte, directive toujours/jamais |
| Skill | flux de travail reproductible, liste de contrôle, procédure, guide pratique (runbook) |
| Knowledge | fait objectif du projet, décision, détail d'implémentation |

Chaque fichier de mémoire actif comporte des sections `Context`, `Content` et `Example`. Les mémoires de type Rule visent également des limites de lignes concises afin que les directives chargées restent utiles.

## Bonne mémoire

Une bonne mémoire Engram est :

- assez stable pour être utile la semaine prochaine
- assez spécifique pour être routée plus tard
- assez courte pour être chargée dans le contexte d'un agent
- assez sûre pour être partagée avec la portée prévue
- rédigée sous forme de règle, de flux de travail ou d'élément de connaissance

Une mauvaise mémoire correspond au bruit temporaire des discussions, aux secrets, aux identifiants, aux spéculations ponctuelles ou aux faits que personne n'a approuvés.

## Variantes de règles

Engram sauvegarde toujours les mémoires de règles en versions légères (light), équilibrées (balanced) et strictes (strict). Le mode variante de règle est un filtre de rendu pour la mémoire destinée à l'agent :

- **Strict** aide les modèles de niveau inférieur à rester contrôlés.
- **Light** ou **balanced** aide généralement les modèles plus puissants afin que les règles ne limitent pas leur raisonnement.

Lorsque les variantes sont désactivées, Engram affiche par défaut la formulation équilibrée de la règle. Ajustez avec :

```bash
engram set-rule-variant strict|balanced|light|off
```

## Sortie destinée aux agents (`--full`)

Lorsque `engram load "<task>"` est exécuté, la sortie est allégée pour les agents d'IA :

| Aspect | Humain (`engram load`) | Agent (`--full`) |
| --- | --- | --- |
| Frontmatter | Tous les champs (id, type, tags, confidence, scope, author, created, updated, depends_on, etc.) | Uniquement `id`, `type`, `tags`, `confidence`, `depends_on` |
| Corps de la règle | Section complète `## Rule Variants` avec les trois variantes | Une variante sélectionnée sous `## Rule variants (1/3 based on current: <active>)` |
| Contenu hors règle | Section complète `## Content` | Même contenu, titre inchangé |

L'outil MCP `engram_load` et les hooks SessionStart utilisent par défaut `--full` (désactivation via `full: true` sur l'outil MCP). Les adaptateurs de skillset codent en dur `--full` dans leurs instructions générées.

## Étapes suivantes

- [Mémoire de l'espace de travail vs mémoire globale](scopes.md)
- [Chemin de lecture et routage](read-path.md)

<!-- evidence-foundation:v3:start -->
## Mémoire étayée par des preuves

New files use `schema_version: 3`. Rule and skill memories default to `authority: instruction`; knowledge defaults to `authority: reference`. `revision` starts at 1 and increments on updates. Trace IDs belong in `evidence_refs`, while session or source identities belong in `derived_from`. Legacy v1 (`Context` + `Content` + `Example`) and v2 (`Content`, optional `Origin`) remain readable. Traces live in `.agents/.engram/traces/` with `traces/<trace-id>.jsonl` files recording `engram observe --file` and `save-session --file` provenance, `trust_level`, `sensitivity`, and `retention`.
Frontmatter contains `authority` and `evidence_refs`.
<!-- evidence-foundation:v3:end -->

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
