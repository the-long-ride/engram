---
id: checkout-idempotency-rule
type: rule
scope: workspace
tags: [checkout, idempotency, retry, payments]
created: 2025-02-01
updated: 2026-02-01
author: dev@example.com
source: manual
confidence: high
---

# Rule: Checkout Idempotency Rule

## Content

- Every checkout retry call must forward the client idempotency key header before touching payment gateways.
