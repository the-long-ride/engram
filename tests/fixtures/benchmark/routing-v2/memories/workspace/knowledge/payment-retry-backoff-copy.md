---
id: payment-retry-backoff-copy
type: knowledge
scope: workspace
tags: [payment, retry, backoff, invoice, resilience]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
---

# Knowledge: Payment Retry Backoff Copy

## Content

- Retry failed payment calls with exponential backoff starting at 2 seconds, doubling up to 5 attempts.
- Add random jitter of up to 20 percent so retries are not synchronized.
- Only retry on timeouts and 5xx responses, never on validation errors.
