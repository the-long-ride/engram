---
schema_version: 1
id: "workflow.build-test-and-release-scripts"
title: "Build, Test, and Release Scripts"
kind: "workflow"
status: "verified"
summary: "Build, codegen, line-comment and asset-budget lint, sharded and related-file test orchestration, and release tag checks under scripts/."
tags: ["scripts","build","esbuild","test-runner","lint","release"]
source_paths: ["scripts/build-web.mjs","scripts/check-lines.mjs","scripts/check-release-version.mjs","scripts/check-web-assets.mjs","scripts/copy-assets.mjs","scripts/generate-version.mjs","scripts/run-related-tests.mjs","scripts/run-tests.mjs","scripts/test-shard-planner.mjs"]
related_specs: ["architecture.docs-website-and-field-sync","architecture.runtime-config-and-profiles","feature.entry-web-ui","interface.entry-web-api"]
last_doc_update_at: "2026-11-25T03:58:47Z"
last_verified_at: "2026-11-25T07:13:34Z"
last_verified_code_commit: "4cc4f6a"
last_source_change_commit: "4cb821a"
last_source_change_at: "2026-10-13T04:40:16+07:00"
source_fingerprint: "sha256:0589759da79e4c6908483cc9ae32aff7df1d6e9e117be95571cb61a54e031ef0"
---
# Build, Test, and Release Scripts

## Purpose and boundaries

This workflow governs the repository-root Node ESM build, static-asset packaging, lint/budget verification, test execution, CI sharding, and release-tag validation scripts under `scripts/*.mjs`.

In scope:
- Generating runtime version and docs-site constants (`src/core/runtime/version.ts` and `src/core/runtime/docs-site.ts`) from `package.json` and `website/versions.json`.
- Bundling the Entry Web UI React application into `dist/core/web/panel.js` via `esbuild` and copying static web assets (`panel.html`, `favicon.svg`, `*.css`, logo SVG) into `dist/core/web/`.
- Enforcing repository code-hygiene and web-asset size/line budgets (`lint:lines`).
- Running the full root Node test suite with optional deterministic weighted sharding (`TEST_SHARD=N/M`), and running targeted cross-suite tests for changed paths (`test:related`).
- Verifying that a release Git tag matches `package.json` before publishing.

Out of scope:
- Docusaurus site builds, field-doc parity checks, and i18n synchronization (covered in `architecture.docs-website-and-field-sync`).
- TypeScript compiler configuration (`tsconfig.json`), Jest configuration (`jest.config.cjs`), and GitHub Actions YAML definitions.

## Observable behavior

1. **Version and docs-site codegen (`scripts/generate-version.mjs`)**:
   - Validates `package.json` `version` against `/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/` and writes `export const VERSION = "...";` to `src/core/runtime/version.ts` only when the generated text differs from the existing file.
   - Validates `website/versions.json` is a non-empty JSON array of strings and writes `DOCS_SITE_BASE_URL` (`"https://the-long-ride.github.io/engram/docs"`), `DOCS_SITE_VERSIONS`, and `DOCS_SITE_LATEST_VERSION` (the last element of the array) to `src/core/runtime/docs-site.ts` only when changed.
2. **Entry Web UI bundle and static assets (`scripts/build-web.mjs`, `scripts/copy-assets.mjs`)**:
   - `build-web.mjs` invokes `esbuild` to bundle `src/core/web/app/main.tsx` into `dist/core/web/panel.js` (`bundle: true`, `format: 'esm'`, `platform: 'browser'`, `target: ['es2022']`, `jsx: 'automatic'`, `minify: true`, `sourcemap: true`, `drop: ['console', 'debugger']`).
   - `copy-assets.mjs` creates `dist/core/web/` and copies `panel.html`, `favicon.svg`, all `*.css` files from `src/core/web/`, and `media/logo/engram-logo-black-transparent.svg`.
3. **File responsibility and web-asset budget checks (`scripts/check-lines.mjs`, `scripts/check-web-assets.mjs`)**:
   - `check-lines.mjs` recursively scans `src/` and `scripts/` for `.ts`, `.js`, `.mjs`, and `.cjs` files and fails (exit `1`) if any file's first non-empty, non-shebang line is not a `/** ... */` or `// ...` responsibility summary.
   - `check-web-assets.mjs` enforces byte budgets on `src/core/web/panel.html` (<= 7,000 B), `src/core/web/favicon.svg` (<= 12,000 B), `media/logo/engram-logo-black-transparent.svg` (<= 12,000 B), and `dist/core/web/panel.js` (<= 350,000 B; warns and skips if not yet built), plus a 650-line budget per `src/core/web/*.css` file. Exits `1` on any violation.
4. **Root test runner and weighted sharding (`scripts/run-tests.mjs`, `scripts/test-shard-planner.mjs`)**:
   - `run-tests.mjs` collects `*.test.mjs` files from `tests/` and subdirectories `cli`, `publish`, `core`, and `conformance`, sorts them lexicographically, and runs `node --test --test-timeout=120000 --test-force-exit`.
   - When `TEST_SHARD=N/M` (`1 <= N <= M`) is set, `selectWeightedShard` sorts test files descending by byte size (tie-breaking lexicographically) and greedily assigns each file to the shard bucket with the smallest cumulative byte weight, returning bucket `N` sorted lexicographically.
5. **Change-based related test runner (`scripts/run-related-tests.mjs`)**:
   - Maps CLI-supplied changed file paths against ordered regex rules to select Node tests, Jest Entry UI tests (`tests/app/**/*.test.ts(x)`), and website tests (`website/src/**/*.test.ts(x)`).
   - Falls back to running the full test suite (`allTests()`) whenever any changed path under `src/` or `scripts/` matches no rule.
   - Runs `npm run build` automatically if any selected test requires compiled output (`needsBuild`), then executes Jest tests, website tests (`node --experimental-test-coverage --import tsx --test --test-isolation=none` in `website/`), non-coverage Node tests (`node --test`), and coverage Node tests (`node --experimental-test-coverage --test`).
6. **Release tag validation (`scripts/check-release-version.mjs`)**:
   - Exits `2` if the tag argument is missing or does not match `/^v\d+\.\d+\.\d+$/`.
   - Exits `1` if the tag does not equal `'v' + package.json.version`; exits `0` on match.

## Workflow

```text
npm run build
  ├─► node scripts/generate-version.mjs   ──► src/core/runtime/{version,docs-site}.ts
  ├─► tsc                                 ──► dist/**/*.js
  ├─► node scripts/build-web.mjs          ──► dist/core/web/panel.js (+ .map)
  └─► node scripts/copy-assets.mjs        ──► dist/core/web/{panel.html,favicon.svg,*.css,logo.svg}

npm run lint:lines
  ├─► node scripts/check-lines.mjs        ──► verify top-of-file summary in src/ & scripts/
  └─► node scripts/check-web-assets.mjs   ──► verify raw/CSS/bundle size budgets

npm run test:built [TEST_SHARD=N/M]
  └─► node scripts/run-tests.mjs ──► test-shard-planner.mjs ──► node --test (120s timeout, force-exit)

npm run test:related -- <changed-paths...>
  └─► node scripts/run-related-tests.mjs ──► optional build ──► Jest + Website tsx + Node (--test & coverage)

node scripts/check-release-version.mjs vX.Y.Z
  └─► compare tag against package.json version before publish
```

## Code map

| Path | Responsibility |
| --- | --- |
| `scripts/generate-version.mjs` | Generates `src/core/runtime/version.ts` and `src/core/runtime/docs-site.ts` idempotently from `package.json` and `website/versions.json`. |
| `scripts/build-web.mjs` | Bundles `src/core/web/app/main.tsx` into `dist/core/web/panel.js` via `esbuild` (ESM, ES2022, minified, console/debugger stripped, sourcemap). |
| `scripts/copy-assets.mjs` | Copies static Entry panel HTML, CSS, favicon, and transparent logo SVG into `dist/core/web/`. |
| `scripts/check-lines.mjs` | Enforces top-of-file responsibility summary comments across `.ts/.js/.mjs/.cjs` files in `src/` and `scripts/`. |
| `scripts/check-web-assets.mjs` | Checks raw asset byte budgets, CSS line limits (650 lines), and `dist/core/web/panel.js` bundle budget (350 KB). |
| `scripts/check-release-version.mjs` | Validates `vX.Y.Z` release tag format and exact parity with `package.json` `version`. |
| `scripts/test-shard-planner.mjs` | Exports `selectWeightedShard(entries, shard)` for deterministic greedy file-size-balanced CI sharding. |
| `scripts/run-tests.mjs` | Exports `getTestFiles(dir)` and executes discovered root/nested `.test.mjs` files (optionally sharded via `TEST_SHARD`) under `node --test`. |
| `scripts/run-related-tests.mjs` | Exports `relatedTestsForChangedFiles`, `spawnOptionsForCommand`, `websiteTestFiles`; maps changed paths to targeted Node/Jest/website tests with automatic build and full-suite fallback. |

## Interfaces and data

- **Environment variables**:
  - `TEST_SHARD`: Optional `N/M` string (`1 <= N <= M`) consumed by `scripts/run-tests.mjs` and parsed by `scripts/test-shard-planner.mjs`.
  - `npm_execpath`: Optional npm CLI path used by `scripts/run-related-tests.mjs` to invoke `npm run build` and `npm exec -- jest` via `process.execPath` without shell quoting issues on Windows.
- **Exported module APIs**:
  - `scripts/test-shard-planner.mjs`: `selectWeightedShard(entries: Array<{ file: string; size: number }>, shard: string): string[]`
  - `scripts/run-tests.mjs`: `getTestFiles(dir: string): Promise<string[]>`
  - `scripts/run-related-tests.mjs`: `relatedTestsForChangedFiles(files: string[]): Promise<string[]>`, `spawnOptionsForCommand(command: string, platform?: NodeJS.Platform): { stdio: 'inherit'; shell?: boolean }`, `websiteTestFiles(): Promise<string[]>`
- **Generated files**:
  - `src/core/runtime/version.ts`: `export const VERSION: string`
  - `src/core/runtime/docs-site.ts`: `DOCS_SITE_BASE_URL`, `DOCS_SITE_VERSIONS`, `DOCS_SITE_LATEST_VERSION`
  - `dist/core/web/panel.js` (+ `panel.js.map`) and static copies in `dist/core/web/`
- **Budget constants (`scripts/check-web-assets.mjs`)**:
  - `panel.html`: 7,000 B; `favicon.svg`: 12,000 B; `engram-logo-black-transparent.svg`: 12,000 B; `*.css`: 650 lines; `dist/core/web/panel.js`: 350,000 B.

## Verification

- `npm run build` — runs `generate-version.mjs`, `tsc`, `build-web.mjs`, and `copy-assets.mjs`.
- `npm run lint:lines` — runs `check-lines.mjs` and `check-web-assets.mjs`.
- `npm run test:built` (and with `TEST_SHARD=1/2` / `TEST_SHARD=2/2`) — verifies root test discovery and weighted sharding via `run-tests.mjs` and `test-shard-planner.mjs`.
- `npm run test:related -- <paths>` — verifies path-to-test mapping and multi-runner dispatch.
- `node scripts/check-release-version.mjs v<version>` — verifies release tag parity with `package.json`.
- Related unit/budget tests mapped in `run-related-tests.mjs`: `tests/web-assets-budget.test.mjs`, `tests/web-panel-ui.test.mjs`, `tests/core.test.mjs`.

## Related documentation

- [Docs Website and Field Sync](../architecture/docs-website-and-field-sync.md)
- [Runtime Config and Profiles](../architecture/runtime-config-and-profiles.md)
- [Entry Web UI](../features/entry-web-ui.md)
- [Entry Web API](../interfaces/entry-web-api.md)

## Known limitations and open questions

- `scripts/run-tests.mjs` only descends into hardcoded subdirectories (`cli`, `publish`, `core`, `conformance`) under `tests/`; any new top-level subdirectory under `tests/` containing `.test.mjs` files will be silently skipped unless added to that allowlist.
- `scripts/check-web-assets.mjs` warns and skips the `dist/core/web/panel.js` bundle budget check when `dist/core/web/panel.js` has not been built yet, so running `lint:lines` without a prior `npm run build` will not catch bundle-size regressions.
- `scripts/generate-version.mjs` assumes the last element of `website/versions.json` is `DOCS_SITE_LATEST_VERSION`, whereas Docusaurus normally prepends newest versions at index `0` when running `docusaurus docs:version`—verify ordering conventions whenever cutting a new docs version.

<!-- BEGIN MANUAL NOTES -->
<!-- END MANUAL NOTES -->
