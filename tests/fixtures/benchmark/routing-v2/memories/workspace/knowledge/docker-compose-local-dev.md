---
id: docker-compose-local-dev
type: knowledge
scope: workspace
tags: [docker, compose, local, development, database]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
---

# Knowledge: Docker Compose Local Dev

## Content

- `docker compose up -d` starts SQL Server, Redis, and the mail catcher for local development.
- The API connects to the database on port 14330 with the developer-only account from `.env.example`.
- Run `docker compose down -v` to reset local data.
