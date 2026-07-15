---
title: profiles / workspaces / config
sidebar_position: 5
description: Gérer les profils, les cibles d'enregistrement, les limites de chargement, les modes de lecture/preuve, les rôles et la configuration d'exécution.
---

# profiles / workspaces / config

Gérer les profils, les cibles d'enregistrement, les limites de chargement, les modes de lecture/preuve, les rôles et la configuration d'exécution.

## profile

```bash
engram profile status
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

L'ordre de résolution du profil est le `--profile` explicite ou `ENGRAM_PROFILE`, puis le `default_profile` de l'espace de travail, puis le profil de l'utilisateur actif. Si l'espace de travail `W` est épinglé sur le profil `B` alors que le profil par défaut de l'utilisateur reste le profil `A`, chaque chargement normal, chargement MCP et injection de hook d'agent pour `W` lit la mémoire globale du profil `B` et jamais celle du profil `A`. Un profil explicite différent de la valeur par défaut de l'espace de travail utilise la mémoire globale de ce profil et désactive la mémoire de l'espace de travail pour cette commande.

## set-save-target

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

## set-load-limit

```bash
engram set-load-limit 1..32
engram set-load-limit status
engram set-load-limit reset
```

## set-read

```bash
engram set-read startup|auto|always|manual|off
engram set-read status
```

## set-proof

```bash
engram set-proof off|compact
engram set-proof status
```

## set-role

```bash
engram set-role frontend
engram set-role backend security
engram set-role
```

Lorsque `engram set-role ...` ou `engram set-rule-variant ...` réussit, la CLI renvoie une ligne `Agent action:`. Les adaptateurs slash et les hôtes MCP compatibles avec Engram doivent immédiatement réexécuter `engram load "<current task/request>"`.

## set-rule-variant

```bash
engram set-rule-variant strict|balanced|light|off
```

## config

```bash
engram config view
engram config set <key> <value>
```

### Référence des paramètres clés

| Clé | Description | Par défaut | Plage / Options |
| --- | --- | --- | --- |
| `memory.rule_line_target` | Nombre de lignes recommandé pour les mémoires de règles | `70` | `50` à `200` |
| `memory.rule_line_hard_limit` | Nombre de lignes maximal autorisé pour les mémoires de règles | `100` | `50` à `200` |
| `load.limit` | Nombre maximum de mémoires renvoyées par un chargement normal | `8` | `1` à `32` |
| `rule_variants.enabled` | Activer ou désactiver la génération de variantes de règles | `true` | `true`, `false` |
| `rule_variants.active` | Mode de variante de règle active | `balanced` | `light`, `balanced`, `strict` |
| `graph.enabled` | Activer ou désactiver le routage basé sur le graphe | `true` | `true`, `false` |
| `graph.max_related` | Nombre maximum de mémoires associées à récupérer du graphe | `8` | `1` à `20` |
| `graph.min_related_score` | Score de similarité minimal pour ajouter des arêtes de graphe | `0.3` | `0.0` à `1.0` |
| `vector.enabled` | Activer ou désactiver la recherche vectorielle de secours | `true` | `true`, `false` |
| `live_sync.enabled` | Synchroniser les fichiers de contexte d'agent générés lors de l'enregistrement | `true` | `true`, `false` |
| `global_git.enabled` | Activer l'automatisation de la synchronisation du dépôt Git global | `false` | `true`, `false` |
| `global_git.remote` | Nom du dépôt distant Git pour la synchronisation globale | `origin` | Chaîne |
| `global_git.branch` | Nom de la branche Git pour la synchronisation globale | `main` | Chaîne |

Ces paramètres sont également gérables visuellement sous l'onglet **Construct** dans `engram entry`.

## Étapes suivantes

- [verify / repair / quality-check](verify-repair-quality.md)
- [Interface Web d'Entry : onglet Construct](../entry/construct.md)
