---
title: Référence complète des champs
sidebar_position: 10
description: Référence consultable pour chaque entrée et contrôle de l'interface Entry Web UI.
---

# Référence complète des champs

Cette page est la référence canonique des champs pour l'utilisateur final pour chaque entrée et contrôle de l'interface Entry Web UI.

## Comment lire cette référence

Chaque champ répertorie :

- **Clé de configuration** — la clé utilisée dans les fichiers de configuration et la CLI
- **Contrôle** — le type d'entrée
- **Par défaut** — la valeur par défaut sécurisée
- **Risque** — `normal`, `caution` (attention), ou `risky` (risqué)
- **Notes** — ce que fait le champ et quand le modifier

## Core (Cœur)

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| `enabled` | commutateur | `true` | risky | Interrupteur principal. Désactiver arrête le comportement d'Engram. |
| `scope` | sélection | `both` | risky | Cible de sauvegarde : `workspace`, `global`, `both`. |
| `read` | sélection | `auto` | normal | Quand les hooks injectent la mémoire : `auto`, `startup`, `always`, `manual`, `off`. |
| `proof` | sélection | `off` | normal | Ligne de preuve du hook : `off`, `compact`. |
| `global_path` | texte | vide | risky | Chemin du système de fichiers pour la mémoire globale. |
| `default_profile` | sélection | vide | risky | Profil utilisé lorsqu'aucun n'est explicitement défini. |
| `roles` | rôles | vide | normal | Noms de rôles séparés par des virgules pour le routage. |
| `theme` | sélection | `dark` | hidden | Interne/masqué. Non visible par l'utilisateur. |

## Load Routing (Routage de charge)

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| `load.limit` | nombre 1–32 | `8` | normal | Nombre maximum de mémoires par charge normale. |

## Memory Limits (Limites de mémoire)

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| `memory.rule_line_target` | nombre 50–200, pas 10 | `70` | normal | Nombre de lignes recommandé pour les règles. |
| `memory.rule_line_hard_limit` | nombre 50–200, pas 10 | `100` | risky | Nombre maximal strict de lignes pour les règles. |

## Graph (Graphe)

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| `graph.enabled` | commutateur | `true` | normal | Active le routage des dépendances/relations. |
| `graph.max_related` | nombre 1–20 | `4` | normal | Limite les mémoires associées des arêtes du graphe. |
| `graph.min_related_score` | nombre 0–1, pas 0.01 | `0.22` | normal | Score de similarité minimal pour les arêtes associées. |

## Vector Search (Recherche vectorielle)

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| `vector.enabled` | commutateur | `true` | normal | Active le routage vectoriel local facultatif. |
| `vector.auto_threshold` | nombre 10–1000 | `100` | normal | Nombre de mémoires pour activer la recherche vectorielle. |
| `vector.candidate_pool` | nombre 8–100 | `24` | normal | Candidats considérés avant le reclassement. |
| `vector.dimensions` | nombre 16–512 | `64` | normal | Dimensions d'intégration ; reconstruire après modification. |

## Rule Variants (Variantes de règles)

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| `rule_variants.enabled` | commutateur | `false` | normal | Active les variantes de rôles/strictitude. |
| `rule_variants.active` | sélection | `balanced` | normal | Variante active : `light`, `balanced`, `strict`. |

## Live Sync (Synchronisation en direct)

| Clave de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| `live_sync.enabled` | commutateur | `false` | normal | Synchro des fichiers contexte de l'agent lors de la sauvegarde. |

## Global Git (Git global)

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| `global_git.enabled` | commutateur | `true` | risky | Active le comportement de Git pour la mémoire globale. |
| `global_git.remote` | texte | `origin` | risky | Nom du dépôt distant Git ; sans espaces. |
| `global_git.remote_url` | texte | vide | risky | URL du dépôt distant de mémoire globale partagée. |
| `global_git.branch` | texte | `main` | risky | Branche cible pour la synchronisation. |
| `global_git.auto_sync` | commutateur | `true` | risky | Comportement automatique de pull/push. |
| `global_git.auto_resolve` | commutateur | `true` | risky | Gestion auto des conflits ; examiner les diffs. |

## Pattern Mining (Extraction de modèles)

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| `pattern_mining.enabled` | commutateur | `false` | normal | Extraction expérimentale de modèles récurrents. |
| `pattern_mining.threshold` | nombre 1–20 | `3` | normal | Répétitions avant qu'un modèle soit pris en compte. |
| `pattern_mining.lookback_sessions` | nombre 1–100 | `20` | normal | Sessions récentes à inspecter. |

## PR Workflow (Flux de travail de PR)

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| `pr_workflow.enabled` | commutateur | `false` | risky | Flux de travail de PR d'équipe expérimental. |
| `pr_workflow.target_branch` | texte | `main` | risky | Branche recevant les PR de mémoire. |

## Encryption (Chiffrement)

| Clé de configuration | Contrôle | Par défaut | Risque | Notes |
| --- | --- | --- | --- | --- |
| `encryption.enabled` | commutateur | `false` | risky | Mode de chiffrement futur/avancé. |
| `encryption.scope` | sélection | `global` | risky | Portée : `workspace`, `global`. |
| `encryption.key_source` | sélection | `portable-file` | risky | Stratégie de source de clé ; risque de perte de sauvegarde. |

## Contrôles hors configuration

Consultez les pages d'onglet pour les contrôles hors configuration :

- [Onglet Connections](connections.md)
- [Onglet Profiles](profiles.md)
- [Onglet Workspaces](workspaces.md)
- [Onglet Core](core.md)
- [Onglet Memories](memories.md)
- [Onglet Runtime](runtime.md)

## Étapes suivantes

- [Onglet Construct](construct.md)
- [Directives de rédaction des champs](field-authoring-guidelines.md)
