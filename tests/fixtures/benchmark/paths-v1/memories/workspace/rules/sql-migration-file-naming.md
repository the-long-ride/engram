---
id: sql-migration-file-naming
type: rule
scope: workspace
tags: [sqlmigrationnaming, flywayscript]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
applies_to: ["db/migrations/*.sql"]
---

# Rule: Sql Migration File Naming

## Content

- Name each raw migration script with a UTC timestamp prefix followed by a snake_case verb phrase.
- Keep one schema change per script so a rollback script can mirror it.
