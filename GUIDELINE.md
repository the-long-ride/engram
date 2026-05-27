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
- `prompts` contains agent-facing prompt templates.
- `templates` contains generated `.engram/` starter files.

## Coding Rules

- Keep every code file under 200 lines.
- Add a short file summary and concise function summaries.
- Do not add runtime dependencies unless they remove real operational risk.
- Never bypass the A/B/C approval gate on write paths.
- Never stage workspace code. `resolve-conflicts` may stage only `.engram` files
  after an explicit human command.
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
node ./dist/bin/engram.js save rule --scope workspace "Use pnpm for installs"
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

## Publishing

1. Update `version` in `package.json`.
2. Run `npm run typecheck && npm test && npm run lint:lines`.
3. Run `npm pack --dry-run` and inspect included files.
4. Publish with `npm publish --access public`.
5. Test with `npx @the-long-ride/engram --version`.

Scoped public publishing requires `--access public`.
