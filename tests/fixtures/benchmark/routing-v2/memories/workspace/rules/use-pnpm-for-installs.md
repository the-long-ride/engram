---
id: use-pnpm-for-installs
type: rule
scope: workspace
tags: [pnpm, package-manager, install, lockfile, dependencies]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
---

# Rule: Use Pnpm For Installs

## Content

- Install dependencies with `pnpm install --frozen-lockfile`; never run `npm install` or `yarn` in this repository.
- Commit `pnpm-lock.yaml` together with every `package.json` change.
- Add new packages with `pnpm add <name>` so the lockfile and workspace filters stay in sync.
- CI fails when the lockfile is out of date.
