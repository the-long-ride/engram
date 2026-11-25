---
schema_version: 3
id: wcag-modal-focus-trap
type: rule
scope: workspace
tags: [wcag, accessibility, a11y, aria, focus-trap, responsive]
applies_to: [src/app/components/**]
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

# Rule: WCAG Modal Focus Trap And Viewport Safety

## Content

- Every modal dialog must trap keyboard focus inside the dialog, support `Escape` dismissal, and restore focus to the trigger element on close.
- Provide `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` for screen reader accessibility.
- Ensure modal containers handle small responsive viewports without horizontal overflow.

## Example

```html
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Action</h2>
</div>
```
