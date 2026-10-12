---
name: testing feedback
description: How the team wants tests run before a merge
type: feedback
modified: 2026-09-01T10:00:00Z
---

Run the integration suite before merging.

**Why:** a green unit run once hid a broken migration.

**How to apply:** run the suite on the branch itself, not on a stale checkout.
