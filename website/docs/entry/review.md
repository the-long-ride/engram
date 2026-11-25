---
title: Review tab
sidebar_position: 5
description: Resolve review findings, direct an AI agent, and explicitly confirm fallback memory writes.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Review tab

Review is the controlled path for findings and deferred candidates. It never calls an AI provider itself. You inspect context, copy a bounded prompt to an AI agent, then either let that agent save through its terminal or explicitly confirm a pasted response.

## Queue and context

The queue combines session-learning receipts, deferred inbox candidates, and review findings. Filter the list with the queue filter pills: **All**, **Session learning**, **Deferred**, and **Findings**.

Select an item to inspect its summary, linked-memory metadata, and full content. Empty or unavailable linked files are reported without stopping review of the remaining queue.

You can also triage from the keyboard:

- `j` / `k` — move to the next or previous queue item
- `a` — approve the selected receipt
- `d` — dismiss the selected item

## Receipt approval and dismissal

For `session-learning` receipts, you can apply approved candidates directly without copying a prompt:

- **Approve receipt** applies the currently selected `session-learning` receipt via `POST /api/review/apply`.
- **Approve N** bulk-approves all checked inbox receipts in one `POST /api/review/apply` request.
- **Dismiss** removes a single item from the queue without writing a memory.

## AI review prompt

The **02 Review prompt** section is collapsible so you can keep it closed during fast receipt triage and expand it when an item needs agent review. Choose any linked memory as a dependency or replacement, then use **Copy AI review prompt**. The prompt includes only the selected candidate, visible memory context, relation instructions, and the required write scope.

When the AI agent has terminal access and approval to write, it should save the sanitized result with the command embedded in the prompt. The in-app path is a fallback, not an autonomous write path.

## Paste, diff, and confirmation

Paste only the AI-reviewed memory proposal. Review shows a read-only line diff: removed lines are red and added lines are green. **Approve & write** opens a confirmation dialog before Engram validates and writes the proposal.

<RiskCallout level="risky">
The confirmation writes to workspace or global memory immediately. Review the proposal, scope, and any replacement instruction before confirming.
</RiskCallout>

Only one replacement relation may be selected. Dependencies can be selected independently. Refresh the queue after saving to load its current state.

## Next steps

- [Construct tab](construct.md)
- [Memories tab](memories.md)
- [CLI: save-session](../cli/save-session.md)
