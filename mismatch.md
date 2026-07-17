# Docs / code mismatch inventory

Code version `0.0.27` is the source of truth. Mismatches below were fixed by updating the Docusaurus docs (current + versioned `0.0.27`) to match the code.

| # | Area | Docs claim | Current code truth | Fix |
|---|------|------------|--------------------|-----|
| 1 | Entry UI tabs | `website/docs/entry/index.md` lists 8 tabs: Construct, Recall, Review, Profiles, Workspaces, Core, Connections, Runtime | `src/core/web/app/layout/Sidebar.tsx` has only 5 tabs: Construct, **Memories**, Review, **Maintain**, Connect | Removed Profiles / Workspaces / Runtime tabs from the in-app table; relabeled Recall → Memories |
| 2 | Maintain vs Core naming | Versioned `entry/core.md` title is "Core tab" | Sidebar label is **Maintain**, pane header is **Core** | Made the user-facing tab name **Maintain tab** in both current and versioned docs |
| 3 | Profiles / Workspaces / Runtime tab pages | `entry/profiles.md`, `entry/workspaces.md`, `entry/runtime.md` describe UI tabs | No such tabs exist in `App.tsx` / `Sidebar.tsx` / `types.ts` | Removed those pages from the Entry Web UI sidebar; rewrote links so they are no longer presented as tabs |
| 4 | Launch command | `engram construct` opens the panel | `src/core/cli/command-registry.ts`: launch command is `engram entry` (alias `e`) | Replaced `engram construct` with `engram entry` |
| 5 | `--host-only` flag | Not documented in `entry/launch.md` | `src/commands/ops.ts` and `help-topics.ts` support `--host-only` | Added the flag description |
| 6 | Close Server location | "Close the server from the Runtime tab" | Close Server lives in the sidebar footer (`Sidebar.tsx`) | Fixed to sidebar footer |
| 7 | Memories tab naming | Current `entry/index.md` and `entry/memories.md` use **Recall tab** | Sidebar label and section header are **Memories** | Renamed to **Memories tab** |
| 8 | Versioned construct fields | Versioned `entry/construct.md` and `field-reference.md` omit `update`, `vector.provider`, `pr_workflow.provider/repo`, `live_sync.targets`, and the Ignore Rules group | `src/core/runtime/config.ts` defaults include all of those fields | Synced versioned docs with current docs |
| 9 | CLI `profile` subcommands | Docs show `profile status\|create\|use\|merge` | Registry: `profile status\|list\|create\|use\|merge` | Added `list` |
| 10 | CLI `set-*` status options | Docs omit `status` for `set-read`, `set-proof`, `set-rule-variant` | Registry includes `status` for all three | Added `status` to each command block |
| 11 | CLI key-settings defaults | `profiles-workspaces-config.md` table claims `rule_variants.enabled: true`, `graph.max_related: 8`, `graph.min_related_score: 0.3`, `live_sync.enabled: true`, `global_git.enabled: false` | `src/core/runtime/config.ts`: `false`, `4`, `0.22`, `false`, `true` | Corrected defaults to match code |
| 12 | `inject` / `link` / `upgrade` examples missing flags | `inject-link-upgrade.md` omits `--scope`, `--no-global`, `--global-path`, `--global-branch`; `link` omits `list`/`--all-supported`; `upgrade` omits `--self`, `--memory-only`, `--global-skillsets-only`, `--target` | Registry lists full syntax | Expanded examples |
| 13 | Versioned load output description inverted | Versioned `concepts/memory-types.md` and `cli/load-search-graph.md` say default load is full and `--full` is compact | `src/commands/read.ts`: default is compact, `--full` is legacy full output | Inverted versioned docs back to compact-by-default |
| 14 | Versioned MCP default | Versioned `integrations/mcp.md` says `engram_load` defaults to `--full` | `src/mcp/server.ts`: compact default; `full: true` opts in | Fixed versioned doc |
| 15 | Versioned slash `accept all` wording | Versioned `integrations/slash.md` uses `/engram take control accept all` | `src/cli/args.ts`: `-accept-all` removed, use `--force` | Updated versioned slash doc to current force wording |
| 16 | Copilot hook wording | Current `integrations/copilot.md` says hooks expose session-start context | Capabilities matrix in `capabilities.ts` marks `startup_injection: false` and overview lists Copilot hook install as **Skipped** | Removed the misleading session-start wording |
| 17 | OpenCode files written | `integrations/opencode.md` files table omits the workspace plugin | `agent-hooks.ts` writes `.opencode/plugins/engram.js` for workspace link | Added the plugin row |
| 18 | Connections slash table | `entry/connections.md` slash row omits `.claude/skills/engram/SKILL.md` | `skillset.ts` slash target writes that file | Added the missing file to the table |
| 19 | Sidebar ordering | Sidebars list Profiles / Workspaces / Runtime / Core / Memories under Entry Web UI | Actual tab order in sidebar is Construct, Memories, Review, Maintain, Connect | Reordered and removed obsolete entries from `sidebars.ts` and `versioned_sidebars/version-0.0.27-sidebars.json` |
| 20 | Obsolete tab pages | `entry/profiles.md`, `entry/workspaces.md`, `entry/runtime.md` still existed as docs pages | No matching UI tabs | Deleted from current and versioned `0.0.27`; updated `website/scripts/check-entry-field-docs.mjs` required page list |
| 21 | Missing Review page in versioned docs | Versioned `entry/index.md` did not list the Review tab and had no `entry/review.md` | `ReviewTab.tsx` is a real tab | Added `entry/review.md` to versioned `0.0.27` and updated sidebars/index |
