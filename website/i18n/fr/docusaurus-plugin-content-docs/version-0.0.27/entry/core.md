---
title: Onglet Core (Cœur)
sidebar_position: 7
description: Examinez les mémoires en doublon et en conflit avec des filtres de portée et de type.
---

# Onglet Core

L'onglet Core examine les mémoires en doublon et en conflit. C'est l'espace de travail de métacognition à l'intérieur du panneau Entry.

## Jetons de portée (Scope chips) : profile / global / workspace

Filtrez l'analyse des doublons/conflits par source de mémoire. Auditez une portée ou comparez des doublons entre portées. Conservez au moins une portée sélectionnée.

## Jetons de type (Type chips) : rule / skill / workflow / knowledge

Filtrez les candidats en doublon par type de mémoire. Concentrez le nettoyage sur les règles en premier ou sur les faits de connaissance en premier. Documentez la signification des types en ligne afin que les utilisateurs comprennent quand les doublons sont inoffensifs.

## Inclure les candidats sémantiques (Include semantic candidates)

Ajoute la recherche de doublons sémantiques, et pas seulement les correspondances exactes/lexicales. À utiliser lors du nettoyage de magasins de mémoire matures ; attendez-vous à plus de faux positifs.

## Copier l'invite (Copy prompt)

Copie une invite `/engram` pour qu'un agent ou un modèle plus fort résolve les doublons. À utiliser pour le nettoyage et l'examen guidés par l'homme. Rappelez aux utilisateurs d'examiner les modifications générées à travers les barrières d'approbation.

## Aperçu (Preview)

Affiche l'invite avant la copie. Encouragez l'aperçu pour les opérations de nettoyage risquées.

## Équivalent CLI

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
engram metacognize --workspace --force
```

## Étapes suivantes

- [Onglet Memories](memories.md)
- [CLI : verify / repair / quality-check](../cli/verify-repair-quality.md)

