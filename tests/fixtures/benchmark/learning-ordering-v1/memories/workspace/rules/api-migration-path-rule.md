---
id: api-migration-path-rule
type: rule
scope: workspace
tags: [apimigration, schemafile]
created: 2026-01-15
updated: 2026-06-01
author: dev@example.com
source: manual
confidence: high
applies_to: ["src/api/migrations/*.ts"]
---

# Rule: Api Migration Path Rule

## Content

- Keep API migration scripts reversible with explicit up and down handlers in `src/api/migrations/`.
