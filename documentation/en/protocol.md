# Human-Owned Memory Protocol

Engram is not just "agent memory." It is a protocol that makes memory inspectable, portable, and governed by humans.

## The Contract

Markdown is durable memory.

JSON index and graph files are acceleration layers.

Approval is the trust boundary.

Hashes are integrity checks.

Ignore rules are privacy controls.

Git is portability and audit history.

Agent adapters are convenience, not authority.

Agents can suggest memory, but humans own what becomes memory.

## Memory Types

| Type | Use |
| --- | --- |
| Rule | user preference, correction, constraint, always/never guidance |
| Skill | repeatable workflow, checklist, procedure, runbook |
| Knowledge | objective project fact, decision, implementation detail |

Every active memory file has `Context`, `Content`, and `Example` sections. Rule memories also target concise line limits so loaded guidance stays useful.

## Write Flow

1. Agent proposes one or more candidates.
   With `save-session --query-level <n>`, the agent may consider up to n recent accessible human-agent chats, but only as proposal context.
   Natural `/engram ss -a last 50 sessions` is the same scope plus explicit accept-all approval: `engram save-session --query-level 50 --accept-all`.
2. Engram parses candidate type and target scope.
3. Engram checks schema, secrets, prompt-injection patterns, and path safety.
4. Human sees a preview.
5. Human replies `A`, `A 1,3`, `B <note>`, or `C`.
6. Only approved memory is written.
7. Index, graph, hashes, and changelog are refreshed.

## Read Flow

1. Engram loads workspace and optional global indexes.
2. Workspace entries win over global duplicates.
3. Ignore rules and role filters hide irrelevant entries.
4. Graph-aware routing selects a compact context pack.
5. Hash and safety checks run before content is printed.

## Why This Matters

Without a protocol, memory can become invisible state. Invisible state is hard to review, hard to share, and easy for agents to poison by accident.

Engram makes memory boring on purpose: files, diffs, hashes, review gates, and commands a human can rerun.

Next: [Operations](operations.md).
