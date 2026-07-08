---
title: load / search / graph
sidebar_position: 2
description: Commandes de lecture — charger la mémoire routée, rechercher dans le coffre-fort et inspecter le routage du graphe.
---

# load / search / graph

Les commandes de lecture chargent la mémoire routée, recherchent dans le coffre-fort et inspectent le routage du graphe.

## load

```bash
engram load "<task>"
engram load --for-agents "<task>"
engram load --dry-run "<task>"
engram load --all "<task>"
```

`load` commence par ancrer le routage sur des termes de requête significatifs, en ignorant les mots de mémoire génériques comme `rule`, `knowledge` et les mots vides (stopwords) courants. Il affine ensuite le vivier de candidats plus large en un dossier de contexte compact. Une exécution normale de load signale les nombres de mémoires sélectionnées et totales associées, comme `loaded 8 memory files / 14 total related memories`.

- `--for-agents` — route compacte destinée aux agents (uniquement `id`, `type`, `tags`, `confidence`, `depends_on` dans le frontmatter ; une variante de règle sélectionnée)
- `--dry-run` — affiche le nombre de candidats, les balises de réduction et les raisons de correspondance sans imprimer le contenu
- `--all` — renvoie toutes les correspondances routées visibles au lieu de la limite compacte

`workflow` et `workflows` pointent toujours vers des mémoires de compétences, mais les mots de type générique ne créent pas une correspondance large à eux seuls.

## search

```bash
engram search "<topic>"
engram search --semantic "<topic>"
```

La recherche par défaut est la recherche lexicale déterministe. `search --semantic` ajoute une similarité locale déterministe, et non une recherche sémantique basée sur les embeddings.

## graph

```bash
engram graph "<topic>"
engram graph --rebuild
```

Inspecter le routage du graphe. Exécutez `engram graph --rebuild` après des modifications manuelles. Le graphe signale les couches de dépendance, et `engram load` extrait les prérequis routés dans le même dossier de contexte compact avant les mémoires plus profondes.

Les arêtes associées du graphe et les résultats vectoriels ne peuvent pas charger de mémoires non liées à eux seuls ; ils aident seulement à reclasser ou à étendre les mémoires qui chevauchent déjà des termes de requête significatifs. Les prérequis explicites de `depends_on` peuvent toujours être chargés sans leur propre chevauchement de mots-clés.

## Couches de dépendance (Dependency layers)

```yaml
depends_on: [release-foundation]
level: advanced
```

Utilisez le frontmatter `depends_on` lorsqu'une mémoire doit s'appuyer sur une autre mémoire au lieu de la répéter.

## Étapes suivantes

- [save / save-session / observe](save-session.md)
- [Concepts : chemin de lecture et routage](../concepts/read-path.md)
