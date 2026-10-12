---
id: payment-retry-backoff-policy
type: knowledge
scope: workspace
tags: [payment, retry, backoff, invoice, resilience]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
---

# Knowledge: Payment Retry Backoff Policy

## Context

Payment provider calls fail transiently during provider maintenance windows.

## Content

- Retry failed payment calls with exponential backoff starting at 2 seconds, doubling up to 5 attempts.
- Add random jitter of up to 20 percent to avoid synchronized retries.
- Only retry on timeouts and 5xx responses; never retry on validation errors.

## Example

Use this memory when adding retries to outgoing payment or invoice calls.
