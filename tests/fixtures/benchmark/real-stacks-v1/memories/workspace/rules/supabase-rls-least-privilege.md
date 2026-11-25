---
schema_version: 3
id: supabase-rls-least-privilege
type: rule
scope: workspace
tags: [supabase, rls, row-level-security, postgrest, permission, rbac]
applies_to: [supabase/migrations/**]
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

# Rule: Supabase RLS Least Privilege Policies

## Content

- Enable `ROW LEVEL SECURITY` on every public table exposed through PostgREST before shipping any migration.
- Scope `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies explicitly to `auth.uid()` or verified RBAC role claims.
- Never expose the Supabase service-role key to browser clients or unauthenticated endpoints.

## Example

```sql
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner read" ON public.projects
  FOR SELECT USING (auth.uid() = owner_id);
```
