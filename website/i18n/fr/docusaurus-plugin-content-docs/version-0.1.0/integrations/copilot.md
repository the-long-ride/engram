---
title: Copilot
sidebar_position: 8
description: Intégration d’Engram avec GitHub Copilot via les instructions personnalisées du dépôt et de l’utilisateur.
---

# Copilot

GitHub Copilot lit les instructions personnalisées du dépôt dans `.github/copilot-instructions.md`. Pour les installations globales de Copilot, Engram ajoute son bloc géré à `~/.copilot/copilot-instructions.md`.

## Installation {#install}

```bash
engram link copilot
```

## Fichiers écrits {#files-written}

| Fichier | Rôle |
| --- | --- |
| `.github/copilot-instructions.md` | Instructions personnalisées du dépôt |

## Installation globale {#global-install}

```bash
engram link --global copilot
```

Ajoute un bloc géré à `~/.copilot/copilot-instructions.md`.

## Cible de repli compacte/manuelle {#compact-manual-fallback-target}

Copilot est une cible de repli compacte/manuelle. Il reçoit le protocole compact complet. L’installation des hooks est ignorée dans la v1 ; utilisez le skillset Engram ou un `engram load` manuel pour obtenir le contexte.

## Étapes suivantes {#next-steps}

- [Vue d’ensemble des intégrations d’agents](overview.md)
- [Hooks et lignes de preuve](hooks.md)
