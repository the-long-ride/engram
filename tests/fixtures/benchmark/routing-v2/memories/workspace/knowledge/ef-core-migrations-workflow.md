---
id: ef-core-migrations-workflow
type: knowledge
scope: workspace
tags: [efcore, migrations, database, schema, dotnet]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
---

# Knowledge: Ef Core Migrations Workflow

## Content

- Create a migration with `dotnet ef migrations add <Name> --project src/Data --startup-project src/Api`.
- Review the generated SQL before committing; destructive changes need a two-step rollout.
- Migrations are applied by the deployment pipeline, never by the application at startup in production.
