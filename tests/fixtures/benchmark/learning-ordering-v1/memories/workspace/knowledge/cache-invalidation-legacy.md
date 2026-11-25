---
id: cache-invalidation-legacy
type: knowledge
scope: workspace
tags: [cache, invalidation, ttl, stampede]
created: 2024-03-01
updated: 2024-03-01
revision: 1
author: dev@example.com
source: manual
confidence: medium
---

# Knowledge: Cache Invalidation Legacy

## Content

- Legacy cache invalidation cleared the entire Redis namespace on every catalog write with a fixed 300s TTL.
