# Engram

![Engram cover](media/cover/engram-cover.png)

**Engram is a human-owned memory protocol for AI agents.**

It gives agents memory without giving agents ownership of memory. Durable rules, workflows, and project knowledge live as readable Markdown, reviewed by humans, portable through Git, and usable by any agent that can read files.

## What It Is

Engram is a knowledge memory center for project, workspace, team, and personal context.

It is not a hidden agent brain. It is not a vendor memory silo. It is not a database that only one tool understands.

Engram's contract:

- **Markdown is durable memory.**
- **JSON index and graph are acceleration layers.**
- **Approval is the trust boundary.**
- **Hashes are integrity checks.**
- **Ignore rules are privacy controls.**
- **Git is portability and audit history.**
- **Agent adapters are convenience, not authority.**

The core principle: **agents can suggest memory, but humans own what becomes memory.**

## Why It Exists

AI agents forget decisions, repeat setup questions, and carry useful lessons only inside one chat, one vendor account, or one machine. That is convenient until a team needs to review, share, correct, or remove memory.

Engram moves memory into files:

| Need | Engram answer |
| --- | --- |
| Remember project rules | Store approved Markdown in `.agents/.engram/` |
| Share with a team | Review and sync through Git |
| Use across agents | Install skillsets or let agents read/export Markdown |
| Keep personal preferences | Use optional global memory |
| Avoid silent writes | Require A/B/C approval |
| Remove wrong memory | Archive after review, keep history |
| Find broken memory | Run `engram repair` |

Workspace memory loads first. Global memory is fallback.

## AI-Agent Quickstart

Use Engram through your agent first. CLI commands are still available, but the normal daily flow should feel like this:

```text
Use Engram for this task. Load memory for: <what we are doing>.
```

With slash adapters installed:

```text
/engram load "<current task>"
```

When useful durable knowledge appears:

```text
/engram save knowledge
```

When a whole session produced several rules, facts, or workflows:

```text
/engram save-session
/engram ss
```

When you explicitly approve every agent-recommended candidate:

```text
/engram ss -a
```

For an existing repo with `AGENTS.md`, `CLAUDE.md`, Cursor rules, notes, or docs:

```text
/engram take-control --plan
/engram take-control --all
```

For maintenance:

```text
/engram verify
/engram repair
/engram graph "<topic>"
/engram quality-check
```

Install flow:

```bash
npx @the-long-ride/engram init
engram help install-skillset
engram install-skillset <your-agent>
```

## Documentation

Detailed usage moved into `documentation/`.

| Language | Start here |
| --- | --- |
| English | [documentation/en/index.md](documentation/en/index.md) |
| Vietnamese | [documentation/vi/index.md](documentation/vi/index.md) |
| Spanish | [documentation/es/index.md](documentation/es/index.md) |
| French | [documentation/fr/index.md](documentation/fr/index.md) |
| Chinese | [documentation/zh/index.md](documentation/zh/index.md) |
| Korean | [documentation/ko/index.md](documentation/ko/index.md) |
| Japanese | [documentation/ja/index.md](documentation/ja/index.md) |
| Russian | [documentation/ru/index.md](documentation/ru/index.md) |

Each language includes overview, understanding, AI-agent quickstart, protocol, operations, and comparison pages.

## Pros

- Plain Markdown source of truth.
- Human approval before durable writes.
- Git-friendly review, history, sync, and recovery.
- Workspace-first with optional global fallback.
- Agent-agnostic: Codex, Claude, Cursor, Gemini, Copilot, OpenCode, Antigravity, Cline, Windsurf, and file-reading agents can all use it.
- Safety layers: schema validation, secret scan, prompt-injection scan, hashes, ignore rules.
- Useful maintenance flows: observe, take-control, graph, archive, benchmark, repair.
- No required daemon, database, or cloud account.

## Cons

- Less automatic than memory engines that capture everything in the background.
- Default search is deterministic lexical search; `search --semantic` adds deterministic local similarity, not embedding-backed semantic search.
- Graph vectors are local hashed word vectors, not semantic embeddings.
- Contradiction detection is heuristic and advisory.
- `deduplicate --semantic` uses deterministic local similarity, not external embeddings.
- Pattern mining, encrypted storage, and full PR automation are design areas, not complete runtime workflows yet.

## Compared With Agentmemory

[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) is a strong automatic memory engine for coding agents, with server-style memory, MCP/hooks/REST integration, replay/viewer flows, benchmark claims, hybrid retrieval, and integrations such as Hermes.

Engram chooses a different center of gravity.

| Dimension | Engram | agentmemory |
| --- | --- | --- |
| Source of truth | Human-approved Markdown | Memory server/store |
| Trust boundary | A/B/C approval before writes | Automatic capture plus tool governance |
| Default shape | File protocol, no daemon required | Running service recommended |
| Review model | Git diff and Markdown review | Viewer/API/session history |
| Best for | human-owned team memory | automatic recall and replay |
| Main risk | requires save discipline | can become invisible state without governance |

Use agentmemory when you want automatic capture, replay, vector retrieval, and many live memory tools.

Use Engram when you want memory to be boring in the best way: files, review, hashes, Git, and human ownership.

## Compared With Tolaria

[refactoringhq/tolaria](https://github.com/refactoringhq/tolaria) is a strong desktop app for managing Markdown knowledge bases. It is files-first, Git-first, offline-first, standards-based, and designed for large personal or team vaults that can also become useful context for AI agents.

Engram sits lower in the stack. It is not a desktop knowledge-base app; it is a memory protocol, CLI, and agent skillset for governed agent memory.

| Dimension | Engram | Tolaria |
| --- | --- | --- |
| Source of truth | Human-approved memories in `.agents/.engram/` | Markdown vault notes with YAML frontmatter |
| Primary interface | CLI, slash adapters, MCP-style wrapper, and agent-readable Markdown | Cross-platform desktop app |
| Write model | Agents propose; humans approve durable memory writes | Humans directly manage a Markdown knowledge base |
| Scope | Rules, workflows, skills, and project/team/personal agent memory | Broad personal or team knowledge bases and second brains |
| Runtime shape | No required daemon, database, cloud account, or desktop app | Tauri desktop app for macOS, Windows, and Linux |
| Best for | Auditable memory governance across agents and repos | Browsing, editing, and organizing large Markdown vaults |
| Main risk | requires save discipline | more app surface than needed if you only want an agent memory protocol |

Use Tolaria when you want a full desktop home for Markdown notes, vault navigation, and keyboard-first knowledge work.

Use Engram when you want agent memory as a small governed protocol with approval gates, hashes, Git diffs, and installable agent instructions.

## Compared With Built-In Agent Memory

Built-in AI-agent memory is convenient, but often locked to one host. It may be hard to diff, export, audit, share, or correct.

Engram treats built-in memory as a convenience layer, not authority. The authority is the memory folder humans can inspect.

## License

[GPL-3.0 License](LICENSE)
