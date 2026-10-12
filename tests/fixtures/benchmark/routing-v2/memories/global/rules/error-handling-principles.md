---
id: error-handling-principles
type: rule
scope: global
tags: [errors, exceptions, handling, resilience]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
---

# Rule: Error Handling Principles

## Content

- Fail fast on programmer errors and handle expected failures explicitly.
- Never swallow exceptions silently; log with context or rethrow.
- Return typed errors across module boundaries instead of raw exception messages.
