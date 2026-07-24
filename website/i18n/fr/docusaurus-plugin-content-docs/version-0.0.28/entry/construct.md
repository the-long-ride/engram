---
title: Onglet Construct (Construire)
sidebar_position: 4
description: Configurez chaque champ d'exécution d'Engram depuis l'onglet Construct. Chaque champ a son cas d'utilisation, valeur par défaut sécurisée, validation et avertissement de risque.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Onglet Construct

L'onglet Construct expose chaque champ de configuration d'exécution d'Engram, regroupé exactement comme dans l'interface utilisateur. Chaque champ a une description, des cas d'utilisation, une valeur par défaut sécurisée, une validation et un avertissement de risque.

<RiskCallout level="caution">
Les champs marqués comme **risky** (risqués) peuvent désactiver Engram, modifier les cibles de sauvegarde, changer le comportement de Git ou affecter la sécurité de la mémoire. Lisez l'avertissement avant de les modifier.
</RiskCallout>

## Groupe Core (Cœur)

### Enabled (Activé)

**Clé de configuration :** `enabled`  
**Contrôle :** commutateur  
**Par défaut :** `true`  
**Risque :** risky

Interrupteur principal. Le désactiver arrête complètement le comportement d'Engram. Utilisez-le uniquement pour un arrêt temporaire ou des tests.

### Save Target (Cible de sauvegarde)

**Clé de configuration :** `scope`  
**Contrôle :** sélection — `workspace`, `global`, `both`  
**Par défaut :** `both`  
**Risque :** risky

Contrôle l'endroit où les nouvelles mémoires approuvées sont enregistrées. Utilisez `workspace` pour la mémoire spécifique au dépôt, `global` pour la mémoire personnelle/d'équipe et `both` pour les nouvelles installations souhaitant utiliser les deux.

### Read Mode (Mode de lecture)

**Clé de configuration :** `read`  
**Contrôle :** sélection — `auto`, `startup`, `always`, `manual`, `off`  
**Par défaut :** `auto`  
**Risque :** normal

Contrôle le moment où les hooks des agents injectent le contexte de mémoire. `auto` charge au début de la session et réinjecte uniquement lorsque le contexte acheminé change. `manual` et `off` réduisent l'automatisation en échange d'éviter l'encombrement du contexte.

### Proof Mode (Mode de preuve)

**Clé de configuration :** `proof`  
**Contrôle :** sélection — `off`, `compact`  
**Par défaut :** `off`  
**Risque :** normal

Indique si les hooks ajoutent une ligne compacte `Engram proof:` sur chaque tour éligible. Utile pour le débogage et la visibilité d'audit.

### Global Memory Path (Chemin de mémoire globale)

**Clé de configuration :** `global_path`  
**Contrôle :** texte/chemin  
**Par défaut :** vide jusqu'à ce qu'il soit configuré  
**Risque :** risky

Chemin du système de fichiers pour la mémoire globale. Utilisez un dossier stable et appartenant à l'utilisateur comme `~/Documents/engram`. Évitez les dossiers temporaires, les dossiers publics synchronisés et les répertoires dans lesquels vous ne pouvez pas écrire.

<RiskCallout level="risky">
L'utilisation d'un dossier public synchronisé sur le cloud pour la mémoire privée peut fuiter des secrets. Utilisez un chemin privé ou un dépôt Git privé.
</RiskCallout>

**Équivalent CLI :**

```bash
engram update-global-folder ~/Documents/engram
engram ugf ~/Documents/engram
```

### Default Profile (Profil par défaut)

**Clé de configuration :** `default_profile`  
**Contrôle :** sélection  
**Par défaut :** vide  
**Risque :** risky

Profil utilisé lorsqu'aucun n'est explicitement défini. Voir [Profils et résolution de portée](../concepts/profiles.md).

### Active Roles (Rôles actifs)

**Clé de configuration :** `roles`  
**Contrôle :** entrée de rôles séparés par des virgules  
**Par défaut :** liste vide  
**Risque :** normal

Restreint et re-classe les mémoires par rôle. Utilisez des noms sûrs correspondant à `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$`.

## Groupe Load Routing (Routage de charge)

### Load Limit (Limite de charge)

**Clé de configuration :** `load.limit`  
**Contrôle :** nombre 1–32  
**Par défaut :** `8`  
**Risque :** normal

Nombre maximum de mémoires renvoyées par une charge normale. Les valeurs plus basses réduisent l'encombrement du contexte pour les modèles à faible contexte ; les valeurs plus élevées aident pour les tâches d'architecture profonde.

## Groupe Memory Limits (Limites de mémoire)

### Rule Line Target (Ligne cible de règle)

**Clé de configuration :** `memory.rule_line_target`  
**Contrôle :** nombre 50–200, pas 10  
**Par défaut :** `70`  
**Risque :** normal

Taille recommandée pour les mémoires de règles. Les règles concises s'acheminent mieux que les politiques trop longues.

### Rule Line Hard Limit (Limite stricte de ligne de règle)

**Clé de configuration :** `memory.rule_line_hard_limit`  
**Contrôle :** nombre 50–200, pas 10  
**Par défaut :** `100`  
**Risque :** risky

Limite maximale stricte pour les mémoires de règles.

<RiskCallout level="risky">
Augmenter cette limite peut accroître l'encombrement du contexte et réduire la qualité du routage. Gardez les règles concises.
</RiskCallout>

## Groupe Graph (Graphe)

### graph.enabled

**Contrôle :** commutateur  
**Par défaut :** `true`  
**Risque :** normal

Active le routage des dépendances et relations via `depends_on`, les mémoires associées et la vue graphe.

### graph.max_related

**Contrôle :** nombre 1–20  
**Par défaut :** `4`  
**Risque :** normal

Limite le nombre de mémoires associées extraites via les signaux du graphe.

### graph.min_related_score

**Contrôle :** nombre 0–1, pas 0.01  
**Par défaut :** `0.22`  
**Risque :** normal

Score de similarité minimal pour les arêtes associées. Augmentez pour la précision, diminuez pour le rappel.

## Groupe Vector Search (Recherche vectorielle)

### vector.enabled

**Contrôle :** commutateur  
**Par défaut :** `true`  
**Risque :** normal

Active le routage vectoriel local facultatif. Pas de dépendance au cloud.

### vector.auto_threshold

**Contrôle :** nombre 10–1000  
**Par défaut :** `100`  
**Risque :** normal

Nombre de mémoires à partir duquel la recherche vectorielle s'active. Les petits coffres-forts peuvent ne pas avoir besoin de recherche vectorielle.

### vector.candidate_pool

**Contrôle :** nombre 8–100  
**Par défaut :** `24`  
**Risque :** normal

Nombre de candidats considérés par la recherche vectorielle avant le reclassement. Des valeurs plus élevées améliorent le rappel au détriment de la latence.

### vector.dimensions

**Contrôle :** nombre 16–512  
**Par défaut :** `64`  
**Risque :** normal

Dimensions d'intégration (embeddings) pour le sidecar vectoriel local. Modifier ceci nécessite une reconstruction.

## Groupe Rule Variants (Variantes de règles)

### rule_variants.enabled

**Contrôle :** commutateur  
**Par défaut :** `false`  
**Risque :** normal

Active les variantes de rôles/strictitude. À utiliser lorsque les équipes ont besoin d'un routage léger, équilibré ou strict.

### rule_variants.active

**Contrôle :** sélection — `light`, `balanced`, `strict`  
**Par défaut :** `balanced`  
**Risque :** normal

Contrôle la strictitude des règles chargées. Le mode `strict` aide les modèles de moindre capacité ; `light` et `balanced` conviennent généralement mieux aux modèles plus forts.

## Groupe Live Sync (Synchronisation en direct)

### live_sync.enabled

**Contrôle :** commutateur  
**Par défaut :** `false`  
**Risque :** normal

Synchronise les fichiers de contexte de l'agent générés lors de l'enregistrement.

## Groupe Global Git (Git global)

<RiskCallout level="risky">
Tous les champs Git global sont risqués. Ils contrôlent l'historique d'audit et le comportement de synchronisation d'équipe pour la mémoire globale. Examinez chacun avant de les activer.
</RiskCallout>

| Champ | Contrôle | Par défaut | Notes |
| --- | --- | --- | --- |
| `global_git.enabled` | commutateur | `true` | Active le comportement de Git pour la mémoire globale |
| `global_git.remote` | texte | `origin` | Nom du dépôt distant Git ; ne doit pas contenir d'espaces |
| `global_git.remote_url` | texte | vide | URL du dépôt distant de mémoire globale partagée ; HTTPS/SSH acceptés |
| `global_git.branch` | texte | `main` | Branche cible pour la synchronisation |
| `global_git.auto_sync` | commutateur | `true` | Comportement automatique de pull/push |
| `global_git.auto_resolve` | commutateur | `true` | Gestion automatique des conflits — examinez les diffs de mémoire |

## Groupe Pattern Mining (Extraction de modèles)

| Champ | Contrôle | Par défaut | Notes |
| --- | --- | --- | --- |
| `pattern_mining.enabled` | commutateur | `false` | Extraction expérimentale de modèles récurrents |
| `pattern_mining.threshold` | nombre 1–20 | `3` | Répétitions avant qu'un modèle candidat soit pris en compte |
| `pattern_mining.lookback_sessions` | nombre 1–100 | `20` | Sessions récentes à inspecter |

## Groupe PR Workflow (Flux de travail de PR)

| Champ | Contrôle | Par défaut | Notes |
| --- | --- | --- | --- |
| `pr_workflow.enabled` | commutateur | `false` | Flux de travail de PR d'équipe expérimental pour les changements de mémoire |
| `pr_workflow.target_branch` | texte | `main` | Branche recevant les PR de mémoire |

## Groupe Encryption (Chiffrement)

<RiskCallout level="risky">
La configuration du chiffrement existe, mais le stockage chiffré n'est pas encore implémenté. Documentez clairement les limitations actuelles pour les utilisateurs.
</RiskCallout>

| Champ | Contrôle | Par défaut | Notes |
| --- | --- | --- | --- |
| `encryption.enabled` | commutateur | `false` | Mode de chiffrement futur/avancé |
| `encryption.scope` | sélection — `workspace`, `global` | `global` | À quelle portée s'applique le chiffrement |
| `encryption.key_source` | sélection — `portable-file` | `portable-file` | Stratégie de source de clé ; risque de perte de sauvegarde |

## Étapes suivantes

- [Référence complète des champs](field-reference.md)
- [Onglet Profiles](profiles.md)
- [Onglet Runtime](runtime.md)
