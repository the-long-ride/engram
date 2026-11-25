---
title: Journal des modifications
sidebar_position: 5
description: Historique des versions d'Engram.
---

# Journal des modifications (Changelog)

L'historique des versions d'Engram réside dans le dépôt [`CHANGELOG.md`](https://github.com/the-long-ride/engram/blob/main/CHANGELOG.md).

Pour connaître la version actuelle du package, reportez-vous à [`package.json`](https://github.com/the-long-ride/engram/blob/main/package.json).

## Version actuelle

La version actuelle d'Engram publiée est la `0.1.0`.

## Points forts de la version 0.1.0

- **Récupération et tokenisation** : BM25F à 3 flux (`title`, `tags`, `body`), 24 clusters de concepts plus des ponts de cooccurrence du corpus lorsque les ancres exactes manquent, et tokenisation Unicode/vietnamien/CJK.
- **Fraîcheur, ordonnancement et compression au démarrage** : score de fraîcheur et de niveau de travail `knowledgeFreshnessBoost`, tri topologique sensible à l’attention `orderForAgentConsumption`, et compression des cartes de démarrage `hookStartupAuto` en mode `read: auto`.
- **Télémétrie d’usage en boucle fermée** : suivi des résultats dans `usage.json` local et ignoré par Git (`applied`, `corrected` et décroissance du bruit après des injections répétées sans utilité) avec `engram stats --backfill`.
- **Apprentissage de session Option A et notes de travail** : apprentissage déterministe au moment du prompt et depuis les transcriptions vers des mémoires `working/` temporaires et ignorées par Git ainsi que des reçus préparés `inbox/r-*.json` (`engram review inbox|triage|apply|dismiss`), `engram working note` / outil MCP `engram_note`, et mise en file optionnelle des transcriptions `SessionEnd` (`engram link claude|codex --session-end`).
- **Ergonomie de la CLI** : `engram status` (`engram stat`), `engram why <id> ["<query>"]`, `engram help --compact`, `engram graph link <parent-id> <child-id...>`, `engram review triage` et `engram benchmark --from-git`.
- **UX Entry Web et sécurité** : flux de travail améliorés dans l’interface web Entry et dépendances sans vulnérabilité.

## Mise à niveau

```bash
npm install -g @the-long-ride/engram@latest
engram upgrade
```

Reportez-vous à [Processus de publication et de mise à niveau](release-upgrade.md) pour plus de détails.
