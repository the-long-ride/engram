---
id: git-branching-strategy
type: knowledge
scope: global
tags: [git, branching, trunk, workflow]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
---

# Knowledge: Git Branching Strategy

## Context

Teams used different branching models, which made releases hard to compare.

## Content

- Use short-lived feature branches from main and merge by pull request with squash.
- Name branches `feat/<topic>`, `fix/<topic>`, or `chore/<topic>`.
- Delete branches after merge.

## Example

Use this memory when starting or finishing a unit of work.
