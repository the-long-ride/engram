---
title: profiles / workspaces / config
sidebar_position: 5
description: Gérer les profils, les cibles d’enregistrement, les limites de chargement, les modes lecture/preuve, les rôles et la configuration d’exécution.
---

# profiles / workspaces / config

Gérer les profils, les cibles d’enregistrement, les limites de chargement, les modes lecture/preuve, les rôles et la configuration d’exécution.

## profile

```bash
engram profile status
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

L’ordre de résolution du profil est : `--profile` explicite ou `ENGRAM_PROFILE`, puis le `default_profile` de l’espace de travail, puis le profil utilisateur actif. Si l’espace de travail `W` est épinglé sur le profil `B` alors que le profil par défaut de l’utilisateur reste `A`, chaque chargement normal, chargement MCP et injection de hook d’agent pour `W` lit la mémoire globale du profil `B` et jamais celle du profil `A`. Un profil explicite différent de celui de l’espace de travail utilise la mémoire globale de ce profil et désactive la mémoire de l’espace de travail pour cette commande.

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

<a id="load-configuration"></a>
## Configuration du chargement {#load-configuration}

Ces clés se trouvent dans le bloc `load` de `.agents/.engram/engram.config.json` ; `engram config set` ne les accepte pas.

| Clé | Par défaut | Signification |
| --- | --- | --- |
| `load.disclosure` | `auto` | `auto` développe les meilleurs résultats et réduit les autres à des cartes ; `full` conserve la sortie non hiérarchisée |
| `load.expand_top` | `3` | Nombre de corps développés avec la divulgation `auto` |
| `load.working_ttl_days` | `14` | Nombre de jours pendant lesquels une mémoire `OBJECTIVE: task` approuvée reste dans le niveau de travail (1 à 365). Modifiable aussi dans l’onglet Construct d’Entry |

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

Lorsque `engram set-role ...` ou `engram set-rule-variant ...` réussit, la CLI renvoie une ligne `Agent action:`. Les adaptateurs slash compatibles Engram et les hôtes MCP doivent immédiatement relancer `engram load "<current task/request>"`.

## set-rule-variant

```bash
engram set-rule-variant strict|balanced|light|off|status
```

## config

```bash
engram config view
engram config set <key> <value>
```

### Référence des principaux paramètres {#key-settings-reference}

| Clé | Description | Par défaut | Plage / options |
| --- | --- | --- | --- |
| `memory.rule_line_target` | Nombre de lignes recommandé pour les mémoires de règle | `70` | `50` à `200` |
| `memory.rule_line_hard_limit` | Nombre maximal de lignes autorisé pour les mémoires de règle | `100` | `50` à `200` |
| `memory.include_author_email` | Écrire `author_email` dans le frontmatter des nouvelles mémoires (`author_name` est toujours écrit) | `false` | `true`, `false` |
| `mcp.resource_limit` | Nombre de mémoires que `resources/list` du MCP renvoie en plus de `engram://index`, classées par usage injecté + récupéré (configuration JSON uniquement ; non définissable par `engram config set`) | `20` | `0` à `200` |
| `load.limit` | Nombre maximal de mémoires renvoyées par un chargement normal | `8` | `1` à `32` |
| `hooks.path_rules` | `native` écrit des fichiers de règles Claude et Cursor pour les mémoires `applies_to` et enregistre `InstructionsLoaded` côté Claude ; `hook` conserve le hook Claude `PreToolUse` | `native` | `native`, `hook` |
| `rule_variants.enabled` | Activer ou désactiver la génération des variantes de règle | `false` | `true`, `false` |
| `rule_variants.active` | Mode de variante de règle actif | `balanced` | `light`, `balanced`, `strict` |
| `graph.enabled` | Activer ou désactiver le routage par graphe | `true` | `true`, `false` |
| `graph.max_related` | Nombre maximal de mémoires liées récupérées via les arêtes du graphe | `4` | `1` à `20` |
| `graph.min_related_score` | Score de similarité minimal pour ajouter des arêtes au graphe | `0.22` | `0.0` à `1.0` |
| `vector.enabled` | Recherche vectorielle par hachage de secours, expérimentale (pas des embeddings sémantiques) | `false` | `true`, `false` |
| `live_sync.enabled` | Synchroniser les fichiers de contexte d’agent générés à l’enregistrement | `false` | `true`, `false` |
| `global_git.enabled` | Activer l’automatisation de synchronisation du dépôt Git global | `true` | `true`, `false` |
| `global_git.remote` | Nom du dépôt distant Git pour la synchronisation globale | `origin` | Chaîne |
| `global_git.branch` | Nom de la branche Git pour la synchronisation globale | `main` | Chaîne |

Ces paramètres sont aussi modifiables visuellement dans l’onglet **Construct** de `engram entry`.

## Étapes suivantes {#next-steps}

- [verify / repair / quality-check](verify-repair-quality.md)
- [Interface web Entry : onglet Construct](../entry/construct.md)


## Identité d’auteur Git {#git-author-identity}

Engram peut stocker un auteur global et une surcharge d’espace de travail facultative. La résolution suit l’ordre workspace, global, puis repli Git en lecture seule. Les paramètres n’affectent que les mémoires futures ; une surcharge d’espace de travail ne modifie jamais la configuration Git globale. Utilisez un plan explicite et une confirmation pour la synchronisation Git globale ou la migration des anciennes mémoires.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Lisez le [guide complet des paramètres de l’auteur Git](../operations/git-author-settings.md).
