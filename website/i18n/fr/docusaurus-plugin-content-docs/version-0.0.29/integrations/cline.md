---
title: Cline
sidebar_position: 9
description: Intégration d'Engram avec Cline via les règles de l'espace de travail.
---

# Cline

Cline lit les règles de l'espace de travail depuis `.clinerules`.

## Installation

```bash
engram link cline
```

## Fichiers écrits

| Fichier | Objectif |
| --- | --- |
| `.clinerules` | Règles d'espace de travail de style Cline |

## Cible de secours compacte/manuelle

Cline est une cible de secours compacte/manuelle. La prise en charge des hooks est basée sur des plugins et n'est pas alignée sur l'installateur d'adaptateurs axé sur les fichiers d'Engram dans la v1, l'installation des hooks est donc ignorée et aucune configuration de hook n'est écrite.

## Étapes suivantes

- [Présentation des intégrations d'agents](overview.md)
