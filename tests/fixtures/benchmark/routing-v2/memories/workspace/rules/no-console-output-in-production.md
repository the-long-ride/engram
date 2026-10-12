---
id: no-console-output-in-production
type: rule
scope: workspace
tags: [logging, console, frontend, production]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
---

# Rule: No Console Output In Production

## Content

- Do not leave `console.log` calls in committed frontend code.
- Use the shared `LoggerService`, which respects the configured log level per environment.
- Never log tokens, passwords, or full request bodies.
