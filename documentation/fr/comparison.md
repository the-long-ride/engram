# Comparaison, Avantages, Limites Et Roadmap

Engram optimise la propriété humaine, la revue et la portabilité.

## Avantages

- Markdown comme source de vérité.
- Approbation humaine avant écriture durable.
- Historique Git et synchronisation.
- Workspace-first, global-fallback.
- Indépendant des agents.
- Sécurité: schema, secret scan, injection scan, hashes, ignore rules.
- Pas de daemon, base de données ou cloud obligatoire.
- Import, observe, archive, graph, benchmark et repair pour maintenance.

## Limites

- Moins automatique que les systèmes daemon.
- Recherche lexicale, pas encore semantic embedding-backed.
- Graph vectors = hashed word vectors locaux.
- Détection de contradiction heuristique.
- `deduplicate --semantic` utilise une similarite locale deterministe, sans embeddings externes.
- Pattern mining, encryption config et PR workflow ne sont pas encore des workflows complets.

## Face A Agentmemory

[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) est un moteur automatique pour coding agents avec serveur, MCP/hooks/REST, adaptateurs, benchmarks, viewer, replay, hybrid retrieval et intégration Hermes.

Choisissez agentmemory pour capture automatique, replay, vector retrieval et nombreux outils MCP.

Choisissez Engram pour un protocole lisible dans le repo: Markdown d'abord, approuvé par l'humain, revu dans Git et portable sans serveur.

| Dimension | Engram | agentmemory |
| --- | --- | --- |
| Source | Markdown approuvé | Serveur/store |
| Confiance | Approbation A/B/C | Capture auto + governance |
| Mode défaut | Protocole fichiers | Service recommandé |
| Revue | Git diff + Markdown | Viewer/API/sessions |
| Idéal pour | ownership et audit | recall auto et replay |

## Face A La Mémoire Intégrée

La mémoire intégrée est pratique mais liée à un host. Engram garde l'autorité dans des fichiers contrôlés par l'humain.

## Roadmap

- Embeddings locaux optionnels.
- Diagnostics de routage plus explicites.
- Benchmark fixtures versionnés.
- Meilleur workflow de contradiction.
- Plus de variantes d'import agentmemory.
- Fournisseur optionnel d'embeddings externes pour le dedupe semantique.
- Repair qui propose des corrections.
