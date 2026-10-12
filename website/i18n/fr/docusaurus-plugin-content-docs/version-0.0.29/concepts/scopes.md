---
title: Mémoire de l'espace de travail vs mémoire globale
sidebar_position: 3
description: La mémoire de l'espace de travail prévaut. La mémoire globale sert de repli pour les préférences réutilisables et le contexte d'équipe entre projets.
---

# Mémoire de l'espace de travail vs mémoire globale

Engram résout la mémoire dans deux portées.

## Mémoire de l'espace de travail

La mémoire de l'espace de travail réside dans :

```text
<project>/.agents/.engram/
```

Elle contient des règles, des décisions et des flux de travail propres au projet. La mémoire de l'espace de travail l'emporte sur les doublons globaux.

## Mémoire globale

La mémoire globale est optionnelle et réside à l'emplacement configuré par l'utilisateur. Elle conserve les préférences et le contexte d'équipe qui vous suivent à travers les dépôts.

```bash
engram inject --global-only --global-path ~/Documents/engram
```

La mémoire globale sert de repli pour les préférences réutilisables, les habitudes personnelles ou les valeurs par défaut de l'équipe.

## Priorité de portée

1. Mémoire de l'espace de travail : `<project>/.agents/.engram/`
2. Mémoire globale : `$ENGRAM_GLOBAL_DIR` ou `engram inject --global-path <path>`

La mémoire de l'espace de travail prévaut. La mémoire globale sert de repli pour les préférences réutilisables et le contexte d'équipe entre projets.

## Choisir une cible de sauvegarde

Utilisez `set-save-target` pour choisir la destination des sauvegardes normales :

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

Les nouvelles installations d'espace de travail sauvegardent par défaut à la fois dans l'espace de travail et dans la mémoire globale lorsque cette dernière est configurée. Les agents peuvent remplacer une écriture avec `--scope workspace|global|both`.

Si la portée de configuration active est définie sur `global` (`scope: "global"`), la liaison de skillset au niveau de l'espace de travail est désactivée et ignorée afin d'éviter l'écriture de fichiers dans le dossier d'exécution. Pour lier des agents dans une configuration à portée globale, utilisez `engram link --global`.

## Étapes suivantes

- [Profils et résolution de portée](profiles.md)
- [Chemin de lecture et routage](read-path.md)
