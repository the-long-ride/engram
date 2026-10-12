---
schema_version: 3
id: angular-standalone-components
type: rule
scope: workspace
tags: [angular, standalone, signals, components, frontend]
created: 2026-04-12
updated: 2026-05-20
author_name: Example Dev
author_email: dev@example.com
source: manual
confidence: high
authority: instruction
revision: 1
valid_from: 2026-04-12
last_confirmed: 2026-05-20
---

# Rule: Angular Standalone Components

## Content

- New Angular components are standalone and use `ChangeDetectionStrategy.OnPush`.
- Prefer signals and `computed` for local state; avoid manual subscriptions in components.
- Use the `inject()` function instead of constructor injection in new code.
- Templates use the built-in control flow (`@if`, `@for`) rather than structural directives.
