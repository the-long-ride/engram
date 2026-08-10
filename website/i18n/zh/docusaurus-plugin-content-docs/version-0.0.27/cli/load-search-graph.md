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
```

`load` first anchors routing on meaningful query terms, ignoring generic memory words such as `rule`, `knowledge`, and common stopwords. It then refines the wider candidate pool into a compact context pack. Normal load reports selected and total related counts, like `loaded 8 memory files / 14 total related memories`.

- default `load` — compact agent-facing route (only `id`, `type`, `tags`, `confidence`, `depends_on` in frontmatter; one selected rule variant)
- `--full` — broader legacy output with full frontmatter and full rule variants
- `--dry-run` — show candidate counts, narrowing tags, and match reasons without printing content
- `--all` — return every visible routed match instead of the compact limit

`workflow` and `workflows` still route to skill memories, but generic type words do not make a broad match by themselves.

## search

```bash
engram search "<topic>"
engram search --semantic "<topic>"
```

Default search is deterministic lexical search. `search --semantic` adds deterministic local similarity, not embedding-backed semantic search.

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
