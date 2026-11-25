---
schema_version: 3
id: deno-edge-function-cold-starts
type: knowledge
scope: workspace
tags: [edge-function, deno, supabase, cold-start, bundle]
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

# Knowledge: Deno Edge Function Cold Starts

## Content

- Keep Supabase Edge Function imports minimal and prefer Web Standard APIs over heavy Node compatibility polyfills.
- Initialize clients outside the request handler so warm isolates reuse connection pools.
- Pin Deno import map versions to avoid runtime resolution delays during cold starts.
