---
title: verify / repair / quality-check
sidebar_position: 6
description: Commandes de maintenance — vérifier les empreintes (hashes), réparer les fichiers non valides, vérifier la qualité et résoudre les conflits.
---

# verify / repair / quality-check

Les commandes de maintenance maintiennent la mémoire saine.

## verify

```bash
engram verify
```

Vérifie les empreintes (hashes) pour l'intégrité. Exécutez après des modifications manuelles ou des importations.

## repair

```bash
engram repair
engram rebuild-index
```

Utilisez `repair` après des modifications manuelles ou des importations pour trouver les fichiers de mémoire mal formés ignorés par la reconstruction de l'index.

## quality-check

```bash
engram quality-check
```

Signale les candidats de contradiction de manière compacte. La détection des contradictions est heuristique et consultative.

## graph

```bash
engram graph "package manager"
engram graph --rebuild
```

Inspecter le routage du graphe avant d'archiver. Exécutez `engram graph --rebuild` après des modifications manuelles.

## archive

```bash
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Archivez la mémoire incorrecte ou obsolète. Utilisez l'archivage, pas la suppression, pour l'auditabilité. Le fichier quitte le routage actif uniquement après approbation et reste préservé sous `archive/`.

## resolve-conflicts

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
```

Prévisualisez ou résolvez uniquement les conflits de mémoire de l'espace de travail appartenant à Engram. Ajoutez `--metacognize` lorsqu'un agent doit examiner le dossier de mémoire après la gestion des conflits. La commande maintient la gestion déterministe des conflits limitée à `.agents/.engram/`, puis ajoute le dossier source de métacognition de l'espace de travail pour des candidats `TYPE/TEXT` concis.

## benchmark

```bash
engram benchmark
```

Vérifications de régression de récupération.

## Étapes suivantes

- [sync / archive](sync-archive.md)
- [Dépannage des opérations](../operations/troubleshooting.md)
