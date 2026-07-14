# Operations Guide

## AI-Agent Chat Approval

In AI-agent chat, Engram approval is conversational. The agent shows refined `TYPE: ... | TEXT: ...` candidates first, including Light/Balanced/Strict variants for rules. Reply `yes` to save the exact candidates, `audit` to revise them, or `cancel` to stop. After `yes`, the agent uses `engram save-session --force` with the exact approved candidates. Direct terminal CLI saves still use A/B/C unless a force command was explicitly invoked.


This page holds detailed usage so the README can stay short.

## Command Surface

| Need | Command |
| --- | --- |
| Load task memory | `engram load "<task>"` |
| Load compact task memory | `engram load "<task>"` |
| Load broader legacy output | `engram load --full "<task>"` |
| Print AI-agent usage guide | `engram llm` |
| Preview routed memory files | `engram load --dry-run "<task>"` |
| Search memory | `engram search "<topic>"` |
| Save one memory | `engram save [rule|workflow|knowledge] "<text>"` |
| Save several session memories | `engram save-session` or `engram ss` |
| Mine recent accessible chats | `engram save-session --query-level 3` |
| Force-save session candidates | `engram ss -f` |
| Mine and force-save recent chats | `engram ss -f last 50 sessions` |
| Capture raw note | `engram observe --file session.md` |
| Convert existing docs/guidance | `engram take-control --all` |
| Preview source takeover | `engram take-control --plan` |
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
Default `load` is the AI-agent context route: it keeps only `id`, `type`,
`tags`, and `confidence` in frontmatter, renders one selected rule variant, and
labels it as `## Rule variants (1/3 based on current: <active>)`.
Use `load --full` when a human wants the broader legacy output. The MCP
`engram_load` method uses compact output by default, and `full: true` opts into
the broader output. SessionStart hooks call the same routed load path at startup,
then reuse or skip it when the routed signature is unchanged.
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
| `load.limit` | Max memories returned by normal load | `8` | `1` to `32` |
| `update` | Quiet one-time package upgrade check | `auto` | `auto`, `manual`, `off` |
| `ignore.global_patterns` | Global glob patterns synchronized into each workspace `.engramignore` managed block on `engram inject` | empty | One glob per line |
| `rule_variants.enabled` | Enable or disable rule variants generation | `true` | `true`, `false` |
| `rule_variants.active` | Active rule variant mode | `balanced` | `light`, `balanced`, `strict` |
| `graph.enabled` | Enable or disable graph-aware routing | `true` | `true`, `false` |
| `graph.max_related` | Max related memories to fetch from graph edges | `8` | `1` to `20` |
| `graph.min_related_score` | Min similarity score to add graph edges | `0.3` | `0.0` to `1.0` |
| `vector.enabled` | Enable or disable vector search fallback | `true` | `true`, `false` |
| `live_sync.enabled` | Sync generated agent context files on save | `true` | `true`, `false` |
| `live_sync.targets` | Generated agent context targets refreshed by live sync | `agents-md`, `claude-md`, `cursorrules` | Comma-separated target names |
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
