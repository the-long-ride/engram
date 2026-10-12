---
title: Hooks and proof lines
sidebar_position: 12
description: Engram agent hooks inject routed memory at session start and prompt turns. Proof lines make injection visible.
---

# Hooks and proof lines

Agent hooks are opt-in host hooks that inject routed Engram context at session start and later task-change turns when the host exposes a safe prompt-time context channel.

## Install hooks

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

Use `--global` for user-level config and `engram unlink` to remove only Engram-managed hook entries.

## Read mode

`engram set-read startup|auto|always|manual|off` controls runtime behavior:

- `auto` loads on session start and on later prompt turns, injecting only memory bodies that were not already delivered in the session.
- `startup` loads only at session start.
- `always` reinjects on every eligible turn.
- `manual` and `off` reduce automation.

The hook cache stores hashes, session ids, host, cwd, and the memory keys already delivered per session — never raw prompt text.

## Delta injection

For each (host, cwd, session) the hook records the keys it has delivered. A prompt turn injects only the bodies not yet delivered and ends with one `already loaded: <ids>` line for the rest; a turn with nothing new injects only that line (with the proof line, when proof is on), and a turn that routes nothing injects no memory. `SessionStart` and `PreCompact` reset the set, so memory is delivered again after a new session or a context compaction. Records older than 7 days are pruned and at most 200 are kept. OpenCode keeps a single system-prompt slot, so its plugin replaces or retains the current slot instead of sending a strict delta.

## Payload caps

Hosts truncate oversized hook output, so the hook measures the rendered `additionalContext` in each host's own unit: at most 2,400 tokens on Codex (UTF-8 bytes / 4; Codex limits a message to about 2,500 tokens), at most 9,500 characters on Claude (limit 10,000), and `load.max_tokens` elsewhere. When the text is over the cap the hook re-plans with a smaller budget, so bodies demote to one-line cards and the lowest-ranked cards are left out; a body is never cut mid-text. The same cap covers `SubagentStart` and path-trigger output, and only the bodies actually sent are recorded as delivered. The `already loaded:` ids are sorted and the proof `sig` hashes the sorted routed keys, so the same routed set always prints the same bytes.

## Path-scoped triggers

Claude, Codex, and Gemini hook installs also register a path trigger. Codex always uses `PreToolUse` and Gemini uses `AfterTool`. Claude uses `InstructionsLoaded` under `hooks.path_rules native` (the default) and `PreToolUse` under `hooks.path_rules hook`:

- Claude `InstructionsLoaded` (matcher `path_glob_match`, async, output ignored) fires when Claude loads a generated `.claude/rules/engram/<id>.md` file, and records that memory in the delivered set and `usage.json`. The rule file itself carries the body, so nothing is injected twice.
- Claude `PreToolUse` (hook mode) matches `Read`, `Edit`, `Write`, and `MultiEdit` and uses `tool_input.file_path`.
- Codex has no read or multi-edit tool and `PreToolUse` does not fire on reads, so only files edited through `apply_patch` trigger.
- Gemini `AfterTool` (matcher `read_file|write_file|replace`, timeout in milliseconds) reads the touched path from the tool input and appends the memories to the tool result, so they arrive one step after the read. Gemini's matcher is an unanchored regex, so the hook also starts for tools whose names merely contain `replace`; it exits with `{}` for them. It shares the delivered set with `BeforeAgent`.

When the touched path (relative to the working directory) matches the `applies_to` globs of a memory that was not yet delivered, the hook injects up to 3 bodies per event as `additionalContext`. It never returns a permission decision, so it cannot block a tool call, and paths outside the working directory are ignored. Prompt text that names a real file path also counts as an anchor for `applies_to` memories.

Run `engram upgrade --latest` (or `engram link <host>` again) once to add the path trigger (`InstructionsLoaded` or `PreToolUse`) and `PreCompact` (Gemini: `PreCompress`) to an older install; an existing Claude install switches from `PreToolUse` to `InstructionsLoaded` on that refresh, so run `engram config set hooks.path_rules hook` first to keep `PreToolUse`; plain `engram upgrade` does not refresh hook configs. Claude, Codex, and Cursor read the hook `timeout` in seconds; managed entries write `10`.

## Subagents

Claude and Codex hook installs also register `SubagentStart` (matcher `*`, every agent type). It injects the routed `current session` context into the subagent as additional context and never returns a decision. Subagent hooks carry the parent `session_id`, so the subagent's delivered set is keyed `<session_id>#agent:<agent_id>` and the parent's set is never touched; at most 100 subagent records are kept so they cannot evict parent sessions. Codex `SubagentStart` output omits `suppressOutput`, which Codex does not list for that event. The same payload cap applies. Known gap: Codex does not document `agent_id` on `PreToolUse`, so a path trigger inside a Codex subagent may be recorded in the parent's delivered set.

## Session transcript queue (opt-in)

`engram link claude --session-end` and `engram link codex --session-end` also register a `SessionEnd` command hook (Claude timeout 5 seconds, Codex 3 seconds). It is a plain command hook: it injects nothing, answers `{}`, fails open, and only appends `{ transcript_path, host, session, at }` to the gitignored `session-queue.json` in the workspace memory folder. Entries are written under a file lock, deduplicated on host and session, and capped at the newest 50. The flag is off by default, `engram upgrade` never adds it (an existing entry is kept), `engram unlink` removes it, and Gemini is not registered. The stored path is absolute and names your OS user, which is why the file never leaves your machine.

Drain the queue with `engram observe --queue` (`--dry-run` only inspects, `--limit n` caps entries per run). Each transcript must exist, be a regular file (not a symbolic or hard link), and be at most 5 MiB. It is redacted, stripped of injection-like lines, and stored as a trace plus an inbox wrapper that never names the absolute path. Entries that were skipped or stored leave the queue; entries that hit the inbox quota (`max_files` in the optional `.agents/engram.transcripts.json`) stay. No memory is written: promote an inbox file with `engram save-session --file <inbox file>` and the normal approval gate. Run `observe --queue` yourself or from a plain command hook, not from an async Codex hook.

## Proof mode

`engram set-proof off|compact` controls whether supported hooks also append a compact `Engram proof:` line on each eligible turn. Proof visibility is separate from `set-read`: `compact` can report loaded, reused, or skipped turns without changing when full Engram memory is injected.

## Hook capability matrix

| Host | Config path | Events |
| --- | --- | --- |
| `codex` | `.codex/hooks.json`; global `~/.codex/hooks.json` | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PreCompact`, `SubagentStart` (opt-in `SessionEnd`) |
| `claude` | `.claude/settings.json`; global `~/.claude/settings.json` | `SessionStart`, `UserPromptSubmit`, `InstructionsLoaded` (`PreToolUse` when `hooks.path_rules hook`), `PreCompact`, `SubagentStart` (opt-in `SessionEnd`) |
| `gemini` | `.gemini/settings.json`; global `~/.gemini/settings.json` | `SessionStart`, `BeforeAgent`, `AfterTool`, `PreCompress` |
| `cursor` | `.cursor/hooks.json`; global plugin `hooks/hooks.json` | `sessionStart` |
| `windsurf` / `cascade` | `.windsurf/hooks.json`; global `~/.codeium/windsurf/hooks.json` | `pre_user_prompt` |
| `opencode` | `~/.config/opencode/plugins/engram.js` | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | None written | N/A |
| `cline` | None written | N/A |

## Next steps

- [Agent Integrations overview](overview.md)
- [CLI: inject / link / upgrade](../cli/inject-link-upgrade.md)
