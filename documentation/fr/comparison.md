# Comparaison, Avantages, Inconvénients et Feuille de Route

Engram se situe dans une partie différente de l'espace de mémoire que les moteurs de mémoire automatique. Il est optimisé pour le contrôle par l'humain, la possibilité de révision et la portabilité.

## Points Forts d'Engram

- Source de vérité en Markdown simple.
- Approbation humaine requise avant toute écriture durable.
- Historique d'audit et synchronisation natifs dans Git.
- Mémoire de l'espace de travail prioritaire (workspace-first) et globale en cas de secours (global-fallback).
- Indépendant de l'agent : tout agent peut lire le Markdown.
- Couches de sécurité : validation de schéma, détection de secrets, détection d'injections, hashes, et règles d'exclusion.
- Aucun démon, base de données ou compte cloud n'est requis.
- Les flux d'importation, d'observation, d'archivage, de graphe, de benchmark et de réparation facilitent la maintenance à long terme.

## Compromis (Tradeoffs) d'Engram

- Moins automatique que les systèmes de mémoire basés sur un démon.
- La recherche par défaut est une recherche lexicale déterministe ; `search --semantic` ajoute une similarité locale déterministe, et non une recherche sémantique basée sur des embeddings complets.
- Les vecteurs du graphe sont des vecteurs de mots hachés locaux, pas des embeddings sémantiques.
- La détection de contradictions est heuristique et consultative.
- `deduplicate --semantic` utilise la similarité locale déterministe, pas des embeddings externes.
- La minerie de modèles, la configuration du chiffrement et les actifs de workflow de PR existent, mais les workflows complets au moment de l'exécution ne sont pas encore câblés.
- Le graphe dépend des balises (tags) et des résumés générés.

## Comparé à Agentmemory

[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) est un puissant moteur de mémoire automatique pour les agents de codage. Son README présente une mémoire basée sur un serveur, l'intégration MCP/hooks/REST, de nombreux adaptateurs d'agent, des revendications de benchmark, un visualiseur, une fonction de relecture (replay), une récupération hybride et l'intégration Hermes.

Utilisez `agentmemory` lorsque vous souhaitez une capture automatique, un visualiseur/replay en direct, une récupération vectorielle, de nombreux outils MCP et une mémoire partagée de style serveur.

Utilisez `Engram` lorsque vous souhaitez que la mémoire soit un protocole lisible dans le dépôt : Markdown en priorité, approuvé par l'humain, révisé par Git, et portable d'un agent à l'autre même sans serveur en cours d'exécution.

| Dimension | Engram | agentmemory |
| --- | --- | --- |
| Source de vérité | Fichiers Markdown approuvés | Serveur/magasin de mémoire |
| Limite de confiance | Approbation humaine A/B/C | Capture automatique et gouvernance des outils |
| Mode par défaut | Protocole de fichier, pas de démon requis | Service en cours d'exécution recommandé |
| Révision | Git diff et révision Markdown | Visualiseur/API et sessions stockées |
| Meilleure adéquation | Équipes ayant besoin de contrôle et d'auditabilité | Utilisateurs voulant un rappel et replay automatiques |
| Risque | Plus de discipline manuelle | Plus d'état invisible à moins d'une gouvernance rigoureuse |

## Comparé à la Mémoire Intégrée de l'Agent

La mémoire intégrée de l'agent est pratique, mais elle est souvent liée à un seul hôte. Elle peut être difficile à comparer (diff), à exporter, à réviser ou à partager avec un autre agent.

Engram traite la mémoire intégrée comme une couche de commodité, et non comme l'autorité. L'autorité reste les fichiers détenus par l'humain.

## Idées de Feuille de Route (Roadmap)

- Fournisseur d'embeddings locaux facultatif pour les vecteurs de graphe et la recherche.
- De meilleurs diagnostics de graphe expliquant pourquoi une mémoire a été routée.
- Fixtures de benchmark enregistrées dans le dépôt pour le suivi des régressions.
- Un workflow de révision des contradictions plus robuste combinant graphe, contrôle de qualité (quality-check) et archivage.
- Plus de tests d'importation pour les variantes d'exportation d'agentmemory.
- Fournisseur d'embeddings externes facultatif pour la détection sémantique des doublons.
- Des flux de travail de réparation capables de proposer des correctifs après le signalement de fichiers de mémoire non valides.

Suivant : retour à [l'Accueil](index.md).
