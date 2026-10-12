---
title: load / search / graph
sidebar_position: 2
description: Commandes de lecture — charger la mémoire routée, rechercher dans le coffre et inspecter le routage du graphe.
---

# load / search / graph

Les commandes de lecture chargent la mémoire routée, recherchent dans le coffre et inspectent le routage du graphe.

## load

```bash
engram load "<task>"
engram load --full "<task>"
engram load --dry-run "<task>"
engram load --all "<task>"
engram load --budget-tokens 800 "<task>"
engram load --disclosure full "<task>"
engram load --id <id>,<id>
engram load --exclude-keys workspace:rules/use-pnpm.md "<task>"
```

`load` ancre d’abord le routage sur des termes de requête significatifs, en ignorant les mots génériques comme `rule`, `knowledge` et les stopwords courants. Il affine ensuite l’ensemble des candidats en un paquet de contexte compact. Une charge normale indique les décomptes sélectionnés et totaux associés, comme `loaded 8 memory files / 14 total related memories`.

- `load` par défaut — route étagée orientée agent : les meilleurs résultats selon `load.expand_top` (3 par défaut) sous forme de corps complets, chaque autre résultat sélectionné sous forme de carte sur une ligne, et une indication finale `fetch: engram load --id <ids>` ; chaque en-tête de corps porte l’`authority` de la mémoire, les champs de frontmatter tels que `evidence_refs`, `## Context`, `## Example` et `## Origin` ne sont pas affichés (utilisez `--full` pour les voir), et les règles affichent une variante sélectionnée.
- `--id <id,...>` — récupère les corps complets pour les cartes ; les identifiants peuvent être séparés par des virgules, et une récupération explicite est comptabilisée dans `stats --usage`.
- `--budget-tokens <200-16000>` — plafond strict sur l’ensemble de la sortie étagée ; les corps deviennent d’abord des cartes, et ce n’est qu’ensuite que les cartes les moins bien classées sont écartées.
- `--disclosure auto|full` — `full` imprime chaque corps empaqueté au lieu du paquet étagé (aussi configurable via `load.disclosure: full`).
- `--exclude-keys <scope:file,...>` — ignore les mémoires que l’appelant détient déjà ; aucun corps ni carte n’est imprimé, et `--json` les liste sous `already_loaded`.
- `--full` — sortie héritée plus large avec frontmatter complet et toutes les variantes de règle.
- `--dry-run` — affiche le nombre de candidats, les tags d’affinement et les raisons de correspondance sans imprimer le contenu.
- `--all` — renvoie toutes les correspondances visibles au lieu de la limite compacte.

`workflow` et `workflows` continuent de router vers les mémoires de compétence, mais les mots de type générique ne créent pas à eux seuls une correspondance large.

Sous la divulgation `auto`, les listes JSON `selected` et `entries` décrivent uniquement les corps étendus ; les cartes sont signalées séparément. Configurez `load.expand_top` et `load.disclosure` dans le bloc `load` d’`engram.config.json` (voir [profils / workspaces / configuration](profiles-workspaces-config.md#load-configuration)).

## search

```bash
engram search "<topic>"
engram search --semantic "<topic>"
```

La recherche par défaut est une recherche lexicale déterministe. `search --semantic` ajoute une similarité locale déterministe, et non une recherche sémantique basée sur des embeddings. Les résultats de `search --json` contiennent un champ `score`.

## graph

```bash
engram graph "<topic>"
engram graph --rebuild
```

Inspectez le routage du graphe. Exécutez `engram graph --rebuild` après des modifications manuelles. Le graphe indique les couches de dépendance, et `engram load` extrait les prérequis routés dans le même paquet compact avant les mémoires plus profondes.

Les arêtes liées dans le graphe et les correspondances vectorielles ne chargent pas automatiquement des mémoires non liées ; elles aident seulement à reclasser ou étendre les mémoires qui correspondent déjà à des termes de requête significatifs. Les prérequis explicites `depends_on` peuvent toujours être chargés sans correspondre à leurs propres termes.

## Couches de dépendance {#dependency-layers}

```yaml
depends_on: [release-foundation]
level: advanced
```

Utilisez le frontmatter `depends_on` lorsqu’une mémoire doit s’appuyer sur une autre plutôt que de la répéter.

## Étapes suivantes {#next-steps}

- [save / save-session / observe](save-session.md)
- [Concepts : chemin de lecture et routage](../concepts/read-path.md)
