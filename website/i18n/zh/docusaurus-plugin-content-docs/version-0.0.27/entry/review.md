---
title: Review tab
sidebar_position: 5
description: Resolve review findings, direct an AI agent, and explicitly confirm fallback memory writes.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Review tab

Review is the controlled path for findings and deferred candidates. It never calls an AI provider itself. You inspect context, copy a bounded prompt to an AI agent, then either let that agent save through its terminal or explicitly confirm a pasted response.

## Queue and context

The queue combines review findings and deferred inbox candidates. Select an item to inspect its summary, linked-memory metadata, and full content. Empty or unavailable linked files are reported without stopping review of the remaining queue.

## AI review prompt

Choose any linked memory as a dependency or replacement, then use **Copy AI review prompt**. The prompt includes only the selected candidate, visible memory context, relation instructions, and the required write scope.

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
