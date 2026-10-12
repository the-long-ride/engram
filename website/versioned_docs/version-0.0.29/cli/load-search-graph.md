---
title: load / search / graph
sidebar_position: 2
description: Read commands — load routed memory, search the vault, and inspect graph routing.
---

# load / search / graph

Read commands load routed memory, search the vault, and inspect graph routing.

## load

```bash
engram load "<task>"
engram load --full "<task>"
engram load --dry-run "<task>"
engram load --all "<task>"
engram load --budget-tokens 800 "<task>"
engram load --disclosure full "<task>"
engram load --id <id>,<id>
engram load --exclude-keys workspace:rules/use-pnpm.md "<task>"
```

`load` first anchors routing on meaningful query terms, ignoring generic memory words such as `rule`, `knowledge`, and common stopwords. It then refines the wider candidate pool into a compact context pack. Normal load reports selected and total related counts, like `loaded 8 memory files / 14 total related memories`.

- default `load` — tiered agent-facing route: the top `load.expand_top` hits (default 3) as bodies, every other selected hit as a one-line card, and a closing `fetch: engram load --id <ids>` hint; each body header carries the memory's `authority`, frontmatter such as `evidence_refs`, `## Context`, `## Example`, and `## Origin` are not rendered (use `--full` for them), and rules show one selected variant
- `--id <id,...>` — fetch full bodies for cards; ids can be comma-separated, and an explicit fetch counts towards `stats --usage`
- `--budget-tokens <200-16000>` — hard cap on the complete tiered output; bodies become cards first, and only then are the lowest-ranked cards left out
- `--disclosure auto|full` — `full` prints every packed body instead of the tiered pack (also `load.disclosure: full` in config)
- `--exclude-keys <scope:file,...>` — skip memories the caller already holds; no body or card is printed, and `--json` lists them under `already_loaded`
- `--full` — broader legacy output with full frontmatter and full rule variants
- `--dry-run` — show candidate counts, narrowing tags, and match reasons without printing content
- `--all` — return every visible routed match instead of the compact limit

`workflow` and `workflows` still route to skill memories, but generic type words do not make a broad match by themselves.

Under `auto` disclosure, the JSON `selected` and `entries` lists describe the expanded bodies only; cards are reported separately. Configure `load.expand_top` and `load.disclosure` in the `load` block of `engram.config.json` (see [profiles / workspaces / config](profiles-workspaces-config.md#load-configuration)).

## search

```bash
engram search "<topic>"
engram search --semantic "<topic>"
```

Default search is deterministic lexical search. `search --semantic` adds deterministic local similarity, not embedding-backed semantic search. `search --json` results carry a `score` field.

## graph

```bash
engram graph "<topic>"
engram graph --rebuild
```

Inspect graph routing. Run `engram graph --rebuild` after manual edits. The graph reports dependency layers, and `engram load` pulls routed prerequisites into the same compact context pack before deeper memories.

Graph related edges and vector hits cannot load unrelated memories by themselves; they only help rerank or expand memories that already overlap meaningful query terms. Explicit `depends_on` prerequisites may still load without their own keyword overlap.

## Dependency layers

```yaml
depends_on: [release-foundation]
level: advanced
```

Use `depends_on` frontmatter when a memory should build on another memory instead of repeating it.

## Next steps

- [save / save-session / observe](save-session.md)
- [Concepts: read path and routing](../concepts/read-path.md)
