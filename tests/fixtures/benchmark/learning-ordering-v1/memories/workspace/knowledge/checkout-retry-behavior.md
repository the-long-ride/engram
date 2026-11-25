---
id: checkout-retry-behavior
type: knowledge
scope: workspace
tags: [checkout, retry, idempotency, backoff]
depends_on: [checkout-base-contract]
created: 2025-06-10
updated: 2025-06-10
author: dev@example.com
source: manual
confidence: high
---

# Knowledge: Checkout Retry Behavior

## Content

- Checkout retries back off exponentially on 503 responses while preserving the original idempotency key from the base contract.
