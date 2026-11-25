---
schema_version: 3
id: pgvector-hnsw-cosine-tuning
type: knowledge
scope: workspace
tags: [pgvector, embedding, cosine, postgres, indexing]
created: 2026-04-10
updated: 2026-05-20
author_name: Engram Fixture
author_email: fixture@example.com
source: manual
confidence: high
authority: reference
revision: 1
valid_from: 2026-04-10
last_confirmed: 2026-05-20
---

# Knowledge: pgvector HNSW Cosine Index Tuning

## Content

- Use `vector_cosine_ops` with HNSW indexes (`m = 16`, `ef_construction = 64`) for normalized semantic embeddings in Postgres.
- Tune `hnsw.ef_search` per query transaction when higher recall is needed on filtered vector searches.
- Keep embedding model dimensions pinned in migration metadata so vectors from mismatched models never mix.
