---
title: sync / clone-memory / archive
sidebar_position: 7
description: Commandes de synchronisation, clonage et archivage pour déplacer la mémoire entre les portées.
---

# sync / clone-memory / archive

Déplacer la mémoire entre les portées et retirer la mémoire incorrecte en toute sécurité.

## clone-memory

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
engram clone-memory workspace global --metacognize
```

Copiez le Markdown actif de `rules/`, `skills/` et `knowledge/` entre les portées de l'espace de travail et globale. Ajoutez `--metacognize` lorsque vous souhaitez que les mémoires clonées soient proposées via le flux d'approbation save-session au lieu d'être copiées mot à mot.

Les agents peuvent normaliser les requêtes de clonage naturelles en `engram clone-memory`, par exemple "clone workspace memory to global" -> `engram clone-memory workspace global`. Inversez les portées pour copier la mémoire globale dans un espace de travail ; utilisez `--force` uniquement lorsque l'humain demande explicitement d'écraser les copies de destination.

## archive

```bash
engram archive --reason "<why>" <id-or-file>
```

Archivez la mémoire incorrecte ou obsolète. Le fichier quitte le routage actif uniquement après approbation et reste préservé sous `archive/`. Utilisez l'archivage, pas la suppression, pour l'auditabilité.

## observe (inbox)

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` stocke des notes brutes nettoyées dans `inbox/`. Les notes de la boîte de réception ne sont pas de la mémoire active.

## Synchronisation Git globale

La synchronisation Git globale est contrôlée par les champs de configuration `global_git.*`. Voir [Interface Web d'Entry : onglet Construct](../entry/construct.md) pour chaque champ. Utilisez l'onglet Runtime de `engram entry` pour inspecter la détection Git résolue.

## Étapes suivantes

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [Opérations : flux de travail Git de l'équipe](../operations/team-git-workflow.md)
