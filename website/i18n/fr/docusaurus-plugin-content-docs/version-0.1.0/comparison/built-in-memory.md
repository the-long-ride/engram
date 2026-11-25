---
title: Mémoire intégrée de l'agent
sidebar_position: 2
description: Engram traite la mémoire intégrée de l'agent comme une couche de commodité, pas comme l'autorité.
---

# Mémoire intégrée de l'agent

La mémoire intégrée de l'agent est pratique, mais souvent liée à un seul hôte. Il peut être difficile de la comparer (diff), de l'exporter, de la réviser ou de la partager avec un autre agent.

Engram traite la mémoire intégrée comme une couche de commodité, pas comme l'autorité. L'autorité reste les fichiers appartenant à l'humain.

| Dimension | Engram | Mémoire intégrée de l'agent |
| --- | --- | --- |
| Source de vérité | Fichiers Markdown approuvés | État caché appartenant au fournisseur |
| Portabilité | Natif de Git, indépendant de l'agent | Lié à une application ou à un compte |
| Révision | Git diff et révision Markdown | Difficile à inspecter ou à exporter |
| Idéal pour | les équipes qui ont besoin de propriété et d'auditabilité | rappel personnel rapide au sein d'un seul hôte |

## Étapes suivantes

- [agentmemory](agentmemory.md)
- [Présentation des comparaisons](overview.md)
