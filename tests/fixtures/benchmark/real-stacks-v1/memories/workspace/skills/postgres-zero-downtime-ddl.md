---
schema_version: 3
id: postgres-zero-downtime-ddl
type: skill
scope: workspace
tags: [postgres, migration, ddl, alter-table, lock-timeout]
applies_to: [supabase/migrations/**/*.sql]
created: 2026-04-10
updated: 2026-05-20
author_name: Engram Fixture
author_email: fixture@example.com
source: manual
confidence: high
authority: instruction
revision: 1
valid_from: 2026-04-10
last_confirmed: 2026-05-20
---

# Skill: Postgres Zero-Downtime DDL Migrations

## Content

- Set a short `SET lock_timeout = '2s';` at the top of every production DDL migration so blocked `ALTER TABLE` statements fail fast instead of queueing traffic.
- Build indexes with `CREATE INDEX CONCURRENTLY` outside explicit transaction blocks.
- Use expand-and-contract steps when renaming or dropping columns on active tables.

## Example

```sql
SET lock_timeout = '2s';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_org_id ON public.orders (org_id);
```
