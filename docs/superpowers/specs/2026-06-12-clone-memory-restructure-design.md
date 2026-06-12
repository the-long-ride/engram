# Clone Memory Restructure Design

## Goal

Add an explicit `clone-memory --metacognize` mode that lets Engram promote or
import memories between workspace and global scopes through the same
approval-safe restructuring workflow used by `save-session`.

The existing `clone-memory` behavior remains a mechanical copy path. The new
mode is opt-in and is meant for cases where copying a memory file verbatim would
create duplicate, redundant, or poorly layered global/workspace memory.

## User-Facing Behavior

Supported examples:

```sh
engram clone-memory workspace global --metacognize
engram clone-memory workspace global --metacognize --accept-all
engram clone-memory global workspace --metacognize
engram cm workspace global --metacognize
engram clone workspace memory to global --metacognize
```

Without `--metacognize`, `clone-memory` continues to copy active Markdown files
from `rules/`, `skills/`, and `knowledge/`, rewrite `scope:`, update hashes, and
rebuild destination indexes.

With `--metacognize`, Engram:

1. Validates the same source and target scope pair as normal clone:
   `workspace -> global` or `global -> workspace`.
2. Reads only active source memories from `rules/`, `skills/`, and `knowledge/`.
3. Verifies source memory hashes before trusting file contents.
4. Converts each source memory into a `save-session` candidate that preserves the
   source type and content text.
5. Runs the existing save-session planning and approval flow against the target
   scope.

Manual users see the normal numbered preview and can accept all, accept selected
candidates, edit with a note, or reject.

AI agents may use `--accept-all` only when the human explicitly includes it.
When `--accept-all` sees related-memory hints before writing, Engram does not
write files. It returns the existing restructure instruction so the agent can
rerun with better candidates using `DEPENDS_ON: memory-id`, `UPDATE: memory-id`,
or by omitting already-covered content.

## Safety And Approval

`--metacognize` must never silently rewrite memory. It routes through the same
candidate parsing, related-memory hints, duplicate/update planning, validation,
sensitive-content checks, hash writes, index rebuilds, and approval gates already
used by `save-session`.

`--force` must not combine with `--metacognize`. Mechanical clone uses
`--force` to overwrite destination files, while restructure mode uses save
planning to add or update memories. Combining both flags would imply two
different write models, so the CLI rejects it with a clear error.

`--dry-run --metacognize` renders the planned save-session preview without
writing files or asking for approval. This gives manual users and agents a way
to inspect proposed add/update decisions before running the write flow.

## Architecture

Keep `src/commands/clone.ts` as the command entry point. Add a branch early in
`cmdCloneMemory`:

- default path: existing mechanical clone implementation
- restructure path: new helper that builds candidate text from source memories
  and delegates to shared save-session planning/writing helpers

To avoid duplicating write logic, export a small shared helper from
`src/commands/write.ts`. The helper accepts:

- candidate text in `TYPE: ... | TEXT: ...` format
- target scopes
- flags such as `accept-all`, `dry-run`, `role`, and `roles`
- optional source metadata marking the operation as `clone-memory`

The helper returns the same output shapes as `cmdSaveSession` so generated
agent instructions can describe one approval behavior instead of two separate
systems.

Candidate extraction uses structured parsing of existing memory Markdown:

- parse the memory with the schema parser
- infer type from frontmatter or file directory
- extract the canonical content bullet text from the memory body
- escape line breaks enough to remain valid `TYPE: ... | TEXT: ...` candidate
  lines

If a source memory cannot be parsed into a valid candidate, the command must
report it as invalid and skip it in dry-run/preview output rather than copying it
unverified.

## Documentation And Integration Updates

Update all places that describe clone-memory behavior:

- CLI command registry and detailed help
- README and localized operation docs where clone-memory is listed
- `docs/SKILLSET_CONTRACT.md`
- `docs/AGENT_INTEGRATIONS.md`
- generated skillset rendering
- shell completion arguments if needed

Generated agent instructions must say:

- normal `clone-memory` is mechanical
- `clone-memory --metacognize` is proposal-first
- agents must not add `--accept-all`; they may use it only when the human
  explicitly included it
- if the CLI reports related memories before writing, the agent reruns with
  `DEPENDS_ON`, `UPDATE`, or fewer candidates

## Tests

Add tests before implementation:

1. `clone-memory --metacognize --dry-run` previews add/update plans for the
   target scope and does not create destination files.
2. Manual `clone-memory --metacognize` uses numbered save-session approval and
   writes only selected candidates.
3. `clone-memory --metacognize --accept-all` pauses without writing when related
   memories require agent restructuring.
4. A rerun with explicit `DEPENDS_ON` or `UPDATE` writes through the same
   approval-safe path.
5. `--force --metacognize` is rejected.
6. Existing mechanical clone tests still pass unchanged.

## Non-Goals

This change does not add direct workspace-to-workspace cloning. Users can still
move memories between workspaces by cloning workspace to global, then global to
the target workspace.

This change does not auto-archive duplicates. Archive remains an explicit
reviewed action.

This change does not make AI generation part of the CLI itself. In agent
contexts, the host/agent may generate better candidate lines after Engram
returns related-memory hints, exactly like `save-session --accept-all` today.
