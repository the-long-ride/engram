---
id: queue-backpressure-guide
type: knowledge
scope: workspace
tags: [queue, backpressure, deadletter, consumer]
created: 2026-04-01
updated: 2026-08-01
author: dev@example.com
source: manual
confidence: high
---

# Knowledge: Queue Backpressure Guide

## Content

- Cap worker prefetch to 16 messages and route poison payloads to the dead-letter queue after three transient retries.
