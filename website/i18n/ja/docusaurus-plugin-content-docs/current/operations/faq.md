---
title: FAQ
sidebar_position: 4
description: Frequently asked questions about Engram.
---

# FAQ

## Is Engram a vector database?

No. Default Engram search is deterministic lexical search. `engram search --semantic` adds deterministic local similarity, not embedding-backed semantic search. Graph vectors are local hashed word vectors, not semantic embeddings. Optional local sqlite-vec is an acceleration layer, not the source of truth.

## Does Engram write memory automatically?

No. Agents propose candidates; humans approve. Direct terminal CLI uses A/B/C. AI-agent chat uses `yes`/`audit`/`cancel`. Only explicit force requests (`ss -f`) save every candidate, and agents must not add `--force` unless the human requested it.

## Where does memory live?

- Workspace memory: `<project>/.agents/.engram/`
- Global memory: wherever you configure it (default empty until configured)

Workspace memory wins. Global memory is fallback for reusable preferences and team context.

## Which agents are supported?

Codex, Claude, Gemini (and Antigravity Gemini-compatible surfaces), Cursor, Windsurf/Cascade, OpenCode, Copilot, Cline, generic AGENTS.md-compatible hosts, MCP-capable hosts, and slash-command hosts. See [Agent Integrations overview](../integrations/overview.md).

## Is encryption implemented?

Encryption config exists, but encrypted storage is not implemented yet. Document current limitations clearly.

## Can I use Engram without Git?

Yes. Git is optional but recommended for audit history, portability, and team review.

## How do I archive wrong memory?

```bash
engram archive --reason "<why>" <id-or-file>
```

The file leaves active routing only after approval and remains preserved under `archive/`. Use archive, not delete, for auditability.

## How do I move global memory?

```bash
engram update-global-folder <new-path>
engram ugf <new-path>
engram move global folder from <old-path> to <new-path>
```

Add `--move-from-path <old-path>` when they also want Engram to move the whole old global root into the new location.


## Legacy memory migration to schema v3

`engram upgrade --latest` also migrates active v1/v2 memory files in the workspace and configured global roots to schema v3. Engram preserves each Markdown body exactly, creates `<memory-file>.pre-v3.bak`, fills only deterministic metadata, refreshes integrity hashes, and rebuilds the index, graph, and eligible vector sidecars. It never invents `evidence_refs`; a memory without verified trace links is marked `evidence_status: unverified`. Invalid memories are reported and skipped, archived memories are not rewritten, and a second run is idempotent.

Preview all changes without writing:

```bash
engram upgrade --latest --plan
```

Run only the memory migration, without overwriting linked agent artifacts:

```bash
engram upgrade --migrate-memories
```

Skip memory migration during a latest upgrade:

```bash
engram upgrade --latest --no-migrate-memories
```

## Next steps

- [Troubleshooting](troubleshooting.md)
- [Comparison and roadmap](../comparison/overview.md)


<!-- configuration-upgrade-inventory -->
## Configuration upgrade inventory

After a package update, run `engram upgrade --latest --plan` before `engram upgrade --latest`. The shared inventory scans workspace and global Engram-managed memories, instructions, skillsets, configs, hooks, and plugins. User-authored bytes are preserved; ambiguous mixed files are reported as conflicts. See [Configuration upgrades](configuration-upgrades.md).
