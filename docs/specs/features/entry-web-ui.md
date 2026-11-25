---
schema_version: 1
id: "feature.entry-web-ui"
title: "Entry Web Control Panel UI"
kind: "feature"
status: "verified"
summary: "React control panel application for managing Engram configuration, auto-save policy, Git author identity, configuration upgrades, interactive memory graphs, review queues, duplicate resolution, and local AI agent connections."
tags: ["entry","web-ui","react","memory-graph","review","upgrade-ui"]
source_paths: ["src/core/web/app/App.tsx","src/core/web/app/components/Badge.tsx","src/core/web/app/components/Button.tsx","src/core/web/app/components/Card.tsx","src/core/web/app/components/CommandHelp.tsx","src/core/web/app/components/CompareModal.tsx","src/core/web/app/components/ConfigFieldGroupEditor.tsx","src/core/web/app/components/ConfirmModal.tsx","src/core/web/app/components/DependencyPicker.tsx","src/core/web/app/components/HelpLink.tsx","src/core/web/app/components/Loading.tsx","src/core/web/app/components/MemoryDiff.tsx","src/core/web/app/components/MemoryPreviewContent.tsx","src/core/web/app/components/MemoryPropertiesGrid.tsx","src/core/web/app/components/Modal.tsx","src/core/web/app/components/MultiChoice.tsx","src/core/web/app/components/ScopeChips.tsx","src/core/web/app/components/SectionHeader.tsx","src/core/web/app/components/Toast.tsx","src/core/web/app/components/Toggle.tsx","src/core/web/app/components/UpgradeConflictDiff.tsx","src/core/web/app/components/UpgradeConflictReviewModal.tsx","src/core/web/app/components/upgrade-conflict-diff-model.ts","src/core/web/app/data/policy-fields.ts","src/core/web/app/layout/InitBanner.tsx","src/core/web/app/layout/MobileHeader.tsx","src/core/web/app/layout/Sidebar.tsx","src/core/web/app/main.tsx","src/core/web/app/memories/MemoryDetail.tsx","src/core/web/app/memories/MemoryGraph.tsx","src/core/web/app/memories/graph-layout.ts","src/core/web/app/memories/graph-types.ts","src/core/web/app/tabs/AuthorTab.tsx","src/core/web/app/tabs/ConfigTab.tsx","src/core/web/app/tabs/ConnectionsTab.tsx","src/core/web/app/tabs/CoreTab.tsx","src/core/web/app/tabs/MemoriesTab.tsx","src/core/web/app/tabs/ProfilesTab.tsx","src/core/web/app/tabs/ReviewTab.tsx","src/core/web/app/tabs/RuntimeTab.tsx","src/core/web/app/tabs/UpgradeTab.tsx","src/core/web/app/tabs/WorkspacesTab.tsx","src/core/web/app/utils/clipboard.ts","src/core/web/app/utils/config.ts","src/core/web/app/utils/docs.ts","src/core/web/app/utils/format.ts","src/core/web/app/utils/html.ts"]
related_specs: ["interface.entry-web-api","architecture.runtime-config-and-profiles","architecture.safety-policy-and-review","feature.ingest-author-and-benchmarks","feature.agent-hooks-and-skillsets","workflow.upgrade-vcs-and-diagnostics","architecture.docs-website-and-field-sync"]
last_doc_update_at: "2026-11-25T05:29:08Z"
last_verified_at: "2026-11-25T07:13:34Z"
last_verified_code_commit: "4cc4f6a"
last_source_change_commit: "e3a17b3"
last_source_change_at: "2026-08-11T01:33:25+07:00"
source_fingerprint: "sha256:3166d8d7006f9642a0c3fba17ba6529f9a57622d372190938339600761d46824"
---
# Entry Web Control Panel UI

## Purpose and boundaries

This feature defines the browser-side React single-page application served by the Engram Entry server. It provides a local, human-in-the-loop control panel for staging configuration and policy changes, managing Git author identity, previewing and resolving configuration upgrades, exploring the memory dependency/similarity graph, triaging the review queue, resolving duplicate candidates, and linking local AI agents.

**In scope:**
- Application entry point (`main.tsx`), root shell (`App.tsx`), responsive layout (`Sidebar`, `MobileHeader`, `InitBanner`), theme toggling (`dark`/`light`), toast notifications, and modal host.
- All mounted control-panel tabs: **Construct** (`ConfigTab`, with `Configuration`, `Profiles` (`ProfilesTab`), `Workspaces` (`WorkspacesTab`), and `Runtime` (`RuntimeTab`) sub-views), **Git** (`AuthorTab`), **Updates** (`UpgradeTab`), **Memories** (`MemoriesTab`), **Review** (`ReviewTab`), **Core** (`CoreTab`), and **Connect** (`ConnectionsTab`).
- Interactive force-directed radial memory graph (`MemoryGraph`, `graph-layout.ts`, `MemoryDetail`).
- Shared UI primitives, diff viewers (`MemoryDiff`, `UpgradeConflictDiff`, `upgrade-conflict-diff-model.ts`), conflict review modal (`UpgradeConflictReviewModal`), comparison modal (`CompareModal`), and version/locale-aware docs link builders (`utils/docs.ts`, `data/policy-fields.ts`).

**Out of scope:**
- HTTP server transport, CSRF/Origin guards, and backend API execution (owned by [Entry Web Server and HTTP API](../interfaces/entry-web-api.md)).
- Bundling scripts and CSS asset packaging (owned by [Build, Test, and Release Scripts](../workflows/build-test-and-release-scripts.md)).
- Hosted documentation site content and i18n publishing (owned by [Docs Website and Field Sync](../architecture/docs-website-and-field-sync.md)).

## Observable behavior

- **Shell & navigation:** `main.tsx` mounts `<App />` into `#root`. `App` reads the initial tab (and optional `config/<subView>`) via `parseHash()`, syncs with `#hash` navigation (`hashchange` + `history.replaceState`), defaults to the `config` (**Construct**) tab, closes the mobile sidebar drawer on `Escape`, backdrop click, or the `.sb-close` button, loads `/api/data` on mount, toggles `document.documentElement.classList.toggle('light', !dark)` based on `data.config.theme`, and persists theme switches via `saveConfigPatch({ theme })`. `InitBanner` prompts to initialize the workspace when `data.isInitialized === false`.
- **Sidebar & upgrade notices:** `Sidebar` groups navigation under **Settings** (**Construct**, **Git**, **Updates**) and **Workspace** (**Memories**, **Review**, **Core**, **Connect**) section dividers, rendering a live `pendingReviewCount` badge on **Review** when items are waiting. It displays the installed version (click-to-copy), a `.sb-close` button for the mobile drawer, a package upgrade banner when `data.latestVersion` is newer, a configuration update banner linking to the **Updates** tab whenever workspace/global outdated/conflict/invalid counts exceed 0, a Dark Mode toggle, and a **Close Server** button calling `/shutdown`.
- **Construct (`ConfigTab`):** Provides a sub-view tablist mounting **Configuration** (the default **Auto-save policy** card editing `.agents/engram.policy.json` via toggles, selects, `MultiChoice` groups, and numeric inputs, plus a two-column grid of grouped config cards excluding `global_git.*`, which lives in **Git**), **Profiles** (`ProfilesTab`), **Workspaces** (`WorkspacesTab`), and **Runtime** (`RuntimeTab`). Tracks dirty fields, runs client validation (`clientValidationError`) plus async server validation for `global_path`, and opens a review modal requiring explicit checkbox confirmation when server validation reports `riskyKeys`.
- **Git (`AuthorTab`):** Switches between `global` and `workspace` author scopes, displays the resolved author source badge (`Workspace`, `Global`, `Git fallback`, `Unresolved`), validates name and email before opening confirmation modals to set/unset profiles, embeds `ConfigFieldGroupEditor` for `global_git.*` settings in `global` scope, and offers preview-and-confirm modals for global Git author sync and legacy memory author migration.
- **Updates (`UpgradeTab`):** Summarizes workspace, global, and conflict/invalid counts; loads a fresh fingerprinted preview via **Preview changes**; filters actionable artifacts by kind (`all`, `config`, `instruction`, `memory`, `skillset`, `hook`, `plugin`); supports per-item conflict review (`UpgradeConflictReviewModal` with Current/Proposed/Diff tabs, inline & parallel `UpgradeConflictDiff`, Open in editor, Use latest, Force upgrade, Keep current, and Reset proposed) and bulk confirmation of eligible pending replaceable conflicts; blocks final **Upgrade** until `pendingReviewCount === 0`, and auto-refreshes stale previews on fingerprint mismatch.
- **Memories (`MemoriesTab`):** Renders a debounced full-text search bar (`direct` vs `related` mode), scope chips (`profile`, `global`, `workspace`), type chips (`rule`, `skill`, `workflow`, `knowledge`), semantic-link toggle, an inline **Route simulator** (`Simulate prompt` -> `simulateRecall` -> `GET /api/recall?simulate=true`) showing token usage plus clickable `Bodies` and `Cards` chips that select nodes on the graph, interactive pan/zoom/drag/fullscreen `MemoryGraph` (force-simulated concentric rings by dependency/connection score, quadratic Bezier edges, click-to-highlight neighborhood, `Escape` exits fullscreen), and `MemoryDetail` sidebar showing `Working` / `Working (expired)` and `Noisy` badges, usage counters (`injected`/`fetched`/`applied`), provenance metadata (`revision`, `evidenceRefs`, `derivedFrom`, `supersedes`, `supersededBy`, `validFrom`/`validUntil`, `lastConfirmed`), lazy-loaded body content, 1-click **Promote** (`promoteMemory`) for unexpired working memories, and Preview/Copy/Edit/Delete actions (using a styled `ConfirmBody`/`ConfirmActions` archive modal when `modal` is available).
- **Review (`ReviewTab`):** Loads combined findings and deferred inbox receipts with queue filter pills (`All`, `Session learning`, `Deferred`, `Findings`) that auto-select the first visible item when the current selection is filtered out (`selectFilter`), supports keyboard triage (`j`/`k` or `ArrowDown`/`ArrowUp` to navigate, `a` to approve the selected receipt, `d` to dismiss the selected item), single-item inspection (`reviewInspect` + `reviewPreview`), multi-item side-by-side comparison (`CompareModal`), single-item and bulk `r-*` receipt approval (`Approve receipt` / `Approve N` -> confirmation modal -> `reviewApplyReceipts`), single-item **Dismiss** and confirmed batch dismissal (`reviewDismiss`), bulk prompt copy/download (`engram-review-queue.md`), ID-only relation picking (`DependencyPicker` for `DEPENDS_ON` / `UPDATE`), a collapsible `Review prompt` `<details>` section (open for findings, collapsed for inbox receipts), AI review prompt copying, read-only `MemoryDiff` preview of pasted AI proposals, and explicitly confirmed writes (`reviewWrite`).
- **Core (`CoreTab`):** Filters duplicate candidates by scope, type, and semantic matching; displays relationship counts; provides copy/preview/download actions for **Resolve duplicate memories**, **Metacognize memory**, and **Suggest memories connection** (`engram-suggest-connections.md`); and previews individual duplicate candidate memories in a modal.
- **Connect (`ConnectionsTab`):** Scans local AI agents (`/api/agents/scan`) and checks `/api/doctor` to display a header Doctor health badge (`Healthy` or `N issue(s)`), shows detected/missing status and expandable global target file paths, toggles workspace or global linking (with confirmation modal before unlinking), and exposes a **SessionEnd queue** toggle for hosts with `supportsSessionEnd` (`sessionEndLinked`).
- **Documentation deep links:** `HelpLink` and `CommandHelp` resolve versioned Entry reference URLs (`entryDoc`, `entryFieldGroupDoc`, `entryConfigFieldDoc`) and browser-locale-aware operations docs (`operationDoc` across `en`, `vi`, `es`, `fr`, `zh`, `ko`, `ja`, `ru`).

## Workflow

1. **Bootstrap:** `main.tsx` mounts `App` -> `loadPanelData()` populates `PanelData` -> `Sidebar`, `MobileHeader`, `InitBanner`, and active tab render.
2. **Staged mutation pattern:** Across `ConfigTab`, `AuthorTab`, `ConfigFieldGroupEditor`, `ReviewTab`, `UpgradeTab`, and `ConnectionsTab`, destructive or high-impact actions open a confirmation/review modal (via `ModalController` or inline dialog), require explicit user confirmation (and checkboxes for risky config, Git sync, migration, or upgrade apply), execute the CSRF-protected `POST` via `api-client.ts`, show a `Toast` result, and reload server state.
3. **Interactive graph exploration:** `MemoriesTab` sends filter/search state to `/api/memories` -> `layoutMemoryGraph` computes concentric ring initialization + 220 force ticks + 32 collision passes -> `MemoryGraph` renders SVG edges and draggable HTML node buttons -> selecting a node triggers `MemoryDetail` to fetch `/api/memory` for body preview.
4. **Upgrade conflict resolution loop:** User clicks **Preview changes** -> selects a conflict row -> `UpgradeConflictReviewModal` fetches `/api/upgrade/review` -> user inspects Current/Proposed/Diff (`UpgradeConflictDiff` backed by LCS `buildUpgradeConflictDiff`) -> saves decision (`accept-latest`, `edited`, `keep-current`, or `force-latest`) -> once all blockers are reviewed, user confirms the final **Upgrade** modal.

## Code map

| Path | Responsibility |
| --- | --- |
| `src/core/web/app/main.tsx` | React 18 `createRoot` entry point mounting `<App />` into `#root`. |
| `src/core/web/app/App.tsx` | Root state (`data`, `active`, `configSubView`, `sidebarOpen`, `toastState`, `modal`, `error`), `#hash` routing (`parseHash`), `Escape` drawer close, theme sync, workspace init, server shutdown, and tab router. |
| `src/core/web/app/layout/Sidebar.tsx` | Desktop/drawer navigation (`Settings` + `Workspace` sections, `pendingReviewCount` badge on Review, `.sb-close` mobile drawer close), version copy badge, package/config upgrade banners, theme toggle, close server action, and repo links. |
| `src/core/web/app/layout/MobileHeader.tsx` | Mobile top bar with hamburger button toggling the sidebar drawer. |
| `src/core/web/app/layout/InitBanner.tsx` | Conditional banner prompting one-click workspace initialization when uninitialized. |
| `src/core/web/app/tabs/ConfigTab.tsx` | Construct tab: sub-view tablist (`Configuration`, `Profiles`, `Workspaces`, `Runtime`), auto-save policy editor, grouped config fields, async `global_path` validation, and risky-change review modal. |
| `src/core/web/app/tabs/AuthorTab.tsx` | Git tab: global/workspace author profiles, embedded `Global Git` config editor, global Git sync, and legacy memory author migration. |
| `src/core/web/app/tabs/UpgradeTab.tsx` | Updates tab: upgrade status summary, fingerprinted preview table, artifact-kind tabs, bulk eligible conflict confirmation, and confirmed apply. |
| `src/core/web/app/tabs/MemoriesTab.tsx` | Memories tab: debounced search, scope/type/semantic filters, inline Route simulator (`simulateRecall`), `MemoryGraph` + `MemoryDetail` shell, preview/promote/edit/modal-confirmed archive actions. |
| `src/core/web/app/tabs/ReviewTab.tsx` | Review tab: findings + inbox queue with filter pills (`All`, `Session learning`, `Deferred`, `Findings`) and auto-selection (`selectFilter`), `j`/`k`/`a`/`d` keyboard triage, single/bulk receipt approval (`reviewApplyReceipts`), single/batch dismiss, bulk prompt copy/download, collapsible `Review prompt`, context previews, `CompareModal`, `DependencyPicker`, `MemoryDiff`, and confirmed write. |
| `src/core/web/app/tabs/CoreTab.tsx` | Core tab: scoped duplicate pairs, relationship stats, AI resolution/metacognition/connection prompts, and memory preview modal. |
| `src/core/web/app/tabs/ConnectionsTab.tsx` | Connect tab: Doctor health badge (`/api/doctor`), local agent detection grid, expandable global target paths, workspace/global link toggles, and `SessionEnd queue` toggle. |
| `src/core/web/app/tabs/ProfilesTab.tsx` | Construct `Profiles` sub-view: memory profiles management table and add form. |
| `src/core/web/app/tabs/WorkspacesTab.tsx` | Construct `Workspaces` sub-view: registered workspaces management table and add form. |
| `src/core/web/app/tabs/RuntimeTab.tsx` | Construct `Runtime` sub-view: runtime/env key-value cards with click-to-copy values. |
| `src/core/web/app/memories/MemoryGraph.tsx` | Interactive SVG+HTML graph canvas with pan, wheel/button zoom, node drag, neighborhood highlight, and fullscreen mode. |
| `src/core/web/app/memories/MemoryDetail.tsx` | Selected memory inspector displaying `Working`/`Noisy` badges, usage counters, provenance fields, lazy-loaded content, 1-click `Promote`, and Preview/Copy/Edit/Delete actions. |
| `src/core/web/app/memories/graph-layout.ts` | Concentric ring + force-directed layout (`layoutMemoryGraph`), collision resolution, and quadratic Bezier `edgePath` builder. |
| `src/core/web/app/memories/graph-types.ts` | `MemoryNode`, `MemoryLink`, and `NodeBox` types for the graph renderer. |
| `src/core/web/app/components/Badge.tsx` | Compact status badge (`neutral`, `pos`, `neg`, `blue`, `amber`). |
| `src/core/web/app/components/Button.tsx` | Styled button primitive (`primary`, `outline`, `ghost`, `danger`, `danger-solid`, `save`, `cancel`). |
| `src/core/web/app/components/Card.tsx` | Grouped content card with optional `HelpLink`, header badge, and collapsible body. |
| `src/core/web/app/components/CommandHelp.tsx` | Inline `HelpLink` paired with a CLI `<code>` command hint. |
| `src/core/web/app/components/CompareModal.tsx` | Multi-column side-by-side memory comparison dialog (up to 3 columns wide). |
| `src/core/web/app/components/ConfigFieldGroupEditor.tsx` | Reusable bounded config group editor with validation and risky-change review modal (used for `global_git.*`). |
| `src/core/web/app/components/ConfirmModal.tsx` | `ConfirmBody` and `ConfirmActions` building blocks for destructive confirmation dialogs. |
| `src/core/web/app/components/DependencyPicker.tsx` | ID-only relation picker toggling `DEPENDS_ON` and mutually-exclusive `UPDATE` selections. |
| `src/core/web/app/components/HelpLink.tsx` | External documentation icon link opening in a new tab (`noopener noreferrer`). |
| `src/core/web/app/components/Loading.tsx` | Simple centered loading state placeholder. |
| `src/core/web/app/components/MemoryDiff.tsx` | LCS-based read-only side-by-side Current vs. Proposed memory diff viewer. |
| `src/core/web/app/components/MemoryPreviewContent.tsx` | Memory modal body combining `MemoryPropertiesGrid` and monospace content block. |
| `src/core/web/app/components/MemoryPropertiesGrid.tsx` | Frontmatter property grid with click-to-inspect nested detail modal and copy button. |
| `src/core/web/app/components/Modal.tsx` | Global modal overlay with `Escape`/backdrop dismissal and optional header copy button. |
| `src/core/web/app/components/MultiChoice.tsx` | Accessible checkbox group enforcing `minSelected` (default 1) for multi-value policy fields. |
| `src/core/web/app/components/ScopeChips.tsx` | Segmented toggle chip bar used for scope and memory type filters. |
| `src/core/web/app/components/SectionHeader.tsx` | Tab title, subtitle, optional `HelpLink`, and right-aligned action slot. |
| `src/core/web/app/components/Toast.tsx` | Transient success/error toast banner (`#toast`). |
| `src/core/web/app/components/Toggle.tsx` | Accessible `aria-pressed` boolean switch button. |
| `src/core/web/app/components/UpgradeConflictDiff.tsx` | Inline and synchronized-scroll parallel diff viewer for upgrade conflicts. |
| `src/core/web/app/components/UpgradeConflictReviewModal.tsx` | Modal for inspecting, editing, opening in editor, and resolving a single upgrade conflict item. |
| `src/core/web/app/components/upgrade-conflict-diff-model.ts` | Deterministic LCS line-diff generator (`buildUpgradeConflictDiff`) producing inline ops and aligned parallel rows. |
| `src/core/web/app/data/policy-fields.ts` | Typed `POLICY_FIELD_META` registry mapping all 13 policy field paths to labels, descriptions, and docs anchors. |
| `src/core/web/app/utils/clipboard.ts` | `copyText` helper wrapping `navigator.clipboard.writeText` with toast feedback. |
| `src/core/web/app/utils/config.ts` | Dotted-key lookup (`gv`), UI/patch conversions (`uiValue`, `parseFieldValue`), `clientValidationError`, and `groupFields`. |
| `src/core/web/app/utils/docs.ts` | Version-matched Entry docs URL builders (`entryDoc`, `entryFieldGroupDoc`, `entryConfigFieldDoc`) and locale-aware `operationDoc`. |
| `src/core/web/app/utils/format.ts` | Date (`fmtDate`) and relative-time (`relTime`) formatting helpers. |
| `src/core/web/app/utils/html.ts` | Null-safe string coercion helper (`safeText`). |

## Interfaces and data

- **Consumed HTTP interface:** All data fetching and mutations go through [Entry Web Server and HTTP API](../interfaces/entry-web-api.md) via `app/api-client.ts` and `app/types.ts`.
- **Cross-module runtime imports:**
  - `utils/docs.ts` imports `DOCS_SITE_BASE_URL`, `DOCS_SITE_LATEST_VERSION`, `DOCS_SITE_VERSIONS` from `src/core/runtime/docs-site.ts` and `VERSION` from `src/core/runtime/version.ts`.
  - `tabs/UpgradeTab.tsx` imports `isReplaceableConflictKind` from `src/core/upgrade/review-policy.ts` to determine bulk-confirmation eligibility.
- **Browser APIs used:** `fetch`, `navigator.clipboard.writeText`, `Blob`/`URL.createObjectURL` (for `.md` prompt downloads), `window.open` (`vscode://file/...` editor links), `window.confirm` (archive and fallback unlink confirmations), and `document.documentElement.classList` (light/dark theme).

## Verification

- Web UI unit and parity tests verify React tab rendering, config/policy field docs anchors (`entry-docs` / `web-ui-parity` suites), `buildUpgradeConflictDiff` and `UpgradeConflictDiff` / `UpgradeConflictReviewModal` behavior, `graph-layout.ts` positioning and edge paths, `AuthorTab` and `UpgradeTab` confirmation flows, and `ReviewTab` prompt/diff/write interactions.
- Build scripts bundle `src/core/web/app/main.tsx` into `panel.js` alongside CSS and HTML assets served by `entry-server.ts`.

## Related documentation

- [Entry Web Server and HTTP API](../interfaces/entry-web-api.md)
- [Runtime Config and Profiles](../architecture/runtime-config-and-profiles.md)
- [Safety Policy and Review](../architecture/safety-policy-and-review.md)
- [Ingest, Author, and Benchmarks](../features/ingest-author-and-benchmarks.md)
- [Agent Hooks and Skillsets](../features/agent-hooks-and-skillsets.md)
- [Upgrade, VCS, and Diagnostics](../workflows/upgrade-vcs-and-diagnostics.md)
- [Docs Website and Field Sync](../architecture/docs-website-and-field-sync.md)

## Known limitations and open questions

- **Native `window.confirm` fallbacks:** `WorkspacesTab` (unlink), plus `MemoriesTab` (memory archive) and `ConnectionsTab` (unlink) when the `modal` prop is omitted, fall back to `window.confirm` rather than the styled `Modal` component.

<!-- BEGIN MANUAL NOTES -->
<!-- END MANUAL NOTES -->
