---
title: Auto-save Policy
sidebar_position: 5
description: Configure deny-by-default autonomous writes, quotas, rollback retention, review gates, and required metadata.
---

# Auto-save Policy

The Construct tab edits `.agents/engram.policy.json`. Normal `engram save` and `engram save-session` flows remain human-approved; this policy applies only to explicitly policy-gated autonomous candidates.

## Autonomous writes

### Allow auto-save {#autonomous-writes-enabled}

Maps to `autonomous_writes.enabled`. Default: `false`. When disabled, no candidate may write autonomously.

### Write mode {#autonomous-writes-mode}

Maps to `autonomous_writes.mode`. `review_only` defers candidates for review; `autonomous` permits candidates that pass every remaining gate.

### Allowed types {#autonomous-writes-allowed-types}

Maps to `autonomous_writes.allowed_types`. Allowed values are `rule`, `skill`, `workflow`, and `knowledge`. At least one type is required.

### Allowed scopes {#autonomous-writes-allowed-scopes}

Maps to `autonomous_writes.allowed_scopes`. Allowed values are `workspace` and `global`.

### Allowed sources {#autonomous-writes-allowed-sources}

Maps to `autonomous_writes.allowed_sources`. Entry offers `autosave`, `agent-hook`, `cli`, and `mcp`; custom non-empty source strings remain valid in policy JSON.

### Confidence threshold {#autonomous-writes-confidence-threshold}

Maps to `autonomous_writes.confidence_threshold`. Allowed values are `low`, `medium`, and `high`.

### Daily write limit {#autonomous-writes-daily-limit}

Maps to `autonomous_writes.daily_limit`. Use a non-negative integer. `0` prevents autonomous writes.

### Rollback retention days {#autonomous-writes-rollback-retention-days}

Maps to `autonomous_writes.rollback_retention_days`. Use a non-negative integer that matches the period in which policy audit records should remain rollback-eligible.

## Review gates

### Review rule line limit {#review-max-rule-lines}

Maps to `review.max_rule_lines`. Rule candidates above this positive integer fail review.

### Minimum recall benchmark {#review-benchmark-min-recall-at-k}

Maps to `review.benchmark_min_recall_at_k`. Use a number from `0` through `1`.

### Require context metadata {#review-mandatory-metadata-context}

Maps to `review.mandatory_metadata.context`. When enabled, candidates without `context` metadata fail review.

### Require triggers metadata {#review-mandatory-metadata-triggers}

Maps to `review.mandatory_metadata.triggers`. When enabled, candidates without `triggers` metadata fail review.

### Require role metadata {#review-mandatory-metadata-role}

Maps to `review.mandatory_metadata.role`. When enabled, candidates without `role` metadata fail review.

## CLI workflow

```bash
engram policy init
engram policy validate --json
engram autosave --policy --dry-run
engram policy audit --json
engram policy rollback <audit-id>
```

Use dry-run before enabling autonomous mode. Audit receipts contain identifiers rather than memory bodies, and rollback archives the policy-written memory.

## Related pages

- [Construct tab](construct.md)
- [Write path and approval](../concepts/write-path.md)
- [Privacy, ignore rules, and safety](../concepts/safety.md)
