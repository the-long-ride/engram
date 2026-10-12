# Operations Guide

## AI-Agent Chat Approval

In AI-agent chat, Engram approval is conversational. The agent shows refined `TYPE: ... | TEXT: ...` candidates first, each with its `Verdict:` line, and the balanced wording for rules (Light and Strict are derived when the rule is rendered, unless a candidate supplies custom variants). Reply `yes` to save the exact candidates, `audit` to revise them, or `cancel` to stop. After `yes`, the agent uses `engram save-session --force` with the exact approved candidates. Direct terminal CLI saves still use A/B/C unless a force command was explicitly invoked.


This page holds detailed usage so the README can stay short.

## Command Surface

| Need | Command |
| --- | --- |
| Load task memory | `engram load "<task>"` |
| Load compact task memory | `engram load "<task>"` |
| Load with a compact token budget | `engram load --budget-tokens 800 "<task>"` |
| Load broader legacy output | `engram load --full "<task>"` |
| Load every packed body (no cards) | `engram load --disclosure full "<task>"` |
| Fetch cards by id | `engram load --id <id,...>` |
| Print AI-agent usage guide | `engram llm` |
| Preview routed memory files | `engram load --dry-run "<task>"` |
| Search memory | `engram search "<topic>"` |
| Save one memory | `engram save [rule|workflow|knowledge] "<text>"` |
| Save several session memories | `engram save-session` or `engram ss` |
| Mine recent accessible chats | `engram save-session --query-level 3` |
| Force-save session candidates | `engram ss -f` |
| Mine and force-save recent chats | `engram ss -f last 50 sessions` |
| Capture raw note | `engram observe --file session.md` |
| Drain the opt-in SessionEnd transcript queue | `engram observe --queue --dry-run` |
| Convert existing docs/guidance | `engram take-control --all` |
| Preview source takeover | `engram take-control --plan` |
| Digest code or config (repo map) | `engram take-control --kind code\|config\|all [--objective "<text>"]` |
| Check source freshness | `engram verify --sources` |
| Refresh stale code-derived memory | `engram take-control --refresh` |
| Import host-local memories | `engram take-control --from claude-auto-memory\|codex-memories [--plan]` |
| Keep a working memory | `engram promote <id>` |
| Save a task note | `engram working note "<text>"` |
| Prune expired working memory | `engram working prune [--dry-run]` |
| See fetch and inject counts | `engram stats --usage` |
| Import and metacognize guidance | `engram take-control --all --metacognize --force` |
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
| Install agent hooks | `engram link codex\|claude\|gemini\|opencode\|cursor\|windsurf` |
| Manage global profiles | `engram profile status\|create\|use\|merge` |
| Clone workspace/global memory | `engram clone-memory workspace global [--metacognize]` |

Use `save-session` for long-session memory proposals. Short form: `ss`.
Use `--query-level <n>` when the human wants the agent to mine up to n recent accessible human-agent chats instead of only the current session. Natural wording such as `engram ss -f last 50 sessions` normalizes to `engram save-session --query-level 50 --force`.

Use `load --dry-run` when you want to inspect which memory files would route
without printing their contents.
Default `load` is the AI-agent context route and uses tiered disclosure: the top
`load.expand_top` hits (default 3) print as bodies under
`### <id> [<type>, <authority>]` (plus `requires: <ids>` when the memory has
`depends_on`), every other selected hit and up to 5 omitted candidates print as
one-line cards `- <id> [<type>] <directive-or-summary>` (with ` (stale)` when its
sources changed), and the output ends with `fetch: engram load --id <ids>`.
Frontmatter, `## Context`, `## Example`, and `## Origin` are not rendered, and
rules show one selected variant. Set `load.disclosure` to `full`, or pass
`--disclosure full`, `--full`, or `--all`, to skip tiering. `--budget-tokens`
caps the complete output; cards are shed last-ranked-first only when the cards
alone exceed the cap, and shed ids are listed as `omitted_ids` in MCP results.
The MCP `engram_load` method uses the same output by default, and `full: true`
opts into the broader output. SessionStart hooks call the same routed load path
at startup; later prompt turns inject only memory bodies not yet delivered in the
session and end with `already loaded: <ids>`. `SessionStart` and `PreCompact`
reset the delivered set. Memories with `applies_to` globs are also injected on
`PreToolUse` file events (Claude `Read|Edit|Write|MultiEdit`, Codex `apply_patch`),
at most 3 bodies per event. Under `hooks.path_rules native` (the default) Claude and
Cursor load those memories as generated rule files instead: `engram link claude`
writes `.claude/rules/engram/<id>.md` and `engram link cursor` writes
`.cursor/rules/engram/<id>.mdc` (workspace-scope, non-working memories only), and
Claude registers `InstructionsLoaded` (matcher `path_glob_match`) rather than
`PreToolUse`, so the delivered set and `usage.json` still count the injection.
`engram sync`, `rebuild-index`, `set-read`, and `upgrade --latest` refresh the
files; `engram unlink` removes them. Files without the Engram marker comment are
never touched. `engram link --global claude` also writes global memories to
`~/.claude/rules/engram/`. Set `hooks.path_rules hook` and run `engram link claude`
to keep the Claude `PreToolUse` hook and drop the Claude rule files.

Opt-in `SessionEnd` queue: `engram link claude|codex --session-end` registers a plain
`SessionEnd` command hook (Claude timeout 5 s, Codex 3 s) that only appends the transcript
path, host, and session to the gitignored `session-queue.json` (newest 50, deduped) and
injects nothing. `upgrade` never adds it and Gemini is not registered. Drain it with
`engram observe --queue [--dry-run] [--limit n]`: each transcript must be a regular file
(not a link) of at most 5 MiB, is redacted and stripped of injection-like lines, and becomes
a trace plus an inbox wrapper; no memory is written, so promotion still goes through
`save-session`. Do not run `--queue` from an async Codex hook.

Other hook events: Claude and Codex also register `SubagentStart` (matcher `*`), which
injects the routed `current session` context into every subagent under its own
delivered set (`<session_id>#agent:<agent_id>`), and Gemini registers `AfterTool`
(matcher `read_file|write_file|replace`) for `applies_to` memories plus `PreCompress`
to reset the delivered set. Hook output stays under each host's payload cap: 2,400
tokens on Codex (UTF-8 bytes / 4), 9,500 characters on Claude, and `load.max_tokens`
elsewhere. Over the cap, bodies demote to cards and the lowest-ranked cards are left
out; a body is never cut mid-text, and only what was sent counts as delivered. Hooks
never return permission decisions and fail open. Run `engram upgrade --latest` (or
`engram link <host>`) to add the new events to an existing install.
`load` first anchors routing on meaningful query terms, ignoring generic memory
words such as `rule`, `knowledge`, and common stopwords. It then refines the
wider candidate pool into a compact context pack. Normal load reports selected
and total related counts, like `loaded 8 memory files / 14 total related
memories`. `load --dry-run` shows candidate counts, narrowing tags, and match
reasons; `load --all` returns every visible routed match instead of applying the
compact limit.
`workflow` and `workflows` still route to skill memories, but generic type words
do not make a broad match by themselves.

## Immutable Evidence Traces

- `traces/<trace-id>.jsonl` contains exactly one canonical record.
- Trace writes use exclusive creation and cannot overwrite an existing ID.
- `authority: evidence` is source data and never acts as an instruction.
- Transcript and `engram observe` flows sanitize content before trace persistence.
- Default transcript and observation metadata is `trust_level: human`, `sensitivity: private`, and `retention: 30d` unless configured otherwise.
- Missing or expired trace references are rejected for new approved writes.
- Existing observation wrappers remain review conveniences and point to immutable traces.
- Initialization migrates eligible legacy observation wrappers once and does not index traces as memories.

The CLI prints the trace ID created by `engram observe`. When an observation or transcript is promoted, `save-session` copies its trace IDs into `evidence_refs` and its session IDs into `derived_from`. Entry Web UI reads the same memory index as the CLI and exposes authority, evidence, revision, validity, and supersession metadata in the memory detail panel. The editable inbox wrapper is never the promotion source: Engram reloads the immutable trace, verifies its wrapper hash when present, and binds promotion to the trace's original workspace or global scope.

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

## Working Memory And Freshness

A candidate marked `OBJECTIVE: task` is saved to the gitignored working tier
(`.agents/.engram/working/`, or `<global>/working/`) with `tier: working`, the
`take-control --objective` text, and `valid_until` = today + `load.working_ttl_days`
(default 14, range 1 to 365). Working memories route like durable ones until
`valid_until` passes, then drop out of `load` with the omission reason `lifecycle`.
`engram promote <id>` moves one to durable memory after the same A/B/C approval,
`engram working note "<text>"` saves a redacted task note (`source: note`) after one
yes/cancel approval, and `engram working prune [--dry-run]` deletes expired ones.
SessionStart shows a note only when `ENGRAM_SESSION_OBJECTIVE` matches its
objective. Working memory never
reaches Git and its index, graph, and hash entries stay in local sidecars.

`take-control --kind code|config|all` saves `source_files` and `source_hashes` for
code-derived memory. `engram verify --sources` re-hashes those sources and records
changed or missing ones in the gitignored `.agents/.engram/stale.json`; stale
memories rank lower and their cards end with ` (stale)`. `engram take-control
--refresh` re-digests only those sources and proposes one `UPDATE: <id>` candidate per
stale memory. `engram stats --usage` reports which memories agents fetch with
`load --id` and which were injected but never fetched, from the gitignored
`usage.json`.

Load configuration keys: `load.disclosure` (`auto` or `full`, default `auto`),
`load.expand_top` (bodies expanded under `auto`, default 3), and
`load.working_ttl_days`. `load.working_ttl_days` is editable in the Entry Construct tab;
all three live in the `load` block of `.agents/.engram/engram.config.json`
(`engram config set` does not accept them).

## Upgrade Reconciliation

Use `engram upgrade` after installing a newer Engram package. The command
compares initialized memory roots from v0.0.8 onward to the current release
schema and refreshes generated HELP.md, memory indexes, graph files, eligible
vector sidecars, generated workspace skillsets, global memory scaffolding, and
registered global agent skillsets while preserving human-authored files. Normal
commands also run the same root reconciliation quietly once per package version unless
`--no-auto-upgrade` or `ENGRAM_NO_AUTO_UPGRADE=1` is set.
Use `engram upgrade --latest` when the new package output must overwrite current
Engram-managed linked agent artifacts. That path reapplies linked workspace
instruction files, rules, MCP/plugin config, and managed hooks, and also
refreshes registered global agent installs with the latest generated files.

### Skillset Render Profiles

For runtime-capable hosts, Engram now installs small bootstrap instructions
instead of the full protocol. Hooks provide routed task context, MCP tools
provide load/search/proposal behavior, and slash adapters or Agent Skills carry
detailed command workflows. Fallback targets without reliable runtime context
injection still receive compact manual instructions.

Claude Code's bootstrap is AGENTS.md-first: `engram link claude` writes the managed
block to `AGENTS.md` and adds a block to `CLAUDE.md` (or `.claude/CLAUDE.md`) only when
that file already exists; an existing block is refreshed and never removed. Generated
`SKILL.md` files follow the Agent Skills spec, and `engram doctor` reports
`host.skill_frontmatter` and `host.agents_md_chain` (the Codex AGENTS.md chain against
its 32 KiB limit). `engram export --format cursor-rules` replaces `cursorrules`, which
stays an accepted alias for one release.

### MCP Server

`engram-mcp` serves MCP 2026-07-28 (stateless requests carrying
`io.modelcontextprotocol/protocolVersion`, `server/discover`) and the legacy
`initialize` handshake (`2024-11-05` to `2025-11-25`) from one process. Both return short
`instructions`, advertise `resources` (`engram://index`, `engram://memory/{id}`, listing
the top `mcp.resource_limit` memories) and one prompt (`propose`). `engram_commit` carries
`_meta["anthropic/requiresUserInteraction"]` so Claude Code prompts on every call, the
managed Codex block sets its `approval_mode` to `approve`, and `engram doctor` warns when
a Gemini entry sets `trust: true`. When the client supports elicitation, `engram_save` and
`engram_save_session` ask the human in the host's own dialog (`accept` writes the selected
candidates; `decline` revokes the proposal; `cancel` falls back to the `approval_token`
flow); `engram-mcp --no-elicitation` keeps the token flow. `engram-mcp --always-load`
marks `engram_load` for Claude Code's tool search. `engram_note` saves a redacted
working-tier note after one yes/cancel approval (the same dialog, `input_required`,
or `approval_token` flow) and returns `{id, file, valid_until}`; cancel writes nothing.

### SQLite Config DB Fallback

Engram's SQLite config DB is an optimization for workspace/profile management.
If the DB cannot be opened or initialized, normal read/write commands fall back
to JSON config snapshots. DB-specific commands report SQLite as unavailable
instead of blocking normal memory use.
When `engram save` finds related active memories, the approval preview reports
them with a suggested `depends_on` or possible-duplicate warning. Accepting saves
the preview as-is; reject first if you want to restructure dependencies or
archive duplicates before saving.
For `save-session --force`, Engram writes candidates without unresolved related
memory hints and defers only conflicted candidates. Deferred output is compact and
ID-only: run the listed `engram load --id ...` command, then rerun only deferred
candidates with `DEPENDS_ON: memory-id` for dependencies, `LEVEL: advanced` when
a memory is deeper than its prerequisite, or `UPDATE: memory-id` when a candidate
should merge into a possible duplicate. Listed IDs are inspection references, not
evidence that deferred candidates were saved.

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

Profile resolution order is explicit `--profile` or `ENGRAM_PROFILE`, then the
workspace `default_profile`, then the active user profile. If workspace `W` is
pinned to profile `B` while the user default remains profile `A`, every normal
load, MCP load, and agent-hook injection for `W` reads profile `B` global memory
and never profile `A`. An explicit profile different from the workspace default
uses that profile's global memory and disables workspace memory for that command.

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
engram metacognize --all --force
```

The command verifies active `rules/`, `skills/`, and `knowledge/` memories in the
selected scope, returns a compact source pack when candidates are not provided,
then writes only generated `TYPE: ... | TEXT: ...` lines after approval. Agents
should use `UPDATE: memory-id` for consolidation or wording cleanup and
`DEPENDS_ON: memory-id` for layered memories. Natural wording such as
`engram restructure workspace memory force` normalizes to
`engram metacognize --workspace --force`.

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

Without `--force`, Engram asks which candidates to save. With `ss -f`, ready candidates are saved because the human explicitly approved that shortcut. Candidates with unresolved related-memory hints are deferred and reported with related IDs plus an `engram load --id ...` inspection command. The agent should load those IDs and rerun only deferred candidates with structured fields such as:

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

Every preview prints one `Verdict:` line per candidate, right after `File:`:

```text
Verdict: ADD
Verdict: UPDATE frontend-uses-react-and-pnpm
Verdict: SUPERSEDE use-pnpm-for-package-installs (approving marks it superseded)
Verdict: NOOP duplicate of invoice-webhook-retry-baseline (skipped unless selected)
```

The verdict comes from the existing dedupe and related-memory scores, with no model call: `NOOP` when a same-type memory scores 1.00 (or an automatic upsert would change nothing), `UPDATE` for an explicit `UPDATE:` or an automatic upsert, `SUPERSEDE` when a same-type, same-tier memory scores at least 0.6 and the candidate carries a different `DIRECTIVE` on overlapping `APPLIES_TO` globs or tags, otherwise `ADD`. `A` and `B` skip `NOOP` candidates and list them as skipped; `A 1,3` writes exactly the numbered ones. Approving a `SUPERSEDE` writes `supersedes: [old]` on the new memory and `lifecycle: superseded` plus `superseded_by` on the old one, so `engram load` drops the old memory. `--force` and autosave never apply a `SUPERSEDE`; it is deferred until you rerun without `--force` and review it.

`--query-level` must be a positive integer. Agents should include only chats they can actually access and must not invent unavailable history. `engram ss -f last 50 sessions` uses `50` as the query level and `-f` as explicit human force approval.

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
engram take-control --all --metacognize --force
```

Saved take-control memories record `source_files` and `source_hashes`, so unchanged sources are skipped later.
Use `--metacognize` with human-requested force mode when related-memory hints
should pause the write and let the agent rerun with `UPDATE` or `DEPENDS_ON`.

### Import host-local memories

Claude auto memory and Codex memories are machine-local. `--from` imports one of those stores for review instead of scanning the workspace:

```bash
engram take-control --from claude-auto-memory --plan
engram take-control --from codex-memories --dir ~/.codex/memories
```

- Claude: `~/.claude/projects/<project>/memory/` (`CLAUDE_CONFIG_DIR` replaces `~/.claude`), or `autoMemoryDirectory` from your user or local Claude settings. A value that only appears in the repository `.claude/settings.json` is ignored; pass `--dir` to use it. `type: feedback` proposes a rule, `project` and `reference` propose knowledge; `type: user` (personal profile data), untyped files, and the `MEMORY.md` index are skipped.
- Codex: `~/.codex/memories/` (or `CODEX_HOME`), Markdown files up to two levels deep; the text decides the type.
- `--dir <path>` (absolute or `~/`) overrides the store, and a store that cannot be found unambiguously asks for it. `--from` cannot be combined with `--file`, `--include`, `--exclude`, `--kind`, `--all`, `--budget-tokens`, or `--refresh`.
- Engram never writes into a host store. Every file is redacted and injection-filtered like any other source, and the normal approval gate applies.
- Saved memories record `source: host-memory`, preset-relative `source_files` (for example `claude-auto-memory/feedback_testing.md`), raw `source_hashes`, and a `source_origin` hash of the store path, so no home path or user name reaches a memory file. `engram verify --sources` checks drift only on the machine that holds the store and skips them elsewhere (`host memory store not on this machine`); `take-control --refresh` leaves them alone. A store imported with `--dir` is verified only when the default store resolves to the same directory.
- There is no Gemini preset: its inbox is already reviewed and the docs scan already covers `GEMINI.md`.

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

## Configuration

To view and manage runtime settings, use the `config` commands:

- **View active configuration**:
  ```bash
  engram config view
  ```
- **Set a configuration value**:
  ```bash
  engram config set <key> <value>
  ```

### Key Settings Reference

| Key | Description | Default | Range / Options |
| --- | --- | --- | --- |
| `memory.rule_line_target` | Recommended line count target for rule memories | `70` | `50` to `200` |
| `memory.rule_line_hard_limit` | Maximum allowed line count for rule memories | `100` | `50` to `200` |
| `memory.include_author_email` | Write `author_email` into new memory frontmatter (`author_name` is always written) | `false` | `true`, `false` |
| `mcp.resource_limit` | Memories MCP `resources/list` returns besides `engram://index`, ranked by injected + fetched usage (JSON config only; not set by `engram config set`) | `20` | `0` to `200` |
| `load.limit` | Max memories returned by normal load | `8` | `1` to `32` |
| `hooks.path_rules` | How `applies_to` memories reach Claude: `native` writes `.claude/rules/engram/` rule files and registers `InstructionsLoaded`; `hook` keeps the Engram `PreToolUse` hook. Codex always uses `PreToolUse`; Cursor rule files are written in both modes | `native` | `native`, `hook` |
| `update` | Quiet one-time package upgrade check | `auto` | `auto`, `manual`, `off` |
| `ignore.global_patterns` | Global glob patterns synchronized into each workspace `.engramignore` managed block on `engram inject` | empty | One glob per line |
| `rule_variants.enabled` | Render rule variants (light, balanced, strict) derived from the rule's Content; off renders balanced | `false` | `true`, `false` |
| `rule_variants.active` | Active rule variant mode | `balanced` | `light`, `balanced`, `strict` |
| `graph.enabled` | Enable or disable graph-aware routing | `true` | `true`, `false` |
| `graph.max_related` | Max related memories to fetch from graph edges | `8` | `1` to `20` |
| `graph.min_related_score` | Min similarity score to add graph edges | `0.3` | `0.0` to `1.0` |
| `vector.enabled` | Experimental hashed-vector search fallback (not semantic embeddings) | `false` | `true`, `false` |
| `live_sync.enabled` | Sync generated agent context files on save | `true` | `true`, `false` |
| `live_sync.targets` | Generated agent context targets refreshed by live sync | `agents-md`, `claude-md`, `cursor-rules` | Comma-separated target names |
| `global_git.enabled` | Enable global Git repo sync automation | `false` | `true`, `false` |
| `global_git.remote` | Git remote name for global sync | `origin` | String |
| `global_git.branch` | Git branch name for global sync | `main` | String |
| `pr_workflow.provider` | Experimental memory PR workflow provider | empty | String |
| `pr_workflow.repo` | Experimental memory PR workflow repository | empty | String |

These settings are also manageable visually under the **Construct** tab in `engram entry`.

The Construct tab also edits `.agents/engram.policy.json`, including autonomous-write enablement, review-only/autonomous mode, allowed type/scope/source, confidence threshold, write limits, rollback retention, and required metadata. Normal saves remain approval-based unless the policy explicitly permits an eligible autonomous write.

## Entry review queue

The Entry **Review** tab is a manual, confirmation-gated workflow for findings and deferred candidates. It previews linked memory, copies a prompt for an AI agent, and offers a pasted-response fallback. The fallback shows a read-only diff and requires explicit confirmation before it writes a sanitized, validated proposal. It does not invoke an AI provider or bypass the autonomous-write policy.

## Repair And Review

Use `repair` after manual edits or imports:

```bash
engram repair
engram rebuild-index
engram verify
```

Migration backups (`*.pre-v3.bak`, `*.pre-author-v3.bak`, `*.engram-upgrade-<version>.bak`) live in the gitignored `backups/<kind>-<label>/` folder of the scope, not beside the memories. `engram doctor` warns about older `*.bak` files left in `rules`, `skills`, or `knowledge`. `engram repair --move-backups` plans moving them into `backups/`; add `--confirm` to move them. A different file already at the destination is reported as a conflict and left in place.

Use graph and quality checks before archiving:

```bash
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Next: [Comparison and roadmap](comparison.md).
# Safe automation and team validation

Use `engram doctor --strict --json` and `engram policy validate --strict --json`
as local/CI gates. `engram benchmark <cases.json> --json --fail-on forbidden,recall`
supports versioned retrieval cases and body-free reports. Autonomous writes stay
disabled unless `.agents/engram.policy.json` explicitly enables them; inspect
receipts with `engram policy audit --json` and use `engram policy rollback <id>`
for an archive-based rollback. Transcript capture is opt-in, sanitized, and
inbox-only.

### Legacy memory migration to schema v3

`engram upgrade --latest` also migrates active v1/v2 memory files in the workspace and configured global roots to schema v3. Engram preserves each Markdown body exactly, writes `backups/schema-v3/<memory-file>.pre-v3.bak` (a gitignored folder; `engram repair --move-backups` relocates older backups left beside memories), fills only deterministic metadata, refreshes integrity hashes, and rebuilds the index, graph, and eligible vector sidecars. It never invents `evidence_refs`; a memory without verified trace links is marked `evidence_status: unverified`. Invalid memories are reported and skipped, archived memories are not rewritten, and a second run is idempotent.

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
