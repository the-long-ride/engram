---
title: Copilot
sidebar_position: 8
description: Intégration d'Engram avec GitHub Copilot via les instructions personnalisées du dépôt et de l'utilisateur.
---

# Copilot

GitHub Copilot lit les instructions personnalisées du dépôt depuis `.github/copilot-instructions.md`. Pour les installations globales de Copilot, Engram ajoute son bloc géré à `~/.copilot/copilot-instructions.md`.

## Installation

```bash
engram link copilot
```

## Fichiers écrits

| Fichier | Objectif |
| --- | --- |
| `.github/copilot-instructions.md` | Instructions personnalisées du dépôt |

## Installation globale

```bash
engram link --global copilot
```

Ajoute un bloc géré à `~/.copilot/copilot-instructions.md`.

## Cible de secours compacte/manuelle

Copilot est une cible de secours compacte/manuelle. Il reçoit le protocole compact complet car les hooks actuels exposent le contexte de début de session mais aucune injection de contexte fiable au moment du prompt en v1. L'installation des hooks est ignorée ; aucune configuration de hook n'est écrite.

## Étapes suivantes

- [Présentation des intégrations d'agents](overview.md)
- [Hooks et lignes de preuve](hooks.md)
