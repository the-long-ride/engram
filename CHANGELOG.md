# Changelog

## Unreleased

### Hooks

- Added the opt-in `SessionEnd` transcript queue. `engram link claude --session-end` and `engram link codex --session-end` register a plain `SessionEnd` command hook (Claude timeout 5 s, Codex 3 s) that appends `{ transcript_path, host, session, at }` to the gitignored scope-root `session-queue.json` (under a file lock, deduped on host and session, newest 50 kept) and injects nothing; it answers `{}` and fails open. The flag is off by default, `engram upgrade` never adds it (an existing entry is kept), `engram unlink` removes it, and Gemini is not registered. Stored paths are absolute and name your OS user, so the file stays local; `session-queue.json`, its lock, and temp files are in the managed scope `.gitignore`.
- Added `engram observe --queue [--dry-run] [--limit n]`, which drains that queue: each transcript must exist, be a regular file (not a symbolic or hard link), and be at most 5 MiB; it is redacted, stripped of injection-like lines, and stored as a trace plus an inbox wrapper without the absolute path. Skipped and stored entries leave the queue, entries that hit the inbox quota (`max_files` and `max_chars` from the optional `.agents/engram.transcripts.json`) stay, and no memory is written, so promotion still goes through `observe --propose` or `save-session`. Do not run `--queue` from an async Codex hook.

### Working tier

- Added `engram working note "<text>" [--objective <text>] [--type knowledge|rule] [--scope workspace|global]` and the MCP tool `engram_note` (`text`, `objective`, `type`, `scope`; returns `{id, file, valid_until}`). A note is redacted, refused if it contains instruction-like lines, and written to the gitignored `working/` tier with `source: note`, `tier: working`, `valid_until`, and the objective. It never matches or updates a durable memory with the same id, and `engram promote` stays the only bridge to durable memory.
- Both paths use one yes/cancel approval and write nothing on cancel. `engram_note` reuses the elicitation, `input_required`, and `approval_token` flows, has `readOnlyHint: false` and no `destructiveHint`, and is appended to both protocol eras' tool lists.
- SessionStart leaves a note out unless `ENGRAM_SESSION_OBJECTIVE` matches the note's objective; otherwise it appears as a card.
- Changed the contract line to "Never write durable memory silently; working-tier notes are gitignored, expire, and are redacted." in `docs/SKILLSET_CONTRACT.md`, `llm.txt`, and the generated skillset text.

## 0.0.29

### Retrieval and load

- Added tiered agent disclosure to `engram load`: the top `load.expand_top` hits (default 3) render as bodies under `### <id> [<type>, <authority>]`, every other selected hit plus up to 5 omitted candidates render as one-line cards (`- <id> [<type>] <directive-or-summary>`, with ` (stale)` when sources changed), and the output ends with `fetch: engram load --id <ids>`. Frontmatter, `## Context`, `## Example`, and `## Origin` are no longer rendered for agents. `--full`, `--all`, `--id`, `--disclosure full`, and `load.disclosure: full` keep the untiered output.
- Agent-rendered memory bodies are LF-only, so a Windows checkout with `core.autocrlf` no longer spends a token on every carriage return.
- Added `engram load --id`, `--disclosure auto|full`, and `--exclude-keys`; `--budget-tokens` is now a hard cap on the complete tiered output (bodies become cards first, then the lowest-ranked cards are left out, and shed ids are reported as `omitted_ids`).
- Replaced the ranking with BM25 (light stemming) over id, tags, `directive`, summary, triggers, and content terms, scaled by lifecycle, staleness, confidence, and scope, plus a small usage boost. Expired `valid_until` memories are excluded with omission reason `lifecycle`; queries with four or more anchors need two anchor hits or a strong-field hit, and vector hits without a term overlap no longer admit a memory.
- Added optional frontmatter `directive` (up to 160 characters), `applies_to` (globs), `tier` (`durable` or `working`), and `objective` (up to 200 characters). `schema_version` stays 3 and memories without them behave as before.
- Added `engram stats --usage` and a gitignored `usage.json` that counts injections and explicit `load --id` fetches; fetched memories get a small ranking boost.
- Benchmark (`routing-v2`, 27 cases, `engram benchmark ... --json`), measured before and after this release:

  | Metric | Before (Task 2 baseline) | After |
  | --- | --- | --- |
  | `tokens_mean` | 904.259 | 389.259 |
  | `tokens_p95` | 1175 | 765 |
  | `recall_at_k` | 0.962 | 1.0 |
  | `precision_at_k` | 0.152 | 0.202 |
  | `forbidden_hits` | 0 | 0 |

- Benchmark: added `hook_tokens_mean` and `hook_tokens_p95` (tokens a simulated hook session injects: SessionStart plus 3 prompt turns through the hook's delta planner), and the `path-trigger` and `working-expired` case categories with the `expect_omitted` case field. Both categories report in separate `path_trigger` and `lifecycle` blocks, so `tokens_mean` and `recall_at_k` still cover routed cases only. Their fixtures live in `tests/fixtures/benchmark/paths-v1`.

### Hooks and path triggers

- Hook injection is now a per-session delta: the cache stores the delivered memory keys per (host, cwd, session), later prompt turns inject only undelivered bodies, and the rest collapse into one `already loaded: <ids>` line. `SessionStart` and `PreCompact` reset the set; records older than 7 days are pruned and at most 200 are kept. Turns that route nothing inject no memory.
- Added path-scoped memory: Claude and Codex hook installs register `PreToolUse` (Claude `Read|Edit|Write|MultiEdit`, Codex `apply_patch` edits) and inject up to 3 undelivered memories whose `applies_to` globs match the touched file. The hook never returns a permission decision. `PreCompact` is registered for both hosts. `engram upgrade --latest` or `engram link <host>` adds the new events to existing installs; plain `engram upgrade` does not refresh hook configs.
- Claude and Codex hook installs also register `SubagentStart` (matcher `*`), which injects the routed `current session` context into each subagent. Subagent hooks carry the parent `session_id`, so the delivered set is keyed `<session_id>#agent:<agent_id>` and the parent's set is never touched; at most 100 subagent records are kept so they cannot evict parent sessions. Codex `SubagentStart` output omits `suppressOutput`. `engram upgrade --latest` or `engram link <host>` adds the event to existing installs; `engram unlink` after rolling back to an older version leaves the `SubagentStart` group behind, and it is harmless.
- Added native path rules: `engram link claude` writes one `.claude/rules/engram/<id>.md` per workspace-scope memory with `applies_to` (paths-only frontmatter with quoted globs, then an `<!-- engram:<scope>:<file> sha:<8> -->` marker), and `engram link cursor` writes `.cursor/rules/engram/<id>.mdc` (`alwaysApply: false`, comma-joined globs, brace-expanded). Working-tier memories and, outside `link --global claude`, global memories are never written to these committed folders; global memories go to `~/.claude/rules/engram/`. Only files that carry the Engram marker are ever rewritten or removed, `engram unlink` removes them, and `engram sync`, `rebuild-index`, `set-read`, and `upgrade --latest` keep them current. Rule files are emitted only while the read mode is `auto` or `always`.
- Added the `hooks.path_rules` config key (`native` default, `hook`; also in the web config editor). Under `native` the Claude hook install registers `InstructionsLoaded` (matcher `path_glob_match`, async, output ignored) in place of `PreToolUse`: it adds the loaded rule's memory key `<scope>:<file>` to the delivered set (session id via `deliveredSessionId`) and counts it in `usage.json`, so rule-file loads and prompt-turn injection never repeat a body. Codex keeps `PreToolUse`. Hosts that retire an event keep removing the old managed entries on refresh, unlink, and detection.
- Compatibility: after `engram upgrade --latest` or `engram link claude`, existing Claude installs lose the managed `PreToolUse` entry and gain `InstructionsLoaded`. To keep the old behaviour run `engram config set hooks.path_rules hook && engram link claude` (this also removes the generated Claude rule files). Brace globs in Claude rule files need Claude Code v2.1.217 or newer. A global-only Claude link writes no workspace rules; run `engram link claude` per workspace. If your repo uses CRLF checkouts, add `*.md text eol=lf` to `.gitattributes` so rule-file hashes stay stable.
- Added Gemini path triggers: the Gemini hook install registers `AfterTool` (matcher `read_file|write_file|replace`, timeout in milliseconds) and injects up to 3 undelivered memories whose `applies_to` globs match the file the tool touched, as `hookSpecificOutput.additionalContext` appended to the tool result. It shares the per-session delivered set with `BeforeAgent`, so a body is never repeated, and `PreCompress` re-arms it. `engram upgrade --latest` or `engram link gemini` adds the event to existing installs.
- Fixed `dir/**` ignore and `applies_to` patterns matching sibling directories that share a prefix.
- `read: always` again re-injects every routed body on each eligible prompt; only `auto` applies the per-session delta.
- Gemini installs register `PreCompress` (fired before the CLI summarizes history), which resets the delivered set like `PreCompact`; `link gemini` and `upgrade --latest` add it to existing installs.
- Cursor hooks now write `timeout: 10`: Cursor reads the value in seconds; `link cursor` and `upgrade --latest` correct older `10000` entries.
- Hook installers no longer overwrite a host settings or hooks file that does not parse as a JSON object (for example `.gemini/settings.json` or `.claude/settings.json` with a syntax error); the target is reported as `SKIPPED` and the file is left byte-identical.
- The hook cache (`agent-hook-cache.json`) is in the managed scope `.gitignore`, and hooks never create `.agents/.engram` in a repo that only uses global memory (such a repo keeps no delivered-set cache, so `auto` re-injects on every eligible prompt there). Temp files from atomic sidecar writes (`*.json.*.tmp`) are ignored too.
- The hook cache, `usage.json`, and `pending-approvals.json` read-modify-writes now run under a cross-process `<file>.lock` (stale after 10 s; `*.json.lock` is gitignored), so parallel hooks no longer drop each other's sessions or usage rows. Hooks and usage fail open (a busy lock skips the write); approval tokens fail closed, and one token can be redeemed only once even across processes.
- Hook payloads stay under host caps: `additionalContext` is at most 2,400 tokens on Codex (measured as UTF-8 bytes / 4, the conservative reading of Codex's ~2,500-token limit) and 9,500 characters on Claude (limit 10,000); other hosts stay within `load.max_tokens` for the complete text, proof line included. When the rendered text is over the cap the hook re-plans with a smaller budget (up to 3 times), so bodies demote to cards and lowest-ranked cards are left out; a body is never cut mid-text. The cap applies to `SessionStart`, prompt, `SubagentStart`, and path-trigger output, and the delivered set and `usage.json` record only what was sent. Under the default 1,600-token budget nothing changes.
- The `already loaded:` ids are now sorted, and the proof `sig` is a hash of the sorted routed keys instead of the text, so the same routed set prints the same bytes on every `SessionStart` (hook_tokens_mean and tokens_mean are unchanged on `routing-v2`: 1183.926 and 389.259).
- `engram export` without `--out` writes the JSON bundle to the gitignored `.agents/.engram/exports/` instead of the current directory, because the bundle keeps live working memories and their objective. Without a workspace Engram folder it still writes to the current directory but leaves working memories out; an explicit `--out` prints how many working memories the bundle contains.

### Integrations and MCP

- Instructions: one canonical guide per install (`.agents/engram.md` or the host's guide file) holds the workflow; `SKILL.md` files and slash adapters are short pointers. With hooks installed, the guide says context is auto-injected instead of asking the agent to run `engram load` at session start.
- MCP: `engram_load`, `engram_search`, and `engram_route` return structured data (`selected_keys`, `body_keys`, `card_ids`, `omitted_ids`, `tokens`, and scored `entries`); read tools carry `readOnlyHint`; `ping`, `resources/list`, and `prompts/list` are answered; a malformed JSON line returns `-32700` and the server keeps running.
- Added `engram_commit` for MCP-only hosts. `engram_save` and `engram_save_session` return a single-use, 30-minute `approval_token` (stored only as a hash in the gitignored `pending-approvals.json`); `engram_commit` writes through the `save-session --force` path after the human approves in chat. The token is returned to the agent and proves only that a proposal exists, not that a human approved it: the human gate is the host's per-tool permission prompt, so do not allowlist or auto-approve `mcp__engram__engram_commit`. Its tool description now says hosts should require per-call user permission.
- The `npx` MCP launcher is pinned to the installed release (`@the-long-ride/engram@<version>`) instead of whatever `npx -y` resolves; `engram upgrade` and `engram link <host>` re-pin existing `.mcp.json`, `.cursor/mcp.json`, `.gemini/settings.json`, and Codex managed entries. An installed `engram-mcp` on `PATH` is still used unpinned.
- MCP config is written where each host reads it: Gemini to `mcpServers` in `.gemini/settings.json` and `~/.gemini/settings.json`, Codex to a managed block in `~/.codex/config.toml`, and Claude Code's user scope through a printed `claude mcp add --scope user engram -- engram-mcp` hint. The server command is `engram-mcp` when it is on `PATH`, otherwise the `npx` form. Existing `.mcp.json`, `.cursor/mcp.json`, and Gemini settings are merged instead of skipped.
- `engram_commit` now carries `_meta["anthropic/requiresUserInteraction"]: true` so Claude Code prompts on every call, and the managed Codex MCP block adds `[mcp_servers.engram.tools.engram_commit]` with `approval_mode = "approve"` (`engram upgrade` or `engram link codex` refreshes older blocks). `engram doctor` warns (`host.gemini_trust`) when a Gemini `mcpServers.engram` entry sets `trust: true`.
- `engram_save` lists the three memory types (`workflow` is still accepted as an alias for `skill`); `engram_status` declares a strict empty input schema.
- `engram_search` and `engram_route` now run their underlying command once instead of twice per call.
- Claude and Codex hooks now write `timeout: 10` (seconds). Earlier installs wrote `10000`, which those hosts read as seconds; `engram upgrade --latest` or `engram link <host>` corrects it.
- MCP: the server now speaks both protocol eras. A request whose `params._meta` carries `io.modelcontextprotocol/protocolVersion` is served statelessly under MCP 2026-07-28 (`server/discover`, `tools/list`, `tools/call`); results carry `resultType: "complete"` and serverInfo in `_meta`, and `tools/list` adds `ttlMs` and `cacheScope`. An unsupported modern version returns `-32022` with `data.supported` and `data.requested`; a missing `clientCapabilities` returns `-32602`. Legacy `initialize` flows are unchanged except that the protocol version is negotiated (see Compatibility notes). Stdout carries only JSON-RPC, one message per line.
- MCP: `initialize` and `server/discover` now return `instructions` (at most 512 characters, one constant): when to use the engram tools to recall and save project knowledge, and that `engram_commit` needs the human. `engram-mcp --always-load` marks `engram_load` with `_meta["anthropic/alwaysLoad"]: true` (merged with any existing `_meta`) so Claude Code loads it upfront instead of behind tool search; unknown options are ignored with a note on stderr. `engram link` adds the flag only to Claude-read MCP configs (`.mcp.json` and the printed `claude mcp add --scope user` hint) when no Engram Claude hook is installed or being installed; Codex, Cursor, Gemini, and Windsurf configs never get it. An existing `engram` entry in `.mcp.json` changes only on `--force`, `engram upgrade`, or a refresh, so toggling Claude hooks later does not rewrite it by itself.
- MCP: memories are now resources and the proposal flow is a prompt. Both eras advertise `resources` and `prompts`. `resources/list` returns `engram://index` (one-line cards) plus the top `mcp.resource_limit` memories (default 20, 0 to 200, JSON config only), ranked by local injected + fetched usage; working-tier, ignored, superseded, and archived memories are never listed. `resources/templates/list` returns `engram://memory/{id}`, and reading it returns the same guarded body as `engram load --id` and counts as a fetch in `usage.json`. The `propose` prompt returns the shared memory proposal protocol. A missing resource is `-32602` with `data.uri` on 2026-07-28 and `-32002` for legacy clients, never an empty `contents`. Card text, descriptions, and flagged-body notices are redacted and injection-scanned.
- MCP: saves can be approved in the host's own dialog. When the client declares form elicitation (`capabilities.elicitation` at `initialize`, or the 2026-07-28 per-request `clientCapabilities`), `engram_save` and `engram_save_session` ask the human to pick the candidates (numbers plus `ADD`/`UPDATE` and id titles only, never memory text) and a save scope; `accept` writes exactly the selected candidates through the same path as `engram_commit`. `decline` revokes the proposal, so `engram_commit` can no longer redeem its token (`approval was declined in the approval dialog`), and an invalid answer revokes it too. `cancel`, a 60 s timeout, or a client error fall back to today's chat `approval_token` text, prefixed with a note that nothing was saved. Legacy clients get an `elicitation/create` request over stdio; 2026-07-28 clients get an `input_required` result (MRTR) whose `requestState` is an HMAC-sealed envelope with an expiry, bound to the tool, workspace, and arguments, and a forged, expired, or mismatched state is `-32602` with nothing written. The raw token never reaches the client in either dialog flow. Clients without the capability, calls without a session, and `engram-mcp --no-elicitation` keep the token flow byte for byte. The stdio loop now answers requests concurrently, routes client replies by id, drops late or unknown replies, and honours `notifications/cancelled` (a cancelled call sends no response and revokes its proposal).
- Bootstrap: `engram link claude` now writes the managed block to `AGENTS.md` (plus `.agents/engram.md` and `.claude/engram.md`) and no longer creates `CLAUDE.md`. A block goes into `CLAUDE.md` or `.claude/CLAUDE.md` only when that file already exists and does not import `@AGENTS.md`; an existing block is refreshed and never removed, and `engram upgrade` reports `CLAUDE.md block kept`. `link` also reports a `CLAUDE.local.md`, or a CLAUDE.md in a parent directory up to the git root, that makes Claude Code skip AGENTS.md. The AGENTS.md block is byte-identical whichever target writes it. The global `~/.claude/CLAUDE.md` block is still created, because Claude Code reads no user-level AGENTS.md. `engram unlink claude` removes the AGENTS.md block only when no other linked target still uses it, and a plain `engram upgrade` no longer repoints a shared AGENTS.md block at the OpenCode guide.
- Generated `SKILL.md` files now follow the Agent Skills spec (`name` equals the directory, description 1-1024 characters; non-Claude files carry spec fields only). The Claude pointer skill (`.claude/skills/engram/` and `~/.claude/skills/engram/`) gains `when_to_use` and `user-invocable: true`, and the `.claude/commands/engram.md` and `.opencode/commands/engram.md` command files gain a `description` frontmatter, so Claude no longer lists the generator comment as the `/engram` description (the Cursor command stays plain). `engram link <host> --force` or `engram upgrade --latest` refreshes existing files. `engram doctor` reports `host.skill_frontmatter`: one warning per field of an Engram-generated `SKILL.md` that breaks the spec (user-authored skills are never checked), or a pass summary.
- `engram doctor` reports `host.agents_md_chain`: the size of the Codex AGENTS.md chain (global file plus one file per directory from the git root to the working directory) against `project_doc_max_bytes` (32 KiB default, or the value in Codex's `config.toml`), warning at 80%.
- Export: `engram export --format cursor-rules` replaces `cursorrules` (the generated `.cursor/rules/engram.mdc` is no longer an unnamed manual rule: it now starts with `.mdc` frontmatter holding `description` and `alwaysApply: false`). `cursorrules` stays an accepted alias for one release and prints `cursorrules is deprecated; use --format cursor-rules` on stderr when passed to `--format`; persisted `live_sync.targets` values are normalised silently, and the default target list now says `cursor-rules`. The live-sync overwrite guard now recognises generated files from any Engram version and files whose header follows the frontmatter, and still refuses human-authored files.

### Host-native integration and MCP

Summary of the host-native work (details are in the sections above and below; each bullet names the commit scope):

- Hook payloads: respect host caps and keep `SessionStart` bytes stable (Codex 2,400 tokens, Claude 9,500 characters).
- Subagents: `SubagentStart` for Claude and Codex.
- Native rules: Claude `.claude/rules/engram/` and Cursor `.cursor/rules/engram/` rule files plus Claude `InstructionsLoaded`, with `hooks.path_rules` to opt back into `PreToolUse`; Gemini `AfterTool` path triggers.
- Bootstrap: `AGENTS.md` first, `CLAUDE.md` only where it already exists; spec-valid `SKILL.md` files validated by `engram doctor`; the `cursor-rules` export name.
- MCP: 2026-07-28 next to the legacy handshake, server `instructions` and `--always-load`, resources and the `propose` prompt, `_meta["anthropic/requiresUserInteraction"]` on `engram_commit` with Codex `approval_mode` and the Gemini `trust` doctor check, and elicitation approval with `--no-elicitation`.
- Memory hygiene: save verdicts, render-time rule variants, no author email in memory files by default, backups moved out of memory folders, the vector layer off by default for new configs, and the unused `prompts/` folder removed from the package.
- Host memory: `take-control --from claude-auto-memory|codex-memories`.
- Not in this release: the `SessionEnd` transcript queue and `engram_note` are deferred until the maintainer decides whether a transcript-path queue and gitignored working-tier notes are acceptable. Also not done: removing the Claude `PreToolUse` path (planned one release after native rules), moving the live-sync `cursor-rules` target off `.cursor/rules/engram.mdc` (it collides with the file `engram link cursor` writes), removing the `cursorrules` alias (next release, with a `live_sync.targets` config migration), `PreCompress` and `AfterTool` in `renderGeminiHookConfig`, translated copies of most of the new documentation (the localized pages under `website/i18n` are English copies of the current docs; only configuration-upgrades (vi, zh, ko, ja, ru) and evidence-traces, git-author-settings, and release-upgrade (zh, ko, ja, ru) are translated), and excluding `docs/superpowers` from the published package (`npm pack` still includes it).

### Take-control, working memory, and freshness

- `engram take-control` gained `--kind docs|code|config|all` (default `docs`, output unchanged), `--objective "<text>"`, `--budget-tokens`, `--max-sources`, `--json` with `--plan`, and `--refresh`. Code is digested as signatures, doc-comment first lines, and imports (shown as a per-directory repo map), config as keys plus allowlisted values; every digest is redacted. Walks skip files over 256 KB, binary files, and build output directories.
- The candidate grammar accepts `OBJECTIVE: task|durable`, `SCOPE: workspace|global`, `APPLIES_TO: <globs>`, and `DIRECTIVE: <line>`.
- Added a working-memory tier: `OBJECTIVE: task` candidates save to the gitignored `working/` directory with `tier: working` and `valid_until` = today + `load.working_ttl_days` (default 14). Added `engram promote <id>` (A/B/C approval) and `engram working prune [--dry-run]`. Working memories never reach Git or committed sidecars.
- Added source-hash freshness: `engram verify --sources` re-hashes `source_files` against `source_hashes` and records stale memories in a gitignored `stale.json`; stale memories rank lower and show ` (stale)`; `take-control --refresh` proposes `UPDATE:` candidates for them only. Code, config, and manifest memories hash their digest (`source_hash_mode: digest`), so formatting-only edits are not stale.
- Added `engram take-control --from claude-auto-memory|codex-memories`: it reads a host-local memory store for review, never writes into it, and goes through the same approval gate. Claude auto memory comes from `~/.claude/projects/<project>/memory/` (or `autoMemoryDirectory` from your user or local Claude settings; a value only in the repository `.claude/settings.json` is ignored), Codex memories from `~/.codex/memories/`; `--dir` overrides the store when it cannot be found unambiguously. `type: feedback` proposes a rule, `project` and `reference` propose knowledge, and `type: user`, untyped files, and the `MEMORY.md` index are skipped. Imports are redacted and injection-filtered, and record `source: host-memory` with preset-relative `source_files` (never a home path), raw `source_hashes`, and a `source_origin` hash of the store path. `verify --sources` checks drift only on the machine that holds the store (elsewhere: `host memory store not on this machine`), and `--refresh` ignores them. There is no Gemini preset.
- `verify --sources` and `take-control --refresh` never read source files that match Engram ignore rules (such as `*.secret` or `private/**`); they are reported as unchecked.
- `engram sync` and `export --format agents-md|claude-md|cursorrules` leave working memories out; the JSON bundle keeps live working memories and drops expired ones. A working-tier import no longer marks its sources as already imported, and `--objective` scans re-read imported guidance.
- Code and config scans skip tool cache and IDE directories (`.angular`, `.nx`, `.turbo`, `.svelte-kit`, `.nuxt`, `.parcel-cache`, `.yarn`, `.pnpm-store`, `.gradle`, `.terraform`, `.vs`, `.idea`).
- The working tier is decided by the file location only: a durable file whose frontmatter says `tier: working` stays durable.
- `DIRECTIVE:` and `APPLIES_TO:` survive inbox receipts, `review apply`, `autosave --policy`, and the Entry review write; receipts without them keep their ids and hashes. `autosave` honours a candidate `SCOPE:` when `--scope` is omitted and denies one that contradicts `--scope`; the Entry review write rejects a contradicting `SCOPE:`.
- Added the `load.disclosure`, `load.expand_top`, and `load.working_ttl_days` config keys (`load.working_ttl_days` is also an Entry Construct field). They live in the `load` block of `engram.config.json`; `engram config set` does not accept them.

### Memory quality

- Added save verdicts. Every `save`, `save-session`, and `take-control` preview (CLI, MCP, and the Entry review write data) prints one `Verdict:` line per candidate, right after `File:`: `ADD`, `UPDATE <id>`, `SUPERSEDE <id>`, or `NOOP duplicate of <id>`. The verdict is deterministic, from the existing dedupe and related scores (no model call): `NOOP` at a related score of 1.00 (`NOOP_MIN_SCORE` 0.995) or an automatic upsert that changes nothing, `UPDATE` for an explicit `UPDATE:` (even with unchanged text, which `take-control --refresh` needs) or an automatic upsert, `SUPERSEDE` when a same-type, same-tier memory scores at least 0.6, the candidate has a different `DIRECTIVE`, and `applies_to` globs or tags overlap, otherwise `ADD`.
- `A` and `B` (without numbers) skip `NOOP` candidates and list them as `Skipped candidate <n>`; `A 1,3` writes exactly the numbered ones. Unnumbered `save` is unchanged.
- Approving a `SUPERSEDE` writes `supersedes: [old]` on the new memory and `lifecycle: superseded` plus `superseded_by` on the old one through the approved-write path (hash, index, graph, changelog, and global Git), so `engram load` drops the old memory. `save --force`, `save-session --force`, `take-control --force`, and `autosave` never apply it: it is deferred with `Action: rerun without --force to review SUPERSEDE <id>`.
- An automatic upsert no longer merges a contradicting directive into the memory it contradicts; that candidate is now a `SUPERSEDE` preview.
- MCP: `engram_save` and `engram_save_session` structured data adds `verdicts: [{candidate, scope, kind, target?}]`, the approval token pins them (they are part of its hash), and `engram_commit` applies a `SUPERSEDE` only while the recomputed verdict still matches; otherwise that candidate is not written (`Verdict changed since the proposal`). Elicitation choices are labelled with the verdict. Entry `apiReviewWrite` rows gain `verdict`.
- Rule variants are now derived at render time. New and rewritten rule files store only `## Content`; `load`, MCP `engram_load`, hooks, export, and sync render light and strict from it (balanced is Content verbatim), following `engram set-rule-variant`. Custom `LIGHT:`/`BALANCED:`/`STRICT:` wording is still stored in a `## Rule Variants` section and is kept on update. An old rule file whose stored variants equal the defaults loses the section the next time it is updated (never in bulk); old files keep parsing and routing the same until then. Save previews say `Rule variants: derived at render time` and `--show-rule-variants` lists the three derived variants. Routing is unchanged: indexing already used Content only (`routing-v2` `tokens_mean` 389.259 and `recall_at_k` 1.0 are identical).

### Safety and robustness

- Secret redaction runs in linear time on very long single lines, the secret-flag pattern also covers compound flags (such as `--client-secret` or `--api-token`), and docs digests strip URL passwords and secret flag values.
- Local sidecars (`usage.json`, `agent-hook-cache.json`, `pending-approvals.json`, `stale.json`, and the `working/` index, hash, and graph files) are written atomically through a temp file and rename, so parallel hooks can no longer wipe the usage history or leave a torn file. Writers add any missing managed `.gitignore` entries before the file first appears.
- The Codex `config.toml` table-header check no longer backtracks on very long whitespace lines.
- Migration backups no longer sit beside memories. Schema, author, and upgrade backups for memories now go to `backups/<kind>-<label>/<relative path>.<suffix>.bak` inside the scope (for example `backups/schema-v3/rules/x.md.pre-v3.bak`); the folder is in the managed scope `.gitignore`, so backups are no longer committed, synced, or picked up by tools that glob `rules|skills|knowledge`. Integration backups next to host files are unchanged. `engram doctor` warns (`memory.stray_backups`) about `*.bak` files left beside memories, and `engram repair --move-backups` plans moving them into `backups/` (add `--confirm` to move; a different file already at the destination is reported as a conflict and left in place).
- New and updated memories no longer write `author_email`: they store `author_name` only, and the email stays in the local author profile and in Engram-created Git commits. Set `memory.include_author_email: true` (`engram config set memory.include_author_email true`, the config DB, `engram.config.json`, or the Entry Memory Limits group) to keep writing it. `engram author migrate-memories --strip-email` removes `author_email` and legacy `author:` emails from existing files; it plans by default, writes only with `--confirm`, keeps `author_name`, refreshes hashes and indexes, and backs files up under `backups/author-strip-email-<date>/`. Updating an existing memory under the default drops its old `author_email`, so legacy emails fade out gradually. `author migrate-memories` (without `--strip-email`) now backfills `author_name` and writes `author_email` only when the opt-in is on.

### Compatibility notes

- Config: `vector.enabled` now defaults to `false` for new configs; workspaces whose config already stores `true` keep the layer on. The hashed 64-dimension vectors are not semantic embeddings, so the layer is documented as experimental. `engram doctor` and `engram stats` report `vector: off (experimental)` (`stats --json` gains an additive `vector: { enabled, experimental }`), and `engram doctor` explains how to turn it off when it is on. Set `vector.enabled: true` to opt in.
- CLI JSON: under the default `auto` disclosure, `engram load --json` `selected` and `entries` list the expanded bodies only, and cards are reported separately. `search --json` and `load --dry-run --json` entries gain an additive `score` field.
- MCP: `structuredContent.data.text` is no longer present for `engram_load`, `engram_search`, and `engram_route`; the text is in `content[0].text` and the structured fields are `selected_keys`, `body_keys`, `card_ids`, `tokens`, and `omitted_ids` (`entries` for search and route). Bare (non-`tools/call`) MCP requests return plain text, and JSON-RPC requests without an `id` are treated as notifications and get no response.
- `take-control --plan --json`: `budgetTokens` is `null` for the default docs scan. `verify --sources --json`: `skipped` is a list of `{key, reason}` objects.
- MCP: legacy `initialize` no longer echoes an arbitrary `protocolVersion`. A requested version in `2024-11-05`, `2025-03-26`, `2025-06-18`, or `2025-11-25` is returned as is; anything else, or a missing one, gets `2025-11-25`. In the 2026-07-28 era `ping`, `initialize`, and bare `engram_*` methods return `-32601`.
- Hooks: Claude and Codex hook timeouts are now in seconds. Global Claude linking no longer writes `~/.claude/mcp.json`, which Claude Code never read.
- `ENGRAM_TODAY` (a test clock) is honoured only when `NODE_ENV=test`.
- Backup files moved from `<memory>.pre-v3.bak` to `backups/schema-v3/<memory>.pre-v3.bak` (author migration: `backups/author-v3/<memory>.pre-author-v3.bak`; upgrade: `backups/upgrade-<version>/<memory>.engram-upgrade-<version>.bak`). Result rows (`backup` field of `migrate-memories` and the upgrade migration) are scope-relative `backups/...` paths. Existing backups beside memories stay readable; `engram repair --move-backups` relocates them.
- Candidate grammar: in the multi-line format the `OBJECTIVE:`, `SCOPE:`, `APPLIES_TO:`, and `DIRECTIVE:` fields are recognized only in uppercase; the `|` format stays case-insensitive. Under `--force`, a candidate whose `SCOPE` is outside the command scope (for example `SCOPE: global` under `--scope workspace`) is deferred instead of written.
- The agent output of `engram load` changed shape (see above). Agents that parsed the old frontmatter-per-memory output should read the new body headers and card lines or pass `--disclosure full`.
- Author metadata: new and updated memories omit `author_email` unless `memory.include_author_email: true`; legacy `author:` and `author_email` files keep loading, and a name-only `author_name` is now valid. Run `engram author migrate-memories --strip-email --confirm` to remove existing emails. Memories written by this release carry a name without an email, so they need Engram >= this release to index (an older version rejects a missing email). `audit --author` also matches the author name, and memories without an email show the name as their author.
- `engram link claude` on an existing install adds a new, committed `AGENTS.md` (harmless to Claude Code while a CLAUDE.md exists). Repos where Claude Code is the only agent no longer get a new `CLAUDE.md`; Claude reads `AGENTS.md` only when no CLAUDE.md-family file exists in the working directory or above it.
- Save verdicts: tokens issued by an older build (no pinned verdicts) still redeem but never approve a `SUPERSEDE`; a record that holds verdicts fails the hash check on an older build, which fails closed. Existing forced paths are unchanged except that a `SUPERSEDE` is deferred.
- Rule variants: a rule rewritten by this release no longer carries default Light/Strict text in the file, so an older Engram reading it renders Strict and Light as the balanced Content. Nothing breaks; custom variants are unaffected. A multi-bullet rule renders its balanced text as the Content bullets, where the old stored default joined them into one bullet.
- Deprecated: the `cursorrules` export format and `live_sync.targets` value. Use `cursor-rules`; the old name keeps working for one release.
- Package: the unused `prompts/` folder (eleven markdown templates that nothing in `src`, `scripts`, tests, or docs read) is no longer published. Guidance lives in TypeScript. A consumer that read `node_modules/@the-long-ride/engram/prompts/*` directly must copy the files it needs; MCP `prompts/list` and `prompts/get` are unchanged.

## 0.0.28

- Added canonical YAML frontmatter and schema-aware quality scoring for memory schema v3 while retaining read compatibility for v1/v2 files.
- Added immutable, sanitized, hash-verified evidence traces with session provenance, explicit authority labels, evidence references, revision arrays, and idempotent legacy observation migration.
- Synchronized evidence, revision, validity, and supersession metadata across CLI and Entry Web UI, with documentation translated for every supported docs locale.
- Released the enhancement-branch behavior and documentation as version `0.0.28`.
- Added exact version-aware reference links for every visible Construct config field and every Auto-save Policy control.
- Added a canonical Auto-save Policy reference and automated config/policy anchor drift checks.
- Documented compact default loads, broader `--full` loads, explicit force-save terminology, and dependency ordering updates.
- Renamed Entry Web UI `Maintain` tab to `Core`, compacted Global author settings layout, and restructured the Core tab with a horizontal 3-column prompt row and full-width Duplicate Candidates card.
- Standardized prompt action buttons, made panel Cards non-collapsible by default, and replaced native browser confirm popups with custom confirmation modal dialogs for AI agent unlinking.
- Fixed workspace AI agent unlinking (`apiAgentUnlink`) to always clean workspace instruction blocks, files, and hooks even when `config.scope` is `global`.
- Upgraded TypeScript to `7.0.2`, Docusaurus to `3.10.2`, `tsx` to `4.23.1`, Geist to `5.3.0`, and the requested GitHub Actions majors.
- Resolved Dependabot security alerts in both lockfiles by upgrading `js-yaml`, `pdfjs-dist`, and `svgo`, and patching `image-size` against parser denial-of-service loops.
- Added v2 benchmark report metadata validation with typed categories and token-budget fields.
- Added memory relationship bulk-linking with `engram link --parent <id> --children <id>...` (DEPENDS_ON refs), memory detail views, and enhanced memories/review maintenance flows in the Web UI.
- Improved review and config panel UX with memory comparison, properties grids, a dependency picker, and multi-choice controls.

## 0.0.27

- Added the Docusaurus docs site, release-versioned docs, and full i18n coverage for 7 locales, plus homepage, footer, mobile navigation, and copy-to-Markdown actions.
- Added docs and release automation for GitHub Actions, including docs deploy workflows, an `engram-check` action, and related-test CI support.
- Simplified `engram load`/`save` flows, added graph search modes, improved save-session `--force` handling to write ready candidates first, and deferred duplicate-memory review to explicit follow-up.
- Added stable JSON result envelopes, typed exit codes, and `--json` output across read-only commands.
- Added `engram load --explain` with direct-ID diagnosis, signal attribution, omitted-candidate reporting, and safer body-redacted explanations.
- Added `engram doctor` with composed diagnostics, strict/JSON modes, scope-aware checks, and host/linkage validation.
- Added lifecycle review flows with review frontmatter, derived findings, inbox/review records, and review CLI support.
- Added deny-by-default policy automation with quota enforcement, ID-only audit receipts, archive rollback, and contract/policy evaluation flows.
- Added opt-in sanitized transcript ingestion, retrieval benchmarks with CI gates, and host capability conformance coverage.
- Upgraded Entry/Web UI with task-oriented Recall/Review/Maintain/Connect flows, help links, dependency picker, memory diff previews, search improvements, and split panel assets.

## 0.0.25

- Corrected global OpenCode integration to always use `~/.config/opencode/` for rules, skills, plugin, and MCP configuration.
- Switched the global OpenCode default MCP config file to `~/.config/opencode/opencode.jsonc`, while still merging existing `opencode.json` files in place.
- Confirmed OpenCode local plugin setup uses `~/.config/opencode/plugins/engram.js` without adding an npm-style `plugin` entry to `opencode.jsonc`.
- Implemented the MCP JSON-RPC handshake for OpenCode by supporting `initialize`, `notifications/initialized`, `tools/list`, and `tools/call` content responses.
- Simplified generated OpenCode MCP config to `command: ["engram-mcp"]`, `args: []`, `type: "local"`, and `enabled: true`.
- Added regression coverage for global OpenCode config-home isolation, plugin installation, JSON/JSONC upgrade refresh, unlink, and web API connection flows.

## 0.0.24

- Fixed workspace-profile precedence so DB-backed config, CLI loads, MCP/shared loads, and agent-hook injections all resolve global memory with `--profile`/`ENGRAM_PROFILE`, then workspace default profile, then user default profile.
- Fixed SQLite/JSON config persistence so workspace configs keep raw `default_profile` settings without storing profile-derived `global_path` values, preventing cross-profile memory leaks after reload.
- Fixed OpenCode integration paths so workspace links use `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, and `opencode.json` or an existing `opencode.jsonc`, while global links use `~/.config/opencode/AGENTS.md`, `~/.config/opencode/engram.md`, `~/.config/opencode/skills/engram/SKILL.md`, and `~/.config/opencode/opencode.jsonc` or an existing `opencode.json`.
- Updated OpenCode hook/plugin and MCP merge flows so `engram upgrade --latest` refreshes only Engram-managed entries, preserves unrelated user settings, and skips invalid existing JSON/JSONC instead of overwriting it.
- Hardened shared JSON/JSONC merge helpers and refresh logic for other linked agents, including Cursor, Claude, Gemini, and Windsurf, so user-authored config stays intact while Engram-managed MCP and hook entries update cleanly.
- Added regression coverage for OpenCode and shared MCP refresh/force-link cases, including malformed config preservation and user-setting-safe merges.

## 0.0.23

- Added an agent chat memory approval flow so agents can propose memories through a chat approval protocol, with updated README, protocol, quickstart, skillset contract, `llm.txt`, and translated docs.
- Added `engram upgrade --latest` refresh support for linked agent integrations so generated hook and skillset files update with the latest templates.
- Improved the `/engram` slash/menu entry and upgrade hook refresh behavior, plus refreshed related integration documentation.
- Updated translated operations guides for the new approval and upgrade flows.

## 0.0.22

- Added Cursor as a `link` target: workspace rules (`.cursor/rules/engram.mdc`), MCP (`.cursor/mcp.json` with `type: "stdio"`), sessionStart hook, and guide file. Global install creates a local Cursor plugin with rules, skills, commands, MCP, and hooks.
- Added Windsurf as a `link` target: workspace rules (`.windsurf/rules/engram.md`), pre_user_prompt hook (proof-only, no AI context injection), and guide file. Global install writes global rules, MCP (`mcp_config.json` with `type: "stdio"`), and hooks. Workspace MCP is not generated for Windsurf.
- Added `cascade` as a compatibility alias for `windsurf` in both `link`/`unlink` and `agent-hook` commands.
- Shared `mergeFlatHooks`/`unmergeFlatHooks` for flat cursor/windsurf hook schemas, replacing duplicated per-target merge logic.
- Added `ensureRequiredFrontmatter` to merge `alwaysApply: true` (Cursor) and `trigger: always_on` (Windsurf) into human-authored rule files, with CRLF line-ending support.
- Added `_managedBy: 'engram'` marker to Cursor plugin.json so `unlink --global cursor` detects and removes the plugin.
- Fixed `sessionStart`/`SessionStart` case mismatch in hook runtime using `isSessionStart()` helper.
- Fixed Windsurf hook output: `shouldInject` forced `false`, output is always `{ proof }` (no AI context injection).
- Fixed `unlink --global cascade` by normalizing the alias to `windsurf` in `normalizeGlobalTarget`.
- Added 297 new tests covering Cursor/Windsurf workspace link, global link/unlink, hooks, MCP merge, frontmatter (LF/CRLF), plugin.json marker, cascade alias, and proof-only output.
- Updated all documentation (README, AGENT_INTEGRATIONS, SKILLSET_CONTRACT, llm.txt, 8-language translations) for Cursor and Windsurf.

## 0.0.21

- Restructured memory file content for `engram load` and `engram save`.
- Added sticky load/save for human requests so re-routed context stays active.
- Upgraded global link targets to minimal instruction blocks for skillsets.
- Fixed `engram link` with OpenCode and synced agent documentation.
- Enhanced save and save-session flows for Antigravity agents.
- Updated demo image.

## 0.0.20

- Added a remote origin URL input field to the Global Git settings block in the Construct tab.
- Validated remote origin URL input and updated Git config on saving changes.
- Added `--host-only` flag support for `engram entry` command to start the Web UI server without opening a browser tab.
- Added an Escape key event listener to the Memory Graph to exit fullscreen mode.
- Optimized/merged duplicate CSS rules in the Memory Graph Web UI to keep file size within static asset budgets.

## 0.0.19

- Release v0.0.19 covers the 24 commits since v0.0.18.
- Renamed `engram init` to `engram inject` as the primary initialization flow, with connection-tab setup, scope guards, and safer workspace/global linking.
- Hardened `engram entry` config editing with shared schema validation, staged browser edits, review-before-save, risky-change confirmation, and batch API updates.
- Expanded the control panel with a core dashboard tab, duplicate analysis, guarded unlink actions, copy-prefix behavior, folder-browser modal, memory-content modal, and connection sorting.
- Polished the Web UI shell with visible icons, a processor icon for Core, a lightweight SVG favicon, and better clipboard prompt text.
- Fixed Gemini/Antigravity `BeforeAgent` hook installation to include `matcher: "*"`, and blocked workspace unlink commands when the scope is `global`.
- Updated README files, `AGENT_INTEGRATIONS.md`, `SKILLSET_CONTRACT.md`, and localized docs to match the new `inject` and `entry` flows.
- Suppressed `ExperimentalWarning: SQLite` at CLI startup for cleaner command execution.

## 0.0.18

- Merged `engram install-agent-hooks` and `engram install-skillset` into `engram link`. A single `engram link` now installs skillset files, MCP config, slash adapters, and agent hooks together. `engram unlink` removes all of these together. The old command names remain as backward-compatible aliases.
- Updated all documentation (README, AGENT_INTEGRATIONS.md, SKILLSET_CONTRACT.md, llm.txt, engram-blueprint-v8.md, engram.report.md/vi.md) and 8-language translations to reflect the unified `link`/`unlink` surface.
- Removed `install-agent-hooks`/`uninstall-agent-hooks` from help topics, shell completions, and command registry while preserving CLI routing.

## 0.0.17

- Added a zero-dependency responsive Web UI served via `engram entry`.
- Added an in-app workspace initialization button and status banner in the Web UI.
- Enabled configuration editing capability directly in the Web UI.
- Added the `--for-agents` flag to `engram load` to provide slimmed memory output optimized for AI agents.

## 0.0.16

- Added `engram set-proof off|compact|status` so supported agent hooks can append a compact `Engram proof:` line showing whether Engram memory was loaded, reused, or skipped on each eligible turn.
- Kept proof visibility separate from `engram set-read`, so teams can expose proof without changing the existing hook injection rules.
- Improved broad `engram load` routing and upgrade reconciliation, including stronger query term anchoring, better dry-run reporting, and refreshed release-to-release root maintenance coverage.
- Added optional `CONTEXT: ...` support for generated save-session, take-control, and metacognize memory candidates.
- Added `engram llm` and packaged `llm.txt` so AI agents can print a stable local Engram usage guide before workspace initialization.

## 0.0.15

- Added `engram install-agent-hooks`, `engram uninstall-agent-hooks`, and the internal `engram agent-hook` runtime for opt-in Codex, Claude, and Gemini context injection.
- Extended `engram set-read` with `startup`, `auto`, `always`, `manual`, and `off` so automatic memory loading can follow host hook behavior and only reinject when routed context changes.
- Documented the v1 hook capability matrix, including Gemini as the current public Antigravity fallback and deterministic skip reasons for Cursor, Copilot, Cline, and Windsurf or Cascade.

## 0.0.14

- Bumped the package release version to `0.0.14`.

## 0.0.13

- Added `engram route` to classify tasks before the first action and surface the `task_type:*` tag a save will receive.
- Updated save flows to tag memories with `task_type:*` and prompt for an explicit task type when the text is unclear.
- Updated `engram link` to register the known MCP config for a target AI agent by default, including Gemini-compatible and Claude global paths.

## 0.0.12

- Added `engram link` / `engram unlink` as the primary agent integration
  commands for skillsets, MCP config, slash adapters, and global cleanup.
- Added global MCP config generation for supported hosts and regression
  coverage for link/unlink behavior.
- Added `engram set-read` / `engram sr` for always-read session startup,
  including auto-loading rule memories without extra approval.
- Added `engram rehash` / `engram rh` to recompute memory hashes and repair
  tampered or drifted workspace/global memory files.
- Improved broad `engram load` routing with lexical + vector blending,
  refined dry-run candidate counts, and better top-match relevance.
- Added repository metadata to `package.json` for package publishing context.
- Refreshed README and localized README comparison pages for the current Hermes Agent positioning.
- Split CLI tests into scoped files by command/feature area and updated
  `npm run test:cli` to cover `tests/cli/**/*.test.mjs`.
- Fixed MCP `tools/call` argument handling so `engram_load` uses the provided
  query instead of falling back to `current session`.

## 0.0.11

- Added `engram metacognize` / `engram mc` for memory restructuring, so
  save-session, take-control, and clone-memory can reroute related candidates
  through a separate approval pass.
- Renamed the clone-memory restructure flag to `--metacognize` and updated the
  related help, docs, and tests.
- Fixed global Copilot skillset installs to append Engram instructions to
  `~/.copilot/copilot-instructions.md`.

## 0.0.10

- Added `engram set-load-limit` / `engram ll` so normal loads can use a
  configurable compact memory cap while `--all` still loads every routed
  memory.
- Updated load summaries and dry-run output to report selected and total
  related memory counts, making agent-facing replies shorter by default.
- Updated generated agent instructions to answer load requests with a compact
  count line unless the human asks for IDs, rules, or raw memory output.
- Added MCP regression coverage for save proposals that surface related memory
  dependency hints.

## 0.0.9

- Updated `engram init` to create or select the default profile when global
  memory is configured, matching the existing upgrade migration behavior.
- Documented profile isolation as the reason profiles exist: separate company,
  client, and personal memory so context used with external APIs or
  company-provided agents does not leak across projects.
- Added missing documentation coverage for `engram profile`,
  `engram set-save-target`, and `engram clone-memory` across README,
  operations docs, and localized entrypoints.

## 0.0.8

- Added upgrade migration that creates or selects a machine-named default
  profile from an existing global memory path when older installs did not have
  profiles configured.
- Updated explicit `engram upgrade` and quiet startup auto-upgrade to preserve
  global path, save target, and global Git settings for the migrated default
  profile.
- Updated `engram upgrade` to refresh existing generated workspace skillset
  adapters, while preserving human-authored files.
- Added a README link to the GitHub changelog for release history.
- Added CLI regression coverage for legacy workspace/global and global-only
  upgrade paths.

## 0.0.7

- Added publish-only package metadata checks so README packaging regressions are
  caught before npm release.
- Updated release automation to run package checks explicitly before dry-run
  packing and keep `npm run publish` limited to the publish action.
- Enabled Test and Code Coverage workflows on every push to origin.

## 0.0.6

- Pinned optional peer dependencies for Markdown conversion and vector routing
  to the current tested releases.

## 0.0.5

- Added generated runtime version support so `engram --version` follows
  `package.json` during builds.
- Updated global skillset installs to preserve human-authored shared instruction
  files, refresh a single managed Engram block at the end, and write host
  `SKILL.md` files where supported.
- Changed Antigravity handling to keep dedicated targets as hidden
  compatibility aliases while advertising the Gemini-compatible target.
- Added `install skill set` natural parsing plus refreshed CLI help,
  completions, docs, and tests for the updated skillset behavior.

## 0.0.4

- Added configurable default save targets with `engram set-save-target
  workspace|global|both|status`.
- Changed fresh installs to default normal saves to both workspace and global
  when global memory is configured.
- Made `--scope workspace`, `--scope global`, and `--scope both` literal
  per-command save targets instead of treating workspace saves as implicit
  global copies.
- Updated CLI help, completions, MCP save proposals, README, and integration
  docs for the new save-target behavior.

## 0.0.3

- Added `engram update-global-folder` / `engram ugf` to retarget the configured
  global memory folder and optionally move an old root safely.
- Added natural phrase parsing for chat-style global memory path updates, such
  as `engram set global memory path to <path>` and
  `engram move global folder from <old> to <new>`.
- Updated README, agent integration docs, and skillset contract entries for
  global folder setup, aliases, and natural phrase usage.

## 1.0.1

- Added optional sqlite-vec routing sidecars for large workspace and global
  memory scopes while keeping Markdown as the source of truth and lexical/graph
  routing as fallback.
- Improved `engram load` for broad queries with top-8 refinement, dry-run
  candidate counts, suggested narrowing tags, and `--all` for intentional broad
  context loads.
- Added `engram save-session --query-level <n>` and natural
  `engram ss -a last 50 sessions` handling so agents can mine recent accessible
  chat sessions without inventing unavailable history.
- Added the unified `antigravity` skillset target for Antigravity 2.0, CLI, IDE,
  and `.antigravityrules`, while keeping `antigravity-cli` as a compatibility
  alias.
- Clarified `agents-md` as the generic AGENTS.md fallback target for unlisted
  AGENTS.md-compatible agents and updated the skillset list output.
- Refreshed README guidance and localized README entrypoints for recent routing,
  vector sidecar, save-session, and skillset changes.

## 0.0.1

- Added explicit agent skillset adapters for Codex, AGENTS.md-compatible agents,
  Copilot, Claude, Cursor, Gemini CLI, Cline, Windsurf, Antigravity CLI,
  OpenCode, and MCP-capable clients.
- Added agent-assisted `engram save` capture with no inline text. The agent can
  generate a concise rule, workflow/skill, or objective knowledge candidate,
  then the normal A/B/C approval gate runs before writing.
- Added `engram autosave` for long sessions with multiple proposed memory
  candidates behind the same approval gate, including `--file transcript.md`
  input and numbered approval for selected candidates.
- Added role metadata on save/autosave with `--role` and `--roles`.
- Added PowerShell support to `engram completion`, `engram -v`, short command
  aliases, and detailed `engram help <topic>` command examples and use cases.
- Added MCP proposal parity for auto-detected saves, workflow saves, roles, and
  autosave proposals.
- Added Markdown style validation before memory writes.
- Added safety, skillset, MCP, conflict-resolution, coverage, and package
  preview checks for the initial unpublished implementation.
