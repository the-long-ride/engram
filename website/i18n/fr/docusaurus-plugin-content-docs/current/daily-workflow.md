---
title: Flux de travail quotidien
sidebar_position: 4
description: La boucle quotidienne d'Engram — charger, travailler, rechercher, enregistrer et maintenir la mémoire saine.
---

# Flux de travail quotidien

La boucle quotidienne d'Engram est volontairement simple : charger la mémoire au début, rechercher quand vous en avez besoin, enregistrer quand quelque chose de durable émerge, et auditer à la fin.

## Début de session

```text
/engram load "tâche actuelle"
```

Ou depuis le terminal :

```bash
engram load "<tâche>"
```

L'agent doit répondre avec une ligne de comptage compacte telle que `Engram loaded: 8 memories / 24 total related memories.` à moins que l'humain ne demande des identifiants, des règles ou une sortie brute.

## Pendant le travail

Recherchez lorsque la tâche change ou si vous soupçonnez qu'il manque des connaissances sur le projet :

```text
/engram search "sujet qui pourrait me manquer"
```

Prévisualisez les fichiers de mémoire qui seraient routés sans imprimer leur contenu :

```bash
engram load --dry-run "<requête>"
```

Renvoyez toutes les correspondances routées visibles au lieu de la limite compacte :

```bash
engram load --all "<requête>"
```

## Enregistrer un fait durable

```text
/engram save knowledge
```

`engram save` capture le meilleur candidat de mémoire unique, met à jour automatiquement une mémoire correspondante ou en crée une nouvelle, et affiche toujours la validation d'approbation A/B/C avant d'écrire.

## Enregistrer plusieurs mémoires d'une session

```text
/engram save-session
/engram ss
```

Fournissez les candidats sous cette forme :

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` est facultatif. Ajoutez-le uniquement lorsqu'il explique pourquoi la mémoire existe.

## Analyser les discussions récentes

```text
/engram save-session --query-level 3
/engram ss -f last 50 sessions
```

`--query-level` doit être un entier positif. L'agent peut utiliser jusqu'à ce nombre de sessions de discussion humain-agent récentes, y compris l'actuelle, et ne doit pas inventer d'historique non disponible.

## Raccourci pour tout accepter

```text
/engram ss -f
```

`-f` signifie que l'humain approuve explicitement chaque candidat recommandé par l'agent. Les agents ne doivent pas ajouter `--force` à moins que l'humain ne l'ait demandé.

Lorsqu'une exécution de type tout accepter signale des mémoires associées avant d'écrire, aucun fichier n'a encore été enregistré. L'agent doit relancer avec des candidats structurés :

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## Routage des rôles (Role routing)

Enregistrer une mémoire spécifique à un rôle :

```bash
engram save --role frontend ...
engram save-session --role backend ...
```

Ajuster le routage des rôles :

```bash
engram set-role frontend
engram set-role backend security
engram set-role
```

Lorsque `engram set-role ...` ou `engram set-rule-variant ...` réussit, la CLI renvoie une ligne `Agent action:`. Les adaptateurs slash et les hôtes MCP compatibles avec Engram doivent immédiatement réexécuter `engram load "<tâche/requête actuelle>"` et traiter ce résultat comme remplaçant le contexte précédemment chargé par Engram.

## Fin du travail significatif

```text
Check Engram health, report invalid memories, and propose anything worth saving from this session.
```

Commandes utiles :

```bash
engram upgrade
engram verify
engram repair
engram graph "<sujet>"
engram quality-check
engram archive --reason "<pourquoi>" <id-ou-fichier>
```

## Étapes suivantes

- [Référence CLI](cli/overview.md)
- [Dépannage des opérations](operations/troubleshooting.md)
- [Interface Web d'Entry](entry/index.md)

