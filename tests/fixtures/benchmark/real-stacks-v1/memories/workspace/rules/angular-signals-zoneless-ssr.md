---
schema_version: 3
id: angular-signals-zoneless-ssr
type: rule
scope: workspace
tags: [angular, signals, zoneless, ssr, hydration, prerender]
applies_to: [src/app/**/*.ts]
created: 2026-04-10
updated: 2026-05-20
author_name: Engram Fixture
author_email: fixture@example.com
source: manual
confidence: high
authority: instruction
revision: 1
valid_from: 2026-04-10
last_confirmed: 2026-05-20
---

# Rule: Angular Signals And SSR Hydration Safety

## Content

- Build standalone Angular components with Signals and `computed` for zoneless change detection compatibility.
- Guard browser-only globals (`window`, `document`, `localStorage`) with `isPlatformBrowser` or `afterNextRender` so SSR prerender and hydration never mismatch.
- Avoid mutating DOM structure outside Angular templates during initial hydration.

## Example

```ts
readonly count = signal(0);
readonly doubled = computed(() => this.count() * 2);
```
