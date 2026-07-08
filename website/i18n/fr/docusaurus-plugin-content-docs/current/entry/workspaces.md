---
title: Onglet Workspaces (Espaces de travail)
sidebar_position: 6
description: Enregistrez et liez les dépôts de projet depuis l'interface Entry Web UI.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Onglet Workspaces

L'onglet Workspaces enregistre les dépôts de projet et gère leur état de liaison.

## Nom de l'espace de travail (Workspace name)

Nom d'affichage convivial pour un chemin de dépôt/projet. Gardez-le court et reconnaissable.

## Chemin de l'espace de travail (Workspace path)

Chemin du système de fichiers vers un dépôt/projet. Validez que le dossier existe ou peut être initialisé ; évitez les dossiers système.

## Lier / Délier (Link / Unlink)

Indique si Engram connecte activement les instructions et les hooks générés à l'espace de travail. Liez les dépôts actifs ; déliez les dépôts archivés ou de test.

<RiskCallout level="caution">
La déliaison empêche les agents de recevoir les instructions d'Engram. Confirmez avant de délier un espace de travail actif.
</RiskCallout>

## Supprimer (Delete)

Supprime l'enregistrement de l'espace de travail. Clarifiez si cela supprime uniquement l'enregistrement ou les fichiers de mémoire ; les docs doivent correspondre à l'implémentation. Préférez la déliaison à la suppression pour l'auditabilité.

## Équivalent CLI

```bash
engram inject
engram link codex
engram unlink
```

## Étapes suivantes

- [Onglet Profiles](profiles.md)
- [Onglet Connections](connections.md)
