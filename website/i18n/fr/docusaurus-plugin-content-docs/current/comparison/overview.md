---
title: "Aperçu comparatif"
sidebar_position: 1
description: "Comment Engram se compare à la mémoire intégrée de l'agent, agentmemory, Obsidian, Tolaria et Hermes Agent."
---

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

## Comparé à Hermes Agent

### Résumé (TL;DR)

| | Engram | Hermes Agent |
|---|---|---|
| **Philosophie** | Protocole orienté fichier, propriété humaine (automatisation en option) | Mémoire autonome et toujours active |
| **Stockage** | Fichiers Markdown typés dans `.agents/.engram/` | `MEMORY.md` + `USER.md` (limites strictes de caractères) |
| **Modèle d'écriture** | Approuvé par l'humain par défaut (porte A/B/C ; automatisable via règles) | L'agent écrit de manière autonome |
| **Rappel** | À la demande : `engram load "<tâche>"` injecte les fichiers pertinents | Toujours actif : fichiers principaux gelés dans le prompt système à chaque session |
| **Recherche vectorielle** | sqlite-vec local facultatif (déterministe, sans plongements/embeddings) | Via un fournisseur externe (par exemple, agentmemory — BM25 + vecteur) |
| **Multi-agent** | Tout agent lisant les fichiers peut consommer la mémoire d'Engram | Le cœur de Hermes est mono-agent ; multi-agent via le plugin agentmemory |
| **Portabilité** | Natif de Git, d'abord hors ligne, Markdown simple | Fichiers locaux ; les fournisseurs externes peuvent ajouter une dépendance au cloud |
| **Surcharge (Overhead)** | Sans démon, requiert une discipline de sauvegarde (sauf si automatisé) | Processus serveur + interface de visualisation, API REST, serveur MCP |

---

### Formats de stockage

**Engram** stocke chaque mémoire sous forme de fichier Markdown typé avec frontmatter YAML, contrôles d'intégrité de hachage et un graphique de dépendances facultatif (`depends_on`). Un index JSON, un graphique et un sidecar sqlite-vec actueux comme couches d'accélération — Markdown est la source unique de vérité.

**Hermes** compresse toute la mémoire persistante en deux fichiers limités :
- `~/.hermes/memories/MEMORY.md` — notes de l'agent, limitées à 2 200 caractères
- `~/.hermes/memories/USER.md` — profil utilisateur, limité à 1 375 caractères

Les limites de caractères strictes obligent l'agent à filtrer plutôt qu'à accumuler. L'historique des sessions est interrogeable via SQLite FTS5.

---

### Modèle d'écriture

**Engram** — approbation humaine explicite par défaut. Les agents proposent des candidats ; un humain doit approuver avant que quoi que ce soit ne soit écrit sur le disque. L'analyse des secrets et d'injection de prompts a lieu au moment de la sauvegarde. *(Note : Les utilisateurs peuvent choisir d'automatiser ce processus en enregistrant une règle pour sauvegarder automatiquement les nouvelles mémoires proposées lorsqu'une réponse est terminée, permettant ainsi un flux de sauvegarde automatique).*

**Hermes** — autonome. L'agent décide de quoi écrire et quand, limité uniquement par les plafonds de caractères. Aucune approbation humaine dans la boucle principale.

---

### Modèle de rappel

**Engram** — routage à la demande. `engram load "<tâche>"` reclasse les candidats par étiquettes, type, récence, graphique et signaux vectoriels optionnels, puis injecte un pack compact (par défaut : 8 fichiers) dans le contexte.

**Hermes** — injection toujours active. Les fichiers principaux sont figés dans le prompt système au début de la session. Un fournisseur externe facultatif (par exemple, agentmemory) exécute une pré-lecture avant chaque tour de LLM et se synchronise après.

---

### Quand utiliser lequel

**Utilisez Engram** lorsque vous avez besoin d'une mémoire auditable et vérifiée par un humain ; d'un partage d'équipe via Git ; de garanties de confidentialité ; ou d'une portabilité indépendante de l'agent entre les outils (avec la possibilité d'automatiser les sauvegardes via des règles personnalisées).

**Utilisez Hermes** lorsque vous souhaitez une mémoire qui s'accumule automatiquement sans discipline de sauvegarde, une injection de contexte toujours active ou un environnement d'exécution plus riche avec des visualisateurs, une API REST et des backends vectoriels enfichables.

---

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

Suivant : retour à [l'Accueil](../intro.md).
