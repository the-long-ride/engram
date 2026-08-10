---
title: agentmemory
sidebar_position: 3
description: Engram vs rohitg00/agentmemory — file protocol vs automatic memory engine.
---

# agentmemory

[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) is a powerful automatic memory engine for coding agents. Its README presents server-based memory, MCP/hooks/REST integration, many agent adapters, benchmark claims, a viewer, replay, hybrid retrieval, and Hermes integration.

Use agentmemory when you want automatic capture, live viewer/replay, vector retrieval, many MCP tools, and server-style shared memory.

Use Engram when you want memory to be a repo-readable protocol: Markdown first, human approved, Git reviewed, portable across agents even without a running server.

| Dimension | Engram | agentmemory |
| --- | --- | --- |
| Source of truth | Approved Markdown files | Memory server/store |
| Trust boundary | Human A/B/C approval | Automatic capture plus tool governance |
| Default mode | File protocol, no daemon required | Running service recommended |
| Review | Git diff and Markdown review | Viewer/API and stored sessions |
| Best fit | teams that need ownership and auditability | users who want automatic recall and replay |
| Risk | more manual discipline | more invisible state unless governed carefully |

## Next steps

- [Hermes Agent](hermes-agent.md)
- [Comparison overview](overview.md)
