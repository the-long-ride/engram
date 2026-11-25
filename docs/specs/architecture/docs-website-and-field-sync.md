---
schema_version: 1
id: "architecture.docs-website-and-field-sync"
title: "Docs Website and Field Sync"
kind: "architecture"
status: "verified"
summary: "Validates Entry Construct and policy field documentation parity, manages localized Docusaurus docs across seven locales, and provides theme and copy-source UI components."
tags: ["website","docusaurus","i18n","entry-fields","docs-sync"]
source_paths: ["website/scripts/check-entry-field-docs.mjs","website/scripts/generate-i18n-docs.mjs","website/scripts/sync-all-i18n-docs.mjs","website/src/components/DocPageCopyButton.test.tsx","website/src/components/DocPageCopyButton.tsx","website/src/components/DocPageCopyNavbarItem.test.tsx","website/src/components/DocPageCopyNavbarItemView.tsx","website/src/components/EntryFieldCard.tsx","website/src/components/EntryFieldTable.test.tsx","website/src/components/EntryFieldTable.tsx","website/src/components/HomepageFeatures/index.tsx","website/src/components/RiskCallout.tsx","website/src/config.test.ts","website/src/data/entryFields.ts","website/src/data/translations.ts","website/src/dependencyLock.test.ts","website/src/pages/index.tsx","website/src/security/braces-safe.test.ts","website/src/theme/DocItem/Layout/index.tsx","website/src/theme/Footer/Copyright/index.tsx","website/src/theme/Footer/index.tsx","website/src/theme/Logo/index.tsx","website/src/theme/Navbar/Content/index.tsx","website/src/theme/Navbar/MobileSidebar/PrimaryMenu/index.tsx","website/src/theme/Navbar/MobileSidebar/SecondaryMenu/index.tsx","website/src/theme/NavbarItem/LocaleDropdownNavbarItem/index.tsx","website/src/theme/NavbarItem/LocaleDropdownNavbarItem/localeUtils.test.ts","website/src/theme/NavbarItem/LocaleDropdownNavbarItem/localeUtils.ts","website/src/utils/rawDocSource.test.ts","website/src/utils/rawDocSource.ts"]
related_specs: ["workflow.build-test-and-release-scripts","feature.entry-web-ui","interface.entry-web-api","architecture.runtime-config-and-profiles"]
last_doc_update_at: "2026-11-25T06:16:58Z"
last_verified_at: "2026-11-25T07:13:34Z"
last_verified_code_commit: "4cc4f6a"
last_source_change_commit: "339cada"
last_source_change_at: "2026-10-13T06:25:24+07:00"
source_fingerprint: "sha256:fefe15b02648c9c2aab39253e51e459ff002c996d01708c6c800fad4e8a5fcb9"
---
# Docs Website and Field Sync

## Purpose and boundaries

This architecture governs the Docusaurus 3.10 documentation website (`website/`), its Entry UI config-field and policy-doc parity enforcement, multi-locale i18n synchronization scripts, custom React components and swizzled theme overrides, raw-Markdown copy-to-clipboard pipeline, and website security/lockfile regression tests.

In scope:
- Entry UI field documentation metadata (`website/src/data/entryFields.ts`), rendering components (`EntryFieldCard`, `EntryFieldTable`, `RiskCallout`), and CI parity validation (`website/scripts/check-entry-field-docs.mjs`) against `src/core/web/config-schema.ts` and `src/core/web/app/data/policy-fields.ts`.
- Multi-locale documentation sync (`website/scripts/sync-all-i18n-docs.mjs`, `website/scripts/generate-i18n-docs.mjs`), localized landing page (`website/src/pages/index.tsx`, `website/src/data/translations.ts`), and locale-safe routing/assets (`LocaleDropdownNavbarItem`, `localeUtils.ts`, `theme/Logo`).
- Raw Markdown doc-page copy button (`rawDocSource.ts`, `DocPageCopyButton.tsx`, `DocPageCopyNavbarItemView.tsx`) wired into desktop navbar (`theme/Navbar/Content`) and mobile secondary sidebar (`theme/Navbar/MobileSidebar/SecondaryMenu`).
- Website unit, config, dependency-lock, and transitive `braces` security tests (`website/src/**/*.test.ts(x)`).

Out of scope:
- Markdown prose content inside `website/docs/`, `website/versioned_docs/`, and `website/i18n/`.
- Root package build/test scripts (covered in `workflow.build-test-and-release-scripts`).

## Observable behavior

1. **Entry UI config & policy doc parity (`website/scripts/check-entry-field-docs.mjs`)**:
   - Verifies all 51 required English documentation pages exist under `website/docs/`.
   - Parses `CONFIG_FIELDS` from `src/core/web/config-schema.ts` (excluding `hidden: true` keys) and compares them against `ENTRY_FIELDS` in `website/src/data/entryFields.ts`. Fails (exit `1`) on any missing/extra key, duplicate or mismatched `docsAnchor`, or missing `id="<docsAnchor>"` anchor in `website/docs/entry/field-reference.md`.
   - Verifies `src/core/web/app/data/policy-fields.ts` defines exactly 13 unique `path` values and 13 unique `docsAnchor` values, each present as `{#<anchor>}` in `website/docs/entry/policy.md`.
   - Validates every `ENTRY_FIELDS` item has non-empty `shortDescription`, `useCases`, `guidelines`, `troubleshooting` (required when `risk` is `risky` or `caution`), and numeric `min`/`max` (required when `control === 'number'`).
2. **i18n doc synchronization (`website/scripts/sync-all-i18n-docs.mjs`, `website/scripts/generate-i18n-docs.mjs`)**:
   - Supports 7 non-English locales (`vi`, `es`, `fr`, `zh`, `ko`, `ja`, `ru`) alongside default `en`.
   - `sync-all-i18n-docs.mjs` copies missing `.md` files from `website/docs/` (and optionally `website/versioned_docs/version-<ver>/` when a version arg is passed) into each locale's `docusaurus-plugin-content-docs/` tree; overwrites existing files only when `--overwrite`, `-f`, or `--force` is specified.
   - `generate-i18n-docs.mjs` converts legacy `documentation/<locale>/*.md` files (6 core pages), rewrites relative `.md` links via `fileMap`, prepends localized frontmatter (`title`, `sidebar_position`, `description`), and writes them into both `current` and `version-0.0.27`.
3. **Raw Markdown copy action (`rawDocSource.ts`, `DocPageCopyButton.tsx`, `DocPageCopyNavbarItemView.tsx`)**:
   - Relies on `docusaurus.config.ts` serving `staticDirectories: ['static', 'docs', 'versioned_docs']` and exposing `customFields.docsCopy` (`currentVersionPath: 'future'`, `publishedVersionName: 'version-0.1.0'`).
   - Renders a "Copy markdown" button in the desktop navbar (`Navbar/Content`) and mobile docs sidebar (`Navbar/MobileSidebar/SecondaryMenu`) only when `hasActiveDoc` is true and pathname asset candidates resolve (hides on non-docs routes and 404 misses).
   - Fetches the first matching `.md` / `/index.md` / `.mdx` / `/index.mdx` asset (respecting locale prefix and `future` vs published version root), writes its raw text to `navigator.clipboard`, and transitions label state to `Copied` (1,200 ms) or `Copy failed` (1,600 ms).
4. **Locale-safe navigation and branding (`LocaleDropdownNavbarItem`, `localeUtils.ts`, `Logo`, `Footer/Copyright`)**:
   - `inferCurrentLocaleBaseUrl` matches the longest locale `baseUrl` prefix against `location.pathname`; `createLocaleUrl` strips it via `stripBasePath` and applies `trailingSlash` before prepending `targetLocaleBaseUrl` (`pathname://...` on same origin), preventing locale-prefix stacking across consecutive language switches.
   - `theme/Logo` resolves logo SVGs against hardcoded `SITE_ROOT_BASE_URL = '/engram/'` (`useStaticLogoUrl`) so non-default locales never request broken `/engram/<locale>/img/logo.svg` URLs.
   - `theme/Footer/Copyright` renders a 3-line footer shell (dynamic copyright year, GPL-3.0 / GitHub / Issues links, and `@the-long-ride/engram` npm link with inline SVG mark).
5. **Localized landing page (`website/src/pages/index.tsx`, `website/src/data/translations.ts`)**:
   - Renders 10 sections (`HeroSection`, `ProblemSection`, `SolutionSection`, `WorkflowDemo`, `EntryUIPreview`, `AgentGrid`, `ComparisonSection`, `TrustSection`, `ArchitectureSection`, `FooterCta`) using `translations[currentLocale] || translations.en` and themed light/dark lifecycle SVG diagrams.
6. **Security and lockfile invariants (`dependencyLock.test.ts`, `braces-safe.test.ts`, `config.test.ts`)**:
   - Asserts `website/pnpm-lock.yaml` excludes vulnerable `serialize-javascript@6.0.2` and `uuid@8.3.2`, and keeps `@docusaurus/plugin-content-docs` and `@types/react-dom` explicitly pinned.
   - Asserts the transitive `braces` package used by `@docusaurus/utils`/`micromatch` rejects deep nesting (1,024+ braces/parens), cyclic ASTs, oversized ASTs (65,537 nodes), and cyclic/deep parent chains within 3 s without hanging.
   - Asserts `docusaurus.config.ts` logo points statically to `https://the-long-ride.github.io/engram/` with `target: '_self'`.

## Workflow

```text
Entry schema / policy change
  └─► update website/src/data/entryFields.ts + website/docs/entry/{field-reference,policy}.md
        └─► pnpm run check:entry-fields (website/scripts/check-entry-field-docs.mjs)

Docs authoring & i18n
  └─► edit website/docs/**/*.md
        ├─► pnpm run sync-i18n-docs [version] [--overwrite]   (sync-all-i18n-docs.mjs)
        └─► pnpm test                                         (tsx --test "src/**/*.test.ts" "src/**/*.test.tsx")

Runtime doc page view (browser)
  └─► Navbar/Content & MobileSidebar/SecondaryMenu
        ├─► DocPageCopyNavbarItemView ──► DocPageCopyButton ──► rawDocSource.ts ──► fetch raw .md ──► clipboard
        ├─► LocaleDropdownNavbarItem  ──► localeUtils.ts    ──► non-stacking locale URL
        └─► Logo                      ──► SITE_ROOT_BASE_URL('/engram/') ──► locale-independent SVG
```

## Code map

| Path | Responsibility |
| --- | --- |
| `website/scripts/check-entry-field-docs.mjs` | CI smoke check validating 51 required docs pages, `CONFIG_FIELDS` ↔ `ENTRY_FIELDS` parity, `field-reference.md` anchors, 13 `policy-fields.ts` ↔ `policy.md` anchors, and field metadata rules. |
| `website/scripts/sync-all-i18n-docs.mjs` | Copies English Markdown files from `docs/` (and optional `versioned_docs/`) into 7 non-English `i18n/<locale>/` trees without overwriting unless forced. |
| `website/scripts/generate-i18n-docs.mjs` | Legacy converter translating 6 `documentation/<locale>/*.md` pages with rewritten links and localized frontmatter into `current` and `version-0.0.27`. |
| `website/src/data/entryFields.ts` | Canonical docs metadata array (`ENTRY_FIELDS`, 48 fields across 13 groups) and lookup helpers (`getFieldDoc`, `entryFieldsByGroup`, `allEntryFieldDocs`). |
| `website/src/data/translations.ts` | `TranslationSet` interface and 8-locale dictionary (`en`, `vi`, `es`, `fr`, `zh`, `ko`, `ja`, `ru`) for the landing page. |
| `website/src/pages/index.tsx` | 10-section localized Engram homepage with inline SVG icons, terminal/Entry UI previews, comparison table, and themed architecture diagram. |
| `website/src/components/EntryFieldCard.tsx` | Renders a single `EntryFieldDoc` card styled by risk level (`normal`/`caution`/`risky`). |
| `website/src/components/EntryFieldTable.tsx` | Renders a summary table of `EntryFieldDoc` rows filtered by optional `group` (`entryFieldsByGroup(group)` when specified, `ENTRY_FIELDS` when omitted). |
| `website/src/components/EntryFieldTable.test.tsx` | SSR markup tests verifying `EntryFieldTable` renders all `ENTRY_FIELDS` when `group` is omitted and filters correctly when `group` is provided. |
| `website/src/components/RiskCallout.tsx` | Styled callout box (`Note`/`Caution`/`Warning`) for field/policy documentation pages. |
| `website/src/components/HomepageFeatures/index.tsx` | Unused Docusaurus starter feature-grid component retained in `src/components/`. |
| `website/src/utils/rawDocSource.ts` | Resolves public raw Markdown URLs and pathname asset candidates; fetches and copies raw doc text. |
| `website/src/utils/rawDocSource.test.ts` | Node tests for `resolvePublicDocSourceUrl`, `resolveDocPathnameAssetCandidates`, `copyDocSourceContent`, and `copyDocPathnameContent`. |
| `website/src/components/DocPageCopyButton.tsx` | Stateful "Copy markdown" button component (`idle`/`copied`/`failed`) backed by `rawDocSource.ts`. |
| `website/src/components/DocPageCopyButton.test.tsx` | SSR markup tests for `DocPageCopyButton` across null sources, `@site/...` sources, and doc pathnames. |
| `website/src/components/DocPageCopyNavbarItemView.tsx` | Navbar/mobile-menu wrapper gating `DocPageCopyButton` on `hasActiveDoc` and valid doc pathname candidates. |
| `website/src/components/DocPageCopyNavbarItem.test.tsx` | SSR markup tests for desktop/mobile rendering and non-doc/404 hiding in `DocPageCopyNavbarItemView`. |
| `website/src/theme/Navbar/Content/index.tsx` | Swizzled desktop navbar injecting `NavbarDocCopyAction` ahead of right-side navbar items. |
| `website/src/theme/Navbar/MobileSidebar/PrimaryMenu/index.tsx` | Swizzled mobile primary menu rendering navbar items and toggling sidebar on click. |
| `website/src/theme/Navbar/MobileSidebar/SecondaryMenu/index.tsx` | Swizzled mobile secondary menu adding `NavbarDocCopyAction` beneath the back button. |
| `website/src/theme/NavbarItem/LocaleDropdownNavbarItem/index.tsx` | Swizzled locale switcher using `localeUtils` to preserve search/hash and prevent locale stacking. |
| `website/src/theme/NavbarItem/LocaleDropdownNavbarItem/localeUtils.ts` | Pure URL utilities (`stripBasePath`, `inferCurrentLocaleBaseUrl`, `createLocaleUrl`). |
| `website/src/theme/NavbarItem/LocaleDropdownNavbarItem/localeUtils.test.ts` | Unit tests covering base-path stripping, locale inference, and consecutive multi-locale switches. |
| `website/src/theme/Logo/index.tsx` | Swizzled logo forcing locale-independent `/engram/` asset paths for light/dark SVG logos. |
| `website/src/theme/Footer/index.tsx` | Passthrough wrapper around `@theme-original/Footer`. |
| `website/src/theme/Footer/Copyright/index.tsx` | Custom 3-line footer copyright with License/GitHub/Issues links and npm package badge link. |
| `website/src/theme/DocItem/Layout/index.tsx` | Passthrough re-export of `@theme-original/DocItem/Layout`. |
| `website/src/config.test.ts` | Verifies `docusaurus.config.ts` navbar logo `src`, `srcDark`, `href`, and `target`. |
| `website/src/dependencyLock.test.ts` | Verifies `pnpm-lock.yaml` security overrides and explicit typecheck dependencies. |
| `website/src/security/braces-safe.test.ts` | Regression tests asserting transitive `braces` rejects deep nesting, cyclic ASTs, oversized ASTs, and cyclic/deep parent chains. |

## Interfaces and data

- **`EntryFieldDoc` (`website/src/data/entryFields.ts`)**:
  - `{ key, docsAnchor, label, group, control, defaultValue?, allowedValues?, min?, max?, step?, risk, shortDescription, useCases, guidelines, avoidWhen?, sideEffects?, cliEquivalent?, examples?, troubleshooting?, relatedPages? }`
  - Controls: `'toggle' | 'select' | 'number' | 'text' | 'textarea' | 'list' | 'roles' | 'scope-chips' | 'type-chips' | 'action-toggle'`.
- **`PathResolverOptions` (`website/src/utils/rawDocSource.ts`)**:
  - `{ baseUrl?, locales?, defaultLocale?, currentVersionPath?, publishedVersionName?, locale? }` (defaults: `baseUrl = '/'`, `defaultLocale = 'en'`, `currentVersionPath = 'future'`, `publishedVersionName = 'version-0.1.0'`).
- **`LocaleUrlParams` (`website/src/theme/NavbarItem/LocaleDropdownNavbarItem/localeUtils.ts`)**:
  - `{ pathname, trailingSlash, siteBaseUrl, currentLocaleBaseUrl, targetLocaleBaseUrl, targetLocaleUrl, siteUrl }`.
- **Docusaurus `customFields.docsCopy` contract**:
  - Configured in `website/docusaurus.config.ts` and read by `Navbar/Content` and `Navbar/MobileSidebar/SecondaryMenu` to keep `currentVersionPath` and `publishedVersionName` aligned with the active published docs version.

## Verification

- `pnpm --dir website run check:entry-fields` — runs `website/scripts/check-entry-field-docs.mjs`.
- `pnpm --dir website test` — runs `tsx --test "src/**/*.test.ts" "src/**/*.test.tsx"` (covering both `.test.ts` and `.test.tsx` component tests).
- `pnpm --dir website run typecheck` — runs `tsc` against `website/tsconfig.json`.
- `pnpm --dir website run build:fast` / `pnpm --dir website run build` — validates Docusaurus compilation.
- Root-level website layout tests: `tests/website-footer.test.mjs`, `tests/website-mobile-nav-cleanup.test.mjs`, `tests/website-mobile-sidebar.test.mjs`.

## Related documentation

- [Build, Test, and Release Scripts](../workflows/build-test-and-release-scripts.md)
- [Entry Web UI](../features/entry-web-ui.md)
- [Entry Web API](../interfaces/entry-web-api.md)
- [Runtime Config and Profiles](../architecture/runtime-config-and-profiles.md)

## Known limitations and open questions

- **Hardcoded version defaults**: `rawDocSource.ts`, `DocPageCopyButton.tsx`, and `DocPageCopyNavbarItemView.tsx` default `publishedVersionName` to `'version-0.1.0'`, and `generate-i18n-docs.mjs` hardcodes `oldVersion = 'version-0.0.27'`; future docs version cuts require updating `docusaurus.config.ts` and these defaults in tandem.
- **Unused scaffold component**: `website/src/components/HomepageFeatures/index.tsx` contains default Docusaurus starter content and is not referenced by `website/src/pages/index.tsx`.
- **Dynamic evaluation in smoke check**: `website/scripts/check-entry-field-docs.mjs` parses `ENTRY_FIELDS` using `new Function(...)` on the regex-extracted array literal from `entryFields.ts`, which assumes `ENTRY_FIELDS` remains pure JS-compatible syntax without TypeScript-only expressions inside the array body.

<!-- BEGIN MANUAL NOTES -->
<!-- END MANUAL NOTES -->
