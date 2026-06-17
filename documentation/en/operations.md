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
| Import and metacognize guidance | `engram take-control --all --metacognize --accept-all` |
| Restructure existing memory folder | `engram metacognize --workspace\|--global\|--all` |
| Resolve conflicts and metacognize | `engram resolve-conflicts --metacognize` |
| Inspect graph routing | `engram graph "<topic>"` |
| Check hashes | `engram verify` |
| Find malformed memory files | `engram repair` |
| Archive wrong memory | `engram archive --reason "<why>" <id-or-file>` |
| Tune rule strength | `engram set-rule-variant strict\|balanced\|light\|off` |
| Set default save target | `engram set-save-target workspace\|global\|both\|status` |
| Set compact load limit | `engram set-load-limit 1..32\|status\|reset` |
| Set automatic hook reads | `engram set-read startup\|auto\|always\|manual\|off\|status` |
| Set hook proof visibility | `engram set-proof off\|compact\|status` |
| Install agent hooks | `engram install-agent-hooks codex\|claude\|gemini` |
| Manage global profiles | `engram profile status\|create\|use\|merge` |
| Clone workspace/global memory | `engram clone-memory workspace global [--metacognize]` |

Use `save-session` for long-session memory proposals. Short form: `ss`.
Use `--query-level <n>` when the human wants the agent to mine up to n recent accessible human-agent chats instead of only the current session. Natural wording such as `engram ss -a last 50 sessions` normalizes to `engram save-session --query-level 50 --accept-all`.

Use `load --dry-run` when you want to inspect which memory files would route
without printing their contents.
`load` first anchors routing on meaningful query terms, ignoring generic memory
words such as `rule`, `knowledge`, and common stopwords. It then refines the
wider candidate pool into a compact context pack. Normal load reports selected
and total related counts, like `loaded 8 memory files / 14 total related
memories`. `load --dry-run` shows candidate counts, narrowing tags, and match
reasons; `load --all` returns every visible routed match instead of applying the
compact limit.
`workflow` and `workflows` still route to skill memories, but generic type words
do not make a broad match by themselves.

## Dependency Layers

Use `depends_on` frontmatter when a memory should build on another memory instead
of repeating it:

```yaml
depends_on: [release-foundation]
level: advanced
```

Run `engram graph --rebuild` after manual edits. The graph reports dependency
layers, and `engram load` pulls routed prerequisites into the same compact
context pack before deeper memories. Graph related edges and vector hits cannot
load unrelated memories by themselves; they only help rerank or expand memories
that already overlap meaningful query terms. Explicit `depends_on` prerequisites
may still load without their own keyword overlap.

## Upgrade Reconciliation

Use `engram upgrade` after installing a newer Engram package. The command
compares initialized memory roots from v0.0.8 onward to the current release
schema and refreshes generated HELP.md, memory indexes, graph files, eligible
vector sidecars, generated workspace skillsets, global memory scaffolding, and
registered global agent skillsets while preserving human-authored files. Normal
commands also run the same root reconciliation quietly once per package version unless
`--no-auto-upgrade` or `ENGRAM_NO_AUTO_UPGRADE=1` is set.
When `engram save` finds related active memories, the approval preview reports
them with a suggested `depends_on` or possible-duplicate warning. Accepting saves
the preview as-is; reject first if you want to restructure dependencies or
archive duplicates before saving.
For `save-session --accept-all`, Engram pauses before writing when those related
memory hints appear. The agent should use the response to brainstorm a structured
rerun: add `DEPENDS_ON: memory-id` for dependencies, `LEVEL: advanced` when a
memory is deeper than its prerequisite, or `UPDATE: memory-id` when a candidate
should merge into a possible duplicate.

## Profiles, Save Targets, And Clone

Use `set-save-target` to choose where normal saves go:

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

Use `profile` when personal, company, or team global memory must stay isolated:

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

Use `clone-memory` to copy active `rules/`, `skills/`, and `knowledge/`
Markdown between workspace and global scopes:

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
```

Add `--metacognize` when you want cloned memories proposed through the
save-session approval flow instead of copied verbatim.

## Metacognize Memory

Use `metacognize` when you want an AI agent to review an existing Engram memory
folder and propose safer structure through the same save-session approval flow:

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --accept-all
```

The command verifies active `rules/`, `skills/`, and `knowledge/` memories in the
selected scope, returns a compact source pack when candidates are not provided,
then writes only generated `TYPE: ... | TEXT: ...` lines after approval. Agents
should use `UPDATE: memory-id` for consolidation or wording cleanup and
`DEPENDS_ON: memory-id` for layered memories. Natural wording such as
`engram restructure workspace memory accept all` normalizes to
`engram metacognize --workspace --accept-all`.

## Save Session

Use `save-session` when a long interaction produced multiple candidates:

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` is optional. Add it only when it explains why the memory exists,
the source situation, intended use, or boundary. Simple factual memories can omit
it and use Engram's default approval context.

Without `--accept-all`, Engram asks which candidates to save. With `ss -a`, every generated candidate is saved because the human explicitly approved that shortcut.
When an accept-all run reports related memories before writing, no file was
saved yet. The agent should rerun with structured candidates such as:

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

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
engram take-control --all --metacognize --accept-all
```

Saved take-control memories record `source_files` and `source_hashes`, so unchanged sources are skipped later.
Use `--metacognize` with human-requested accept-all when related-memory hints
should pause the write and let the agent rerun with `UPDATE` or `DEPENDS_ON`.

## Resolve Conflicts With Metacognition

Use `resolve-conflicts` to preview or resolve only Engram-owned workspace memory
conflicts. Add `--metacognize` when an agent should review the memory folder
after conflict handling:

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
engram resolve conflicts and metacognize
```

The command keeps deterministic conflict handling scoped to `.agents/.engram/`,
then appends the workspace metacognize source pack for concise `TYPE/TEXT`
candidates.

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
