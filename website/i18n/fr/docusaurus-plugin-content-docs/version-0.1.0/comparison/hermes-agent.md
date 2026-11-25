---
title: Hermes Agent
sidebar_position: 6
description: Engram vs Hermes Agent — protocole de fichiers appartenant à l'humain vs mémoire autonome toujours active.
---

# Hermes Agent

## TL;DR

| | Engram | Hermes Agent |
|---|---|---|
| **Philosophie** | Protocole axé sur les fichiers, appartenant à l'humain (automatisation facultative) | Mémoire autonome toujours active |
| **Stockage** | Fichiers Markdown typés dans `.agents/.engram/` | `MEMORY.md` + `USER.md` (limites strictes de caractères) |
| **Modèle d'écriture** | Approuvé par l'humain par défaut (validation A/B/C ; automatisable via des règles) | L'agent écrit de manière autonome |
| **Rappel** | À la demande : `engram load "<task>"` injecte les fichiers pertinents | Toujours actif : fichiers essentiels figés dans le system prompt à chaque session |
| **Recherche vectorielle** | Sqlite-vec local facultatif (déterministe, non basé sur les embeddings) | Via fournisseur externe (par exemple, agentmemory — BM25 + vector) |
| **Multi-agent** | Tout agent lisant les fichiers peut consommer la mémoire Engram | Le noyau de Hermes est mono-agent ; multi-agent via le plugin agentmemory |
| **Portabilité** | Natif de Git, hors ligne d'abord, Markdown brut | Fichiers locaux ; les fournisseurs externes peuvent imposer un verrouillage cloud |
| **Surcharge** | Pas de démon, nécessite une discipline d'enregistrement (sauf si automatisé) | Processus serveur + visualiseur UI, API REST, serveur MCP |

## Formats de stockage

**Engram** stocke chaque mémoire sous forme de fichier Markdown typé avec un frontmatter YAML, des vérifications d'intégrité de hash et un graphe de dépendance facultatif (`depends_on`). Un index JSON, un graphe et un sidecar sqlite-vec agissent comme des couches d'accélération — Markdown est la source de vérité.

**Hermes** compresse toute la mémoire persistante dans deux fichiers limités :

- `~/.hermes/memories/MEMORY.md` — notes de l'agent, limitées à 2 200 caractères
- `~/.hermes/memories/USER.md` — profil utilisateur, limité à 1 375 caractères

Les limites strictes de caractères obligent l'agent à organiser plutôt qu'à accumuler. L'historique des sessions est interrogeable via SQLite FTS5.

## Modèle d'écriture

**Engram** — validation humaine explicite par défaut. Les agents proposent des candidats ; un humain doit approuver avant que quoi que ce soit ne soit écrit sur le disque. L'analyse des secrets et des injections de prompt a lieu au moment de l'enregistrement. Les utilisateurs peuvent choisir d'automatiser ce processus en enregistrant une règle pour enregistrer automatiquement les nouvelles mémoires proposées lorsqu'une réponse est terminée.

**Hermes** — autonome. L'agent décide quoi écrire et quand, contraint uniquement par les limites de caractères. Pas d'approbation humaine dans la boucle principale.

## Modèle de rappel

**Engram** — routage à la demande. `engram load "<task>"` reclasse les candidats par balises, type, récence, graphe et signaux vectoriels facultatifs, puis injecte un package compact (par défaut : 8 fichiers) dans le contexte.

**Hermes** — injection toujours active. Les fichiers essentiels sont figés dans le system prompt au début de la session. Un fournisseur externe facultatif (par exemple, agentmemory) exécute une pré-lecture (prefetch) avant chaque tour de LLM et se synchronise après.

## Quand utiliser lequel

**Utilisez Engram** lorsque vous avez besoin d'une mémoire auditable et révisée par des humains ; partage d'équipe via Git ; garanties de confidentialité ; ou portabilité indépendante de l'agent à travers les outils (avec l'option d'automatiser les enregistrements via des règles personnalisées).

**Utilisez Hermes** lorsque vous souhaitez une mémoire qui s'accumule automatiquement sans discipline d'enregistrement, une injection de contexte toujours active, ou un environnement d'écriture/visualisation plus riche avec des visualiseurs, une API REST et des backends vectoriels connectables.

## Étapes suivantes

- [agentmemory](agentmemory.md)
- [Présentation des comparaisons](overview.md)
