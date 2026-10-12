---
id: run-tests-before-commit
type: rule
scope: workspace
tags: [testing, commit, ci, unit-tests]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
---

# Rule: Run Tests Before Commit

## Context

Broken builds on the main branch slowed the team down twice in one quarter.

## Content

- Run the unit test suite locally before every commit; do not rely on CI to find failures.
- Add or update a test for each bug fix and each new behavior.
- Never skip tests with `--no-verify` unless the failure is unrelated and documented in the pull request.

## Example

Use this rule when preparing a commit or a pull request.
