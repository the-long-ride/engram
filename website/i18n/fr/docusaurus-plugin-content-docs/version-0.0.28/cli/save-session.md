---
title: save / save-session / observe
sidebar_position: 3
description: Commandes d'écriture — enregistrer une mémoire, en enregistrer plusieurs d'une session et capturer des notes brutes.
---

# save / save-session / observe

Les commandes d'écriture proposent de la mémoire via la validation de l'approbation.

## save

```bash
engram save [rule|workflow|knowledge] "<text>"
engram save --role frontend "<text>"
engram save --scope global "<text>"
```

`engram save` capture le meilleur candidat de mémoire unique, met à jour automatiquement une mémoire correspondante ou en crée une nouvelle, et affiche toujours la validation d'approbation A/B/C avant d'écrire.

Lorsque `engram save` trouve des mémoires actives associées, l'aperçu de l'approbation les signale avec un `depends_on` suggéré ou un avertissement de doublon possible.

## save-session

```bash
engram save-session
engram ss
engram save-session --query-level 3
engram ss -f
engram ss -f last 50 sessions
engram save-session --file transcript.md
engram save-session --force
```

Utilisez `save-session` lorsqu'une longue interaction a produit plusieurs candidats :

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` est facultatif. Ajoutez-le uniquement lorsqu'il explique pourquoi la mémoire existe. Les candidats peuvent également ajouter des champs `DEPENDS_ON`, `LEVEL` ou `UPDATE` lors de la restructuration d'une mémoire associée.

- `--query-level <n>` — extrait jusqu'à n discussions récentes accessibles entre l'humain et l'agent ; doit être un entier positif ; les agents ne doivent pas inventer d'historique non disponible
- `--force` / `-f` — chaque candidat généré est enregistré parce que l'humain a explicitement approuvé ce raccourci
- `--file <path>` — pour les transcriptions ou les longs résumés déjà présents sur le disque

Pour `/engram take-control --force` ou le `/engram take control accept all` naturel, l'adaptateur normalise la formulation, génère uniquement des candidats concis `TYPE: ... | TEXT: ...` et laisse Engram les enregistrer sans invite d'approbation secondaire.

## observe

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` stocke des notes brutes nettoyées dans `inbox/`. Les notes de la boîte de réception ne sont pas des mémoires actives. Utilisez ceci lorsque vous souhaitez préserver des notes brutes avant de décider ce qui doit devenir une mémoire durable.

## Indices de mémoire associée

Lorsqu'une exécution de type tout accepter signale des mémoires associées avant d'écrire, aucun fichier n'a été enregistré. L'agent doit relancer avec des candidats structurés :

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## Étapes suivantes

- [inject / link / upgrade](inject-link-upgrade.md)
- [Concepts : chemin d'écriture et approbation](../concepts/write-path.md)

