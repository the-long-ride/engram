# Contributor Guideline

Engram is built as a small TypeScript package with zero runtime dependencies.
Keep modules boring, readable, and easy for agents to inspect.

## Setup

```bash
npm install
npm run typecheck
npm test
npm run lint:lines
```

## Architecture

- `src/core` holds config, schema, indexes, routing, security, and storage.
- `src/commands` holds thin command handlers.
- `src/bin` exposes `engram` and `engram-mcp`.
- `src/core/git.ts` owns global memory Git init, branch detection, remote setup,
  pull, commit, push, and retry-on-merge handling. Workspace Git remains
  untouched except for explicit `.engram` submodule setup and
  `resolve-conflicts`.
- `src/core/submodule.ts` owns opt-in workspace `.engram` submodule creation and
  may stage only `.gitmodules` plus the `.engram` gitlink after human opt-in.
- `src/core/skillset.ts` renders agent instruction, MCP, and slash-command
  adapters.
- `prompts` contains agent-facing prompt templates.
- `templates` contains generated `.engram/` starter files.

## Coding Rules

- Keep every code file under 200 lines.
- Add a short file summary and concise function summaries.
- Do not add runtime dependencies unless they remove real operational risk.
- Never bypass the A/B/C approval gate on write paths.
- `engram save knowledge` may omit text only for agent-assisted capture. The
  command must collect objective generated knowledge first, automatically choose
  whether to update an existing memory or add a new one, then show the normal
  approval preview before writing.
- `engram save` upsert detection is automatic. Do not add a second approval
  prompt just to choose the target file.
- Rule variant mode is opt-in. Generate light/balanced/strict rule variants only
  for newly saved or updated rules while the mode is enabled; never bulk-rewrite
  old memories just to add variants.
- Slash-command adapters are routers. Keep `/engram <args>` mapped to the same
  CLI or MCP flow, never to a hidden write path.
- Global memory Git automation may touch only `$ENGRAM_GLOBAL_DIR`. Workspace
  submodule automation may touch only `.engram`, `.gitmodules`, and the parent
  gitlink. Agents must ask before adding any origin remote; CLI init may prompt
  for it, and non-TTY runs should print the explicit command instead.
- When adding or renaming a CLI command, update `src/core/help.ts`,
  `src/core/skillset.ts`, `docs/SKILLSET_CONTRACT.md`, and skillset tests
  together.
- Never stage workspace code. `resolve-conflicts` may stage only `.engram` files
  after an explicit human command; submodule setup may stage only `.gitmodules`
  and the `.engram` gitlink.
- Preserve archived memory; move superseded files, do not delete them.

## Debugging

Use focused scripts while developing:

```bash
npm run build
npm run test:core
npm run test:cli
npm run test:mcp
npm run coverage
npm test
```

Run one file or one named test:

```bash
node --test tests/safety.test.mjs
node --test --test-name-pattern "path traversal" tests/safety.test.mjs
```

Debug the CLI with Node inspector:

```bash
npm run debug:cli -- init
```

For manual CLI debugging, isolate global memory so you do not touch your real
folder:

```bash
export ENGRAM_GLOBAL_DIR="$PWD/.tmp-engram-global"
npm run build
node ./dist/bin/engram.js init
node ./dist/bin/engram.js entry
node ./dist/bin/engram.js save rule --scope workspace "Use pnpm for installs"
node ./dist/bin/engram.js save knowledge --scope workspace
```

On PowerShell, set the env var with:

```powershell
$env:ENGRAM_GLOBAL_DIR = "$PWD\.tmp-engram-global"
```

If a sandbox blocks Node's test runner with `spawn EPERM`, rerun the same npm
test command outside the sandbox or with process-spawn permission.

## Continuous Integration

GitHub Actions are split into reusable gates:

- `Test` runs install, typecheck, line check, and tests.
- `Code Coverage` runs Node's built-in test coverage.
- `Build` calls both gates and only builds/packages after they pass.

Keep Build dependent on Test and Coverage. Do not move package build ahead of
those gates.

## Conflict Resolution

`engram resolve-conflicts` is an explicit human command. It may automatically
resolve two-sided Git conflict markers under `.engram/**/*.md`, update Engram
hash/index/changelog metadata, and stage only `.engram` paths. It must never
modify or stage workspace source files.

Use `engram resolve-conflicts --dry-run` to preview classifications without
writing files.

Global Git sync uses the currently checked-out branch in `$ENGRAM_GLOBAL_DIR`,
falling back to `global_git.branch` (`main` by default) for new repos. Automatic
conflict resolution is limited to Engram memory Markdown files in the global
root; unresolved Git conflicts must remain visible for human review.

## Publishing

1. Update `version` in `package.json`.
2. Run `npm run typecheck && npm test && npm run lint:lines`.
3. Run `npm pack --dry-run` and inspect included files.
4. Publish with `npm publish --access public`.
5. Test with `npx @the-long-ride/engram --version`.

Scoped public publishing requires `--access public`.
