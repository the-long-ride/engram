# Engram

Engram est un protocole de mémoire pour agents IA, possédé par l'humain. Il garde le savoir durable d'un projet, d'une équipe ou d'une préférence personnelle dans des fichiers lisibles, révisables, synchronisables et réparables.

Ce n'est pas un cerveau caché d'agent. L'agent peut proposer une mémoire, mais la source de vérité est le Markdown approuvé dans `.agents/.engram/` ou dans une mémoire globale optionnelle.

## Problème Résolu

Les agents oublient les décisions, redemandent la configuration et mélangent ancien contexte et nouvelles consignes. La mémoire intégrée reste souvent enfermée dans un fournisseur, une application ou une machine.

Engram fournit un contrat stable:

- faits, règles et workflows approuvés vivent en Markdown
- index et graphes accélèrent le routage
- chaque écriture demande une approbation humaine
- les hashes révèlent les modifications non sûres
- les ignore rules protègent la confidentialité
- Git donne historique, portabilité et revue d'équipe

## Modèle Mental

| Couche | Rôle |
| --- | --- |
| Markdown | source de vérité durable |
| JSON index | recherche rapide |
| JSON graph | routage par sujet et relation |
| Approval gate | frontière de confiance |
| Hashes | intégrité avant lecture |
| Ignore rules | contrôle de confidentialité |
| Git | audit et synchronisation |
| Agent adapters | commodité, pas autorité |

## Priorité Des Scopes

1. Workspace: `<project>/.agents/.engram/`
2. Global: `$ENGRAM_GLOBAL_DIR` ou `engram init --global-path <path>`

Le workspace gagne. Le global sert de fallback pour les préférences et le contexte réutilisable.

## Contenu Actuel

- `save` pour une mémoire approuvée
- `save-session` / `ss` pour plusieurs mémoires d'une session
- `observe` pour des notes brutes non actives
- `take-control` pour importer guides et docs existants
- `graph` et `quality-check` pour la revue
- `archive` pour les mémoires fausses ou obsolètes
- `repair` pour les fichiers invalides ignorés par rebuild
- `benchmark` pour tester la récupération
- skillsets, slash adapters et outils MCP de proposition

Avant les commandes, lis la page conceptuelle: [Comprendre Engram](understanding.md).

Suite: [Quickstart agent IA](quickstart.md).
