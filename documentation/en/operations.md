# Operations Guide

This page holds detailed usage so the README can stay short.

## Command Surface

| Need | Command |
| --- | --- |
| Load task memory | `engram load "<task>"` |
| Preview routed memory files | `engram load --dry-run "<task>"` |
| Search memory | `engram search "<topic>"` |
| Save one memory | `engram save [rule|workflow|knowledge] "<text>"` |
| Save several session memories | `engram save-session` or `engram ss` |
| Mine recent accessible chats | `engram save-session --query-level 3` |
| Accept all session candidates | `engram ss -a` |
| Mine and accept recent chats | `engram ss -a last 50 sessions` |
| Capture raw note | `engram observe --file session.md` |
| Convert existing docs/guidance | `engram take-control --all` |
| Preview source takeover | `engram take-control --plan` |
| Inspect graph routing | `engram graph "<topic>"` |
| Check hashes | `engram verify` |
| Find malformed memory files | `engram repair` |
| Archive wrong memory | `engram archive --reason "<why>" <id-or-file>` |
| Tune rule strength | `engram set-rule-variant strict|balanced|light|off` |

Use `save-session` for long-session memory proposals. Short form: `ss`.
Use `--query-level <n>` when the human wants the agent to mine up to n recent accessible human-agent chats instead of only the current session. Natural wording such as `engram ss -a last 50 sessions` normalizes to `engram save-session --query-level 50 --accept-all`.

Use `load --dry-run` when you want to inspect which memory files would route
without printing their contents.
When more than 8 memories match, `load` refines the wider candidate pool into a
top-8 context pack. `load --dry-run` shows candidate counts and narrowing tags;
`load --all` intentionally returns every visible routed memory.

## Save Session

Use `save-session` when a long interaction produced multiple candidates:

```text
TYPE: rule | TEXT: Always run tests before release.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

Without `--accept-all`, Engram asks which candidates to save. With `ss -a`, every generated candidate is saved because the human explicitly approved that shortcut.
`--query-level` must be a positive integer. Agents should include only chats they can actually access and must not invent unavailable history. `engram ss -a last 50 sessions` uses `50` as the query level and `-a` as explicit human accept-all approval.

## Take Control

`take-control` helps adopt Engram in existing repos. It scans agent guidance, notes, docs, and selected files, then asks the agent for concise candidates.

Useful selectors:

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
```

Saved take-control memories record `source_files` and `source_hashes`, so unchanged sources are skipped later.

## Observe

`observe` stores sanitized raw notes in `inbox/`. Inbox notes are not active memory.

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

Use this when you want to preserve rough notes before deciding what should become durable memory.

## Repair And Review

Use `repair` after manual edits or imports:

```bash
engram repair
engram rebuild-index
engram verify
```

Use graph and quality checks before archiving:

```bash
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Next: [Comparison and roadmap](comparison.md).
