---
title: Write path and approval
sidebar_position: 6
description: Agents propose, humans approve. Only approved memory is written, then indexes, graph, hashes, and changelog refresh.
---

# Write path and approval

The write flow is the trust boundary. Agents propose, humans approve.

## Write flow

1. Agent proposes one or more candidates.
   With `save-session --query-level <n>`, the agent may consider up to n recent accessible human-agent chats, but only as proposal context.
   Natural `/engram ss -f last 50 sessions` is the same scope plus explicit accept-all approval: `engram save-session --query-level 50 --force`.
2. Engram parses candidate type and target scope.
3. Engram checks schema, secrets, prompt-injection patterns, and path safety.
4. Human sees a preview.
5. Direct CLI replies use `A`, `A 1,3`, `B <note>`, or `C`.
6. AI-agent chat replies use `yes`, `audit`, or `cancel` after the exact displayed candidates.
7. Only approved memory is written.
8. Index, graph, hashes, and changelog are refreshed.

## Approval words

Approval words are `yes`, `approve`, `confirm`, or `save`. Audit words are `audit`, `revise`, `correct`, or edited replacement text. Cancel words are `cancel`, `stop`, or rejection. Only approval after exact candidate display authorizes `engram save-session --force` for those candidates.

Direct terminal CLI remains A/B/C. MCP proposal tools remain no-write.

## Related-memory hints

When `engram save` finds related active memories, the approval preview reports them with a suggested `depends_on` or possible-duplicate warning. Accepting saves the preview as-is; reject first if you want to restructure dependencies or archive duplicates before saving.

For `save-session --force`, Engram pauses before writing when those related memory hints appear. The agent should use the response to brainstorm a structured rerun: add `DEPENDS_ON: memory-id` for dependencies, `LEVEL: advanced` when a memory is deeper than its prerequisite, or `UPDATE: memory-id` when a candidate should merge into a possible duplicate.

## Safety checks at save time

- Schema validation
- Secret scan
- Prompt-injection scan
- Path safety
- Hash integrity

## Why this matters

Without a protocol, memory can become invisible state. Invisible state is hard to review, hard to share, and easy for agents to poison by accident.

Engram makes memory boring on purpose: files, diffs, hashes, review gates, and commands a human can rerun.

## Next steps

- [Privacy, ignore rules, and safety](safety.md)
- [CLI: save / save-session / observe](../cli/save-session.md)

