---
title: Directives de rédaction des champs
sidebar_position: 11
description: Règles pour les mainteneurs documentant de nouveaux champs de l'interface utilisateur Entry.
---

# Directives de rédaction des champs

Règles pour les mainteneurs documentant de nouveaux champs de l'interface utilisateur Entry.

## Lorsque vous ajoutez un champ

1. Ajoutez le champ à `CONFIG_FIELDS` dans `src/core/web/config-schema.ts` avec une courte `description`, des `options`, `min`/`max`/`step`, et le risque (`risk`).
2. Ajoutez une entrée de doc à `website/src/data/entryFields.ts` avec au minimum `shortDescription`, `useCases`, et `guidelines`.
3. Documentez le champ sur la page de l' [Onglet Construct](construct.md) et dans la [Référence complète des champs](field-reference.md).
4. Exécutez la vérification de couverture de doc des champs :

   ```bash
   npm --prefix website run check:entry-fields
   ```

5. Si le champ est risqué, ajoutez au moins une note de récupération/dépannage.

## Éléments de doc requis par champ

| Élément | Requis |
| --- | --- |
| Description en langage clair | Oui |
| Cas d'utilisation | Oui (1+) |
| Valeur par défaut recommandée | Oui |
| Valeurs autorisées / plage | Oui |
| Niveau de risque | Oui |
| Effets secondaires | Si pertinent |
| Équivalent CLI | Si pertinent |
| Exemples de valeurs | Pour les champs de texte/chemin |
| Notes de dépannage | Pour les champs risqués |

## Règles d'écriture

- Écrivez pour un utilisateur configurant un système de mémoire d'agent IA, pas pour un mainteneur lisant le code source.
- Nommez l'effet réel sur la propriété de la mémoire, le routage, la taille du contexte, la confidentialité ou la synchronisation Git.
- Préférez les exemples issus des flux de travail d'Engram : Codex, Claude, Gemini, Cursor, OpenCode, mémoire personnelle, profil client, dépôt d'équipe.
- Ne recommandez pas de limites élevées par défaut ; expliquez les compromis d'encombrement du contexte.
- Marquez les paramètres comme risqués lorsqu'ils peuvent désactiver Engram, modifier l'emplacement de sauvegarde, modifier la synchronisation Git, archiver la mémoire ou affecter le chiffrement/la sécurité.
- Incluez des commandes de récupération pour les paramètres risqués.
- Gardez les descriptions dans l'application courtes ; mettez le guide détaillé dans Docusaurus.

## Couverture CI

`website/scripts/check-entry-field-docs.mjs` échoue lorsque :

1. Une clé `CONFIG_FIELDS` visible manque d'une entrée de doc.
2. Une entrée de doc fait référence à un champ qui n'est plus dans `CONFIG_FIELDS`.
3. Un champ manque de `shortDescription`, `useCases`, ou `guidelines`.
4. Un champ risqué manque d'au moins une note de dépannage.
5. Un champ numérique omet la plage autorisée dans les documents rendus.

## Étapes suivantes

- [Référence complète des champs](field-reference.md)
- [Onglet Construct](construct.md)
