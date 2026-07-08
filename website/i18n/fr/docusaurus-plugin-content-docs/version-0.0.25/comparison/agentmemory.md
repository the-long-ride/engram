---
title: agentmemory
sidebar_position: 3
description: Engram vs rohitg00/agentmemory — protocole de fichiers vs moteur de mémoire automatique.
---

# agentmemory

[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) est un puissant moteur de mémoire automatique pour les agents de codage. Son README présente la mémoire basée sur le serveur, l'intégration MCP/hooks/REST, de nombreux adaptateurs d'agent, des revendications de benchmark, un visualiseur, la relecture (replay), la récupération hybride et l'intégration de Hermes.

Utilisez agentmemory lorsque vous souhaitez une capture automatique, un visualiseur/relecture en direct, une récupération vectorielle, de nombreux outils MCP et une mémoire partagée de style serveur.

Utilisez Engram lorsque vous souhaitez que la mémoire soit un protocole lisible par le dépôt : Markdown en premier, approuvé par l'humain, révisé par Git, portable entre agents même sans serveur en cours d'exécution.

| Dimension | Engram | agentmemory |
| --- | --- | --- |
| Source de vérité | Fichiers Markdown approuvés | Serveur/magasin de mémoire |
| Limite de confiance | Approbation humaine A/B/C | Capture automatique et gouvernance des outils |
| Mode par défaut | Protocole de fichiers, pas de démon requis | Service en cours d'exécution recommandé |
| Révision | Git diff et révision Markdown | Visualiseur/API et sessions stockées |
| Idéal pour | les équipes qui ont besoin de propriété et d'auditabilité | les utilisateurs qui souhaitent un rappel et une relecture automatiques |
| Risque | plus de discipline manuelle | plus d'état invisible à moins d'être gouverné avec soin |

## Étapes suivantes

- [Hermes Agent](hermes-agent.md)
- [Présentation des comparaisons](overview.md)
