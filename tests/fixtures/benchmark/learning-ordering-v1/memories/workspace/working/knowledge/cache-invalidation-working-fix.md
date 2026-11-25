---
id: cache-invalidation-working-fix
type: knowledge
scope: workspace
tags: [cache, invalidation, ttl, stampede]
created: 2026-11-20
updated: 2026-11-20
author: dev@example.com
source: agent-hook
confidence: high
tier: working
objective: task
valid_until: 2099-12-31
---

# Knowledge: Cache Invalidation Working Fix

## Content

- Active session learning: acquire the singleflight lock before repopulating hot cache keys after invalidation to prevent stampede spikes.
