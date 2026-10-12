---
title: Référence complète des champs
sidebar_position: 10
description: Référence consultable de chaque champ et contrôle de l’interface web Entry.
---

# Référence complète des champs {#complete-field-reference}

Cette page est la référence canonique, destinée aux utilisateurs, de chaque champ et contrôle de l’interface web Entry.

## Comment lire cette référence {#how-to-read-this-reference}

Chaque champ indique :

- **Clé de configuration** — la clé utilisée dans les fichiers de configuration et la CLI
- **Contrôle** — le type de saisie
- **Par défaut** — la valeur par défaut sûre
- **Risque** — `normal`, `caution` ou `risky`
- **Notes** — ce que fait le champ et quand le modifier

## Core {#core}

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| <span id="enabled"></span>`enabled` | bascule | `true` | risky | Interrupteur général. Le désactiver arrête le comportement d’Engram. |
| <span id="scope"></span>`scope` | sélection | `both` | risky | Cible d’enregistrement : `workspace`, `global`, `both`. |
| <span id="update"></span>`update` | sélection | `auto` | normal | Vérification silencieuse des mises à niveau du paquet : `auto`, `manual`, `off`. |
| <span id="read"></span>`read` | sélection | `auto` | normal | Moment où les hooks injectent la mémoire : `auto`, `startup`, `always`, `manual`, `off`. |
| <span id="proof"></span>`proof` | sélection | `off` | normal | Ligne de preuve des hooks : `off`, `compact`. |
| <span id="global-path"></span>`global_path` | texte | vide | risky | Chemin du système de fichiers pour la mémoire globale. |
| <span id="default-profile"></span>`default_profile` | sélection | vide | risky | Profil utilisé lorsqu’aucun n’est défini explicitement. |
| <span id="roles"></span>`roles` | rôles | vide | normal | Noms de rôles séparés par des virgules pour le routage. |

## Ignore Rules {#ignore-rules}

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| <span id="ignore-source"></span>`ignore.source` | sélection | `engramignore` | normal | Sources des règles d’analyse : `engramignore`, `gitignore`, `both`, `off`. |
| <span id="ignore-gitignore-path"></span>`ignore.gitignore_path` | texte | `.gitignore` | normal | Chemin du fichier d’ignorance Git. |
| <span id="ignore-engramignore-path"></span>`ignore.engramignore_path` | texte | `.engramignore` | normal | Chemin du fichier d’ignorance Engram. |
| <span id="ignore-global-engramignore"></span>`ignore.global_engramignore` | bascule | `true` | normal | Applique les règles d’ignorance globales lorsqu’elles sont configurées. |
| <span id="ignore-also-ignore"></span>`ignore.also_ignore` | liste | `*.secret`, `private/**` | normal | Motifs glob supplémentaires séparés par des virgules. |
| <span id="ignore-global-patterns"></span>`ignore.global_patterns` | zone de texte | vide | normal | Un glob global par ligne ; inject synchronise un bloc géré dans le workspace. |

## Load Routing {#load-routing}

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| <span id="load-limit"></span>`load.limit` | nombre 1–32 | `8` | normal | Nombre maximal de mémoires renvoyées par un chargement normal. |
| <span id="load-working-ttl-days"></span>`load.working_ttl_days` | nombre 1–365 | `14` | normal | Nombre de jours pendant lesquels une mémoire d’objectif de tâche reste dans le niveau de travail. |

## Memory Limits {#memory-limits}

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| <span id="memory-rule-line-target"></span>`memory.rule_line_target` | nombre 50–200, pas de 10 | `70` | normal | Nombre de lignes recommandé pour les règles. |
| <span id="memory-rule-line-hard-limit"></span>`memory.rule_line_hard_limit` | nombre 50–200, pas de 10 | `100` | risky | Nombre maximal strict de lignes pour les règles. |
| <span id="memory-include-author-email"></span>`memory.include_author_email` | bascule | `false` | risky | Écrit `author_email` dans le frontmatter des nouvelles mémoires (`author_name` est toujours écrit). |

## Hooks {#hooks}

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| <span id="hooks-path-rules"></span>`hooks.path_rules` | sélection | `native` | normal | `native` : Claude et Cursor chargent les mémoires `applies_to` depuis des fichiers de règles générés et Claude enregistre `InstructionsLoaded`. `hook` : conserve le hook Claude `PreToolUse` et supprime les fichiers de règles Claude. |

## Graph {#graph}

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| <span id="graph-enabled"></span>`graph.enabled` | bascule | `true` | normal | Active le routage par dépendances/relations. |
| <span id="graph-max-related"></span>`graph.max_related` | nombre 1–20 | `4` | normal | Limite les mémoires apparentées issues des arêtes du graphe. |
| <span id="graph-min-related-score"></span>`graph.min_related_score` | nombre 0–1, pas de 0.01 | `0.22` | normal | Score de similarité minimal pour les arêtes liées. |

## Vector Search {#vector-search}

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| <span id="vector-enabled"></span>`vector.enabled` | bascule | `false` | normal | Expérimental : active un routage vectoriel local facultatif par vecteurs de hachage (pas des embeddings sémantiques). Désactivé par défaut. |
| <span id="vector-provider"></span>`vector.provider` | sélection | `sqlite-vec` | normal | Le seul fournisseur vectoriel local pris en charge. |
| <span id="vector-auto-threshold"></span>`vector.auto_threshold` | nombre 10–1000 | `100` | normal | Nombre de mémoires à partir duquel la recherche vectorielle s’active. |
| <span id="vector-candidate-pool"></span>`vector.candidate_pool` | nombre 8–100 | `24` | normal | Candidats considérés avant le reclassement. |
| <span id="vector-dimensions"></span>`vector.dimensions` | nombre 16–512 | `64` | normal | Dimensions d’embedding ; reconstruire après modification. |

## Rule Variants {#rule-variants}

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| <span id="rule-variants-enabled"></span>`rule_variants.enabled` | bascule | `false` | normal | Rend les formulations light et strict dérivées du Content de chaque règle (désactivé, il rend balanced). |
| <span id="rule-variants-active"></span>`rule_variants.active` | sélection | `balanced` | normal | Variante active : `light`, `balanced`, `strict`. |

## Live Sync {#live-sync}

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| <span id="live-sync-enabled"></span>`live_sync.enabled` | bascule | `false` | normal | Synchronise les fichiers de contexte d’agent générés à l’enregistrement. |
| <span id="live-sync-targets"></span>`live_sync.targets` | liste | `agents-md`, `claude-md`, `cursor-rules` | normal | Cibles de contexte générées actualisées par la synchronisation en direct. |

## Global Git {#global-git}

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| <span id="global-git-enabled"></span>`global_git.enabled` | bascule | `true` | risky | Active le comportement Git pour la mémoire globale. |
| <span id="global-git-remote"></span>`global_git.remote` | texte | `origin` | risky | Nom du dépôt distant Git ; sans espace. |
| <span id="global-git-remote-url"></span>`global_git.remote_url` | texte | vide | risky | URL du dépôt distant partagé de la mémoire globale. |
| <span id="global-git-branch"></span>`global_git.branch` | texte | `main` | risky | Branche cible de la synchronisation. |
| <span id="global-git-auto-sync"></span>`global_git.auto_sync` | bascule | `true` | risky | Comportement de pull/push automatique. |
| <span id="global-git-auto-resolve"></span>`global_git.auto_resolve` | bascule | `true` | risky | Gestion automatique des conflits ; relisez les diffs. |

## Pattern Mining {#pattern-mining}

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| <span id="pattern-mining-enabled"></span>`pattern_mining.enabled` | bascule | `false` | normal | Extraction expérimentale de motifs récurrents. |
| <span id="pattern-mining-threshold"></span>`pattern_mining.threshold` | nombre 1–20 | `3` | normal | Répétitions avant qu’un motif compte. |
| <span id="pattern-mining-lookback-sessions"></span>`pattern_mining.lookback_sessions` | nombre 1–100 | `20` | normal | Sessions récentes à inspecter. |

## PR Workflow {#pr-workflow}

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| <span id="pr-workflow-enabled"></span>`pr_workflow.enabled` | bascule | `false` | risky | Flux de PR d’équipe expérimental. |
| <span id="pr-workflow-provider"></span>`pr_workflow.provider` | texte | vide | risky | Identifiant du fournisseur d’un flux d’équipe configuré. |
| <span id="pr-workflow-repo"></span>`pr_workflow.repo` | texte | vide | risky | Identifiant du dépôt d’un flux d’équipe configuré. |
| <span id="pr-workflow-target-branch"></span>`pr_workflow.target_branch` | texte | `main` | risky | Branche recevant les PR de mémoire. |

## Encryption {#encryption}

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| <span id="encryption-enabled"></span>`encryption.enabled` | bascule | `false` | risky | Mode de chiffrement futur/avancé. |
| <span id="encryption-scope"></span>`encryption.scope` | sélection | `global` | risky | Portée : `workspace`, `global`. |
| <span id="encryption-key-source"></span>`encryption.key_source` | sélection | `portable-file` | risky | Stratégie de source de clé ; risque de perte de sauvegarde. |

<!-- evidence-foundation:v3:start -->
## Mémoire étayée par des preuves {#evidence-backed-memory}

| Champ | Signification |
| --- | --- |
| `schema_version` | `3` pour les mémoires créées ou mises à jour récemment ; les anciens formats v1/v2 restent lisibles. |
| `authority` | `instruction` pour les règles/skills, `reference` pour les connaissances. Les enregistrements de trace utilisent `authority: evidence`. |
| `evidence_refs` | Identifiants de trace immuables `tr_...` qui étayent la mémoire. |
| `derived_from` | Identifiants de session ou de source dont la mémoire a été distillée. |
| `revision` | Entier positif incrémenté lorsqu’une mémoire existante est mise à jour. |
| `supersedes` / `superseded_by` | Relations de remplacement explicites. |
| `valid_from` / `valid_until` | Plage de temps pendant laquelle la mémoire est valide ; `valid_until` peut rester ouvert. |
| `last_confirmed` | Date à laquelle la mémoire a été confirmée pour la dernière fois. |
<!-- evidence-foundation:v3:end -->

## Contrôles hors configuration {#non-config-controls}

Consultez les pages par onglet pour les contrôles hors configuration :

- [Onglet Construct](construct.md)
- [Onglet Memories](memories.md)
- [Onglet Review](review.md)
- [Onglet Core](core.md)
- [Onglet Connections](connections.md)

La gestion des profils et des workspaces est disponible dans l’onglet Construct et via `engram profile` et `engram workspace`. Voir [Profils et résolution de portée](../concepts/profiles.md).

## Étapes suivantes {#next-steps}

- [Onglet Construct](construct.md)
- [Consignes de rédaction des champs](field-authoring-guidelines.md)


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


<!-- configuration-upgrade-inventory -->
## Inventaire des mises à niveau de configuration {#configuration-upgrade-inventory}

Après une mise à jour du paquet, exécutez `engram upgrade --latest --plan` avant `engram upgrade --latest`. L’inventaire partagé analyse les mémoires, instructions, skillsets, configurations, hooks et plugins gérés par Engram, dans l’espace de travail et au niveau global. Les octets rédigés par l’utilisateur sont préservés ; les fichiers mixtes ambigus sont signalés comme conflits. Voir [Mises à niveau de configuration](../operations/configuration-upgrades.md).
