---
title: Politique d’enregistrement automatique
sidebar_position: 5
description: Configurez le refus par défaut des écritures autonomes, les quotas, la rétention des restaurations, les portes de révision et les métadonnées requises.
---

# Politique d’enregistrement automatique

L’onglet Construct permet de modifier `.agents/engram.policy.json`. Les flux ordinaires `engram save` et `engram save-session` restent approuvés par un humain ; cette politique ne s’applique qu’aux candidats autonomes explicitement filtrés par une politique.

## Écritures autonomes

### Autoriser l’enregistrement automatique {#autonomous-writes-enabled}

Correspond à `autonomous_writes.enabled`. Valeur par défaut : `false`. Lorsqu’il est désactivé, aucun candidat ne peut écrire de manière autonome.

### Mode d’écriture {#autonomous-writes-mode}

Correspond à `autonomous_writes.mode`. `review_only` diffère les candidats pour révision ; `autonomous` autorise l’écriture des candidats qui franchissent toutes les autres portes.

### Types autorisés {#autonomous-writes-allowed-types}

Correspond à `autonomous_writes.allowed_types`. Les valeurs autorisées sont `rule`, `skill`, `workflow` et `knowledge`. Au moins un type est requis.

### Portées autorisées {#autonomous-writes-allowed-scopes}

Correspond à `autonomous_writes.allowed_scopes`. Les valeurs autorisées sont `workspace` et `global`.

### Sources autorisées {#autonomous-writes-allowed-sources}

Correspond à `autonomous_writes.allowed_sources`. Entry propose `autosave`, `agent-hook`, `cli` et `mcp` ; les chaînes de source personnalisées non vides restent valides dans le fichier JSON de politique.

### Seuil de confiance {#autonomous-writes-confidence-threshold}

Correspond à `autonomous_writes.confidence_threshold`. Les valeurs autorisées sont `low`, `medium` et `high`.

### Limite quotidienne d’écriture {#autonomous-writes-daily-limit}

Correspond à `autonomous_writes.daily_limit`. Utilisez un entier non négatif. `0` empêche toute écriture autonome.

### Jours de rétention de restauration {#autonomous-writes-rollback-retention-days}

Correspond à `autonomous_writes.rollback_retention_days`. Utilisez un entier non négatif correspondant à la période pendant laquelle les enregistrements d’audit restent éligibles à une restauration.

## Portes de révision

### Limite de lignes de règle pour révision {#review-max-rule-lines}

Correspond à `review.max_rule_lines`. Les candidats règles dépassant cet entier positif échouent à la révision.

### Benchmark de rappel minimal {#review-benchmark-min-recall-at-k}

Correspond à `review.benchmark_min_recall_at_k`. Utilisez un nombre compris entre `0` et `1`.

### Métadonnées context obligatoires {#review-mandatory-metadata-context}

Correspond à `review.mandatory_metadata.context`. Lorsqu’il est activé, les candidats sans métadonnées `context` échouent à la révision.

### Métadonnées triggers obligatoires {#review-mandatory-metadata-triggers}

Correspond à `review.mandatory_metadata.triggers`. Lorsqu’il est activé, les candidats sans métadonnées `triggers` échouent à la révision.

### Métadonnées role obligatoires {#review-mandatory-metadata-role}

Correspond à `review.mandatory_metadata.role`. Lorsqu’il est activé, les candidats sans métadonnées `role` échouent à la révision.

## Flux CLI

```bash
engram policy init
engram policy validate --json
engram autosave --policy --dry-run
engram policy audit --json
engram policy rollback <audit-id>
```

Utilisez dry-run avant d’activer le mode autonome. Les reçus d’audit contiennent des identifiants plutôt que des corps de mémoire, et la restauration archive la mémoire écrite sous politique.

## Pages associées

- [Onglet Construct](construct.md)
- [Chemin d’écriture et approbation](../concepts/write-path.md)
- [Confidentialité, règles d’exclusion et sécurité](../concepts/safety.md)
