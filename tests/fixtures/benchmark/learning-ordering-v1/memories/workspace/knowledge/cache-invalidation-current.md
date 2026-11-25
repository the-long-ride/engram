---
id: cache-invalidation-current
type: knowledge
scope: workspace
tags: [cache, invalidation, ttl, stampede]
created: 2026-06-01
updated: 2026-10-15
last_confirmed: 2026-10-20
revision: 3
author: dev@example.com
source: manual
confidence: high
---

# Knowledge: Cache Invalidation Current

## Content

- Current cache invalidation uses per-key versioned tags with jittered TTLs so catalog updates never flush unrelated keys.
