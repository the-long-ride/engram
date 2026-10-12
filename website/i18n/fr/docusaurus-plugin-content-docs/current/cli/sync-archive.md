---
title: sync / clone-memory / archive
sidebar_position: 7
description: Commandes sync, clone et archive pour déplacer la mémoire entre les portées.
---

# sync / clone-memory / archive

Déplacez la mémoire entre les portées et retirez la mémoire erronée en toute sécurité.

## clone-memory

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
engram clone-memory workspace global --metacognize
```

Copie le Markdown actif de `rules/`, `skills/` et `knowledge/` entre les portées workspace et globale. Ajoutez `--metacognize` lorsque vous souhaitez que les mémoires clonées soient proposées via le flux d’approbation de save-session plutôt que copiées textuellement.

Les agents peuvent normaliser les demandes de clonage naturelles vers `engram clone-memory`, par ex. "clone workspace memory to global" -> `engram clone-memory workspace global`. Inversez les portées pour cloner la mémoire globale dans un workspace ; n’utilisez `--force` que lorsque l’humain demande explicitement d’écraser les doublons cibles.

## archive

```bash
engram archive --reason "<why>" <id-or-file>
```

Archive une mémoire erronée ou remplacée. Le fichier quitte le routage actif uniquement après approbation et reste conservé sous `archive/`. Utilisez archive, et non delete, à des fins d’audit.

## observe (inbox)

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` stocke les notes brutes nettoyées dans `inbox/`. Les notes de l’inbox ne constituent pas de la mémoire active.

## Synchronisation Git globale {#global-git-sync}

La synchronisation Git globale est contrôlée par les champs de configuration `global_git.*`. Consultez [Interface Web Entry : onglet Construct](../entry/construct.md) pour chaque champ. Utilisez `engram entry` et l’onglet Construct, ou `engram config view`, pour inspecter la détection Git résolue.

## Étapes suivantes {#next-steps}

- [profils / workspaces / configuration](profiles-workspaces-config.md)
- [Opérations : flux de travail Git en équipe](../operations/team-git-workflow.md)
