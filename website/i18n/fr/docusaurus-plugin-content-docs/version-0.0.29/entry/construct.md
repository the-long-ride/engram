---
title: Onglet Construct
sidebar_position: 4
description: Configurer les champs d’exécution d’Engram depuis Construct ; la configuration Git globale se gère depuis Git → Global.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Onglet Construct {#construct-tab}

L’onglet Construct expose les champs de configuration d’exécution d’Engram regroupés comme dans l’interface, à l’exception de la **configuration Git globale**, volontairement gérée depuis **Git → Global**. Chaque champ de Construct comporte une description, des cas d’usage, une valeur par défaut sûre, une validation et un avertissement de risque.

<RiskCallout level="caution">
Les champs marqués **risky** peuvent désactiver Engram, modifier les cibles d’enregistrement, changer le comportement de Git ou affecter la sécurité de la mémoire. Lisez l’avertissement avant de les modifier.
</RiskCallout>

## Groupe Core {#core-group}

### Enabled

**Clé de configuration :** `enabled`  
**Contrôle :** bascule  
**Par défaut :** `true`  
**Risque :** risky

Interrupteur général. Le désactiver arrête entièrement le comportement d’Engram. À n’utiliser que pour un arrêt temporaire ou des tests.

### Save Target

**Clé de configuration :** `scope`  
**Contrôle :** sélection — `workspace`, `global`, `both`  
**Par défaut :** `both`  
**Risque :** risky

Contrôle où les nouvelles mémoires approuvées sont enregistrées. Utilisez `workspace` pour une mémoire propre au dépôt, `global` pour une mémoire personnelle ou d’équipe, `both` pour les nouvelles installations qui veulent les deux.

### Update Mode

**Clé de configuration :** `update`  
**Contrôle :** sélection — `auto`, `manual`, `off`  
**Par défaut :** `auto`  
**Risque :** normal

Contrôle la vérification silencieuse, une seule fois, des mises à niveau du paquet exécutée par les commandes normales. N’utilisez `manual` ou `off` que si les mises à niveau sont gérées en dehors d’Engram.

### Read Mode

**Clé de configuration :** `read`  
**Contrôle :** sélection — `auto`, `startup`, `always`, `manual`, `off`  
**Par défaut :** `auto`  
**Risque :** normal

Contrôle quand les hooks d’agent injectent le contexte de mémoire. `auto` charge au démarrage de la session et ne réinjecte que lorsque le contexte routé change. `manual` et `off` réduisent l’automatisation au prix d’un contexte plus chargé.

### Proof Mode

**Clé de configuration :** `proof`  
**Contrôle :** sélection — `off`, `compact`  
**Par défaut :** `off`  
**Risque :** normal

Indique si les hooks ajoutent une ligne compacte `Engram proof:` à chaque tour éligible. Utile pour le débogage et la visibilité d’audit.

### Global Memory Path

**Clé de configuration :** `global_path`  
**Contrôle :** texte/chemin  
**Par défaut :** vide tant qu’il n’est pas configuré  
**Risque :** risky

Chemin du système de fichiers pour la mémoire globale. Utilisez un dossier stable appartenant à l’utilisateur, comme `~/Documents/engram`. Évitez les dossiers temporaires, les dossiers publics synchronisés et les répertoires où vous ne pouvez pas écrire.

<RiskCallout level="risky">
Utiliser un dossier public synchronisé dans le cloud pour une mémoire privée peut divulguer des secrets. Utilisez un chemin privé ou un dépôt Git privé.
</RiskCallout>

**Équivalent CLI :**

```bash
engram update-global-folder ~/Documents/engram
engram ugf ~/Documents/engram
```

### Default Profile

**Clé de configuration :** `default_profile`  
**Contrôle :** sélection  
**Par défaut :** vide  
**Risque :** risky

Profil utilisé lorsqu’aucun n’est défini explicitement. Voir [Profils et résolution de portée](../concepts/profiles.md).

### Active Roles

**Clé de configuration :** `roles`  
**Contrôle :** rôles / saisie séparée par des virgules  
**Par défaut :** liste vide  
**Risque :** normal

Restreint et reclasse les mémoires par rôle. Utilisez des noms sûrs correspondant à `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$`.

## Groupe Ignore Rules {#ignore-rules-group}

| Champ | Contrôle | Par défaut | Notes |
| --- | --- | --- | --- |
| `ignore.source` | sélection | `engramignore` | Choisissez `engramignore`, `gitignore`, `both` ou `off` comme sources de règles d’analyse. |
| `ignore.gitignore_path` | texte | `.gitignore` | Fichier d’ignorance Git à utiliser lorsqu’il est activé. |
| `ignore.engramignore_path` | texte | `.engramignore` | Fichier d’ignorance Engram à utiliser lorsqu’il est activé. |
| `ignore.global_engramignore` | bascule | `true` | Applique les règles d’ignorance globales lorsque la mémoire globale est configurée. |
| `ignore.also_ignore` | liste | `*.secret`, `private/**` | Motifs glob supplémentaires séparés par des virgules. |

### Global Ignore Patterns

**Clé de configuration :** `ignore.global_patterns`  
**Contrôle :** zone de texte, un motif glob par ligne  
**Par défaut :** liste vide  
**Risque :** normal

Les motifs s’appliquent aux lectures de la mémoire globale. Chaque `engram inject` les synchronise dans un bloc géré du `.engramignore` du workspace ; les lignes rédigées par un humain en dehors de ce bloc sont conservées.

### Auto-save policy

L’éditeur **Auto-save policy** écrit `.agents/engram.policy.json`. Il contrôle si les candidats approuvés par la politique peuvent être enregistrés sans invite interactive ; les enregistrements normaux restent soumis à approbation.

Consultez la [référence de la politique d’enregistrement automatique](policy.md) pour chaque contrôle, valeur par défaut, valeur autorisée, porte de relecture, quota et paramètre de retour arrière.

## Groupe Load Routing {#load-routing-group}

### Load Limit

**Clé de configuration :** `load.limit`  
**Contrôle :** nombre 1–32  
**Par défaut :** `8`  
**Risque :** normal

Nombre maximal de mémoires renvoyées par un chargement normal. Des valeurs plus basses réduisent la surcharge de contexte pour les modèles à faible contexte ; des valeurs plus hautes aident pour les tâches d’architecture en profondeur.

### Working Memory TTL (days)

**Clé de configuration :** `load.working_ttl_days`  
**Contrôle :** nombre 1–365  
**Par défaut :** `14`  
**Risque :** normal

Nombre de jours pendant lesquels une mémoire `OBJECTIVE: task` approuvée reste dans le niveau de travail ignoré par Git avant d’expirer. Le changement s’applique aux mémoires enregistrées ensuite. Conservez une mémoire de travail avec `engram promote <id>` ; purgez les mémoires expirées avec `engram working prune`.

## Groupe Memory Limits {#memory-limits-group}

### Rule Line Target

**Clé de configuration :** `memory.rule_line_target`  
**Contrôle :** nombre 50–200, pas de 10  
**Par défaut :** `70`  
**Risque :** normal

Taille recommandée pour les mémoires de règle. Des règles concises se routent mieux que des politiques trop longues.

### Rule Line Hard Limit

**Clé de configuration :** `memory.rule_line_hard_limit`  
**Contrôle :** nombre 50–200, pas de 10  
**Par défaut :** `100`  
**Risque :** risky

Maximum strict pour les mémoires de règle.

<RiskCallout level="risky">
Augmenter cette valeur peut accroître la surcharge de contexte et réduire la qualité du routage. Gardez des règles concises.
</RiskCallout>

### Write Author Email

**Clé de configuration :** `memory.include_author_email`  
**Contrôle :** bascule  
**Par défaut :** `false`  
**Risque :** risky

Lorsqu’elle est activée, les mémoires nouvelles et mises à jour écrivent aussi `author_email` à côté de `author_name`. Désactivée par défaut afin que les fichiers de mémoire commités ne portent aucune adresse e-mail ; votre e-mail reste dans le profil d’auteur et dans les commits Git créés par Engram.

<RiskCallout level="risky">
L’activer écrit des adresses e-mail dans les fichiers de mémoire commités. Désactivez-la à nouveau et exécutez `engram author migrate-memories --strip-email --confirm` pour les supprimer.
</RiskCallout>

## Groupe Hooks {#hooks-group}

### hooks.path_rules

**Clé de configuration :** `hooks.path_rules`  
**Contrôle :** sélection - `native`, `hook`  
**Par défaut :** `native`  
**Risque :** normal

`native` écrit des fichiers de règles générés pour les mémoires `applies_to` (Claude `.claude/rules/engram/`, Cursor `.cursor/rules/engram/`) et enregistre `InstructionsLoaded` côté Claude. `hook` conserve le hook Engram `PreToolUse` pour Claude et supprime les fichiers de règles Claude. Codex utilise toujours `PreToolUse`.

## Groupe Graph {#graph-group}

### graph.enabled

**Contrôle :** bascule  
**Par défaut :** `true`  
**Risque :** normal

Active le routage par dépendances/relations via `depends_on`, les mémoires apparentées et la vue du graphe.

### graph.max_related

**Contrôle :** nombre 1–20  
**Par défaut :** `4`  
**Risque :** normal

Limite les mémoires apparentées récupérées via les signaux du graphe.

### graph.min_related_score

**Contrôle :** nombre 0–1, pas de 0.01  
**Par défaut :** `0.22`  
**Risque :** normal

Score de similarité minimal pour les arêtes liées. Augmentez-le pour la précision, baissez-le pour le rappel.

## Groupe Vector Search {#vector-search-group}

### vector.provider

**Contrôle :** sélection — `sqlite-vec`  
**Par défaut :** `sqlite-vec`  
**Risque :** normal

Sélectionne le fournisseur vectoriel local. `sqlite-vec` est le seul fournisseur pris en charge.

### vector.enabled

**Contrôle :** bascule  
**Par défaut :** `false`  
**Risque :** normal

Expérimental. Active un routage vectoriel local facultatif reposant sur des vecteurs de hachage à 64 dimensions, qui ne sont pas des embeddings sémantiques. Désactivé par défaut ; une configuration de workspace qui stocke déjà `true` reste activée. Aucune dépendance au cloud.

### vector.auto_threshold

**Contrôle :** nombre 10–1000  
**Par défaut :** `100`  
**Risque :** normal

Nombre de mémoires à partir duquel la recherche vectorielle s’active. Les petits coffres n’ont peut-être pas besoin de recherche vectorielle.

### vector.candidate_pool

**Contrôle :** nombre 8–100  
**Par défaut :** `24`  
**Risque :** normal

Nombre de candidats que la recherche vectorielle considère avant le reclassement. Une valeur plus haute améliore le rappel au prix de la latence.

### vector.dimensions

**Contrôle :** nombre 16–512  
**Par défaut :** `64`  
**Risque :** normal

Dimensions d’embedding pour le fichier annexe vectoriel local. Les modifier exige une reconstruction.

## Groupe Rule Variants {#rule-variants-group}

### rule_variants.enabled

**Contrôle :** bascule  
**Par défaut :** `false`  
**Risque :** normal

Rend au chargement les formulations light et strict dérivées du Content de chaque règle (désactivé, il rend le Content balanced). Les fichiers de règle ne stockent une section `## Rule Variants` que pour une formulation personnalisée.

### rule_variants.active

**Contrôle :** sélection — `light`, `balanced`, `strict`  
**Par défaut :** `balanced`  
**Risque :** normal

Contrôle la rigueur des règles chargées. `strict` aide les modèles de niveau inférieur ; `light`/`balanced` conviennent en général aux modèles plus performants.

## Groupe Live Sync {#live-sync-group}

### live_sync.enabled

**Contrôle :** bascule  
**Par défaut :** `false`  
**Risque :** normal

Synchronise les fichiers de contexte d’agent générés à l’enregistrement.

### live_sync.targets

**Contrôle :** liste  
**Par défaut :** `agents-md`, `claude-md`, `cursor-rules`

Cibles de contexte générées, séparées par des virgules, actualisées lorsque la synchronisation en direct s’exécute.

## La configuration Git globale a déménagé vers Git {#global-git-configuration-moved-to-git}

La configuration Git globale n’apparaît plus dans Construct. Ouvrez **Git → Global** pour modifier les paramètres `global_git.*` existants avec la même validation et le même backend de relecture des risques. L’onglet Workspace sous Git n’expose jamais ces contrôles globaux.

Pour le détail clé par clé, consultez la [référence des champs](field-reference.md#global-git) ou le [guide des paramètres Git](../operations/git-author-settings.md#global-git-configuration).

## Groupe Pattern Mining {#pattern-mining-group}

| Champ | Contrôle | Par défaut | Notes |
| --- | --- | --- | --- |
| `pattern_mining.enabled` | bascule | `false` | Extraction expérimentale de motifs récurrents |
| `pattern_mining.threshold` | nombre 1–20 | `3` | Répétitions avant qu’un candidat de motif compte |
| `pattern_mining.lookback_sessions` | nombre 1–100 | `20` | Sessions récentes à inspecter |

## Groupe PR Workflow {#pr-workflow-group}

| Champ | Contrôle | Par défaut | Notes |
| --- | --- | --- | --- |
| `pr_workflow.enabled` | bascule | `false` | Flux de PR d’équipe expérimental pour les modifications de mémoire |
| `pr_workflow.provider` | texte | vide | Identifiant du fournisseur d’un flux d’équipe déjà configuré |
| `pr_workflow.repo` | texte | vide | Identifiant du dépôt d’un flux d’équipe déjà configuré |
| `pr_workflow.target_branch` | texte | `main` | Branche recevant les PR de mémoire |

## Groupe Encryption {#encryption-group}

<RiskCallout level="risky">
La configuration du chiffrement existe, mais le stockage chiffré n’est pas encore implémenté. Documentez clairement les limites actuelles auprès des utilisateurs.
</RiskCallout>

| Champ | Contrôle | Par défaut | Notes |
| --- | --- | --- | --- |
| `encryption.enabled` | bascule | `false` | Mode de chiffrement futur/avancé |
| `encryption.scope` | sélection — `workspace`, `global` | `global` | Portée à laquelle s’applique le chiffrement |
| `encryption.key_source` | sélection — `portable-file` | `portable-file` | Stratégie de source de clé ; risque de perte de sauvegarde |

## Étapes suivantes {#next-steps}

- [Référence complète des champs](field-reference.md)
- [Onglet Memories](memories.md)
- [Onglet Core](core.md)
