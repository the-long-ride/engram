---
title: Troubleshooting
sidebar_position: 3
description: Common Engram problems and how to recover.
---

# Troubleshooting

First step: open `engram entry` and read the **Runtime** tab. It shows the resolved profile, memory roots, core config, routing, graph, and Git detection.

## Memory did not load

- Run `engram load --dry-run "<task>"` to inspect candidate counts and narrowing tags.
- Check `engram config view` for `enabled`, `read`, and `load.limit`.
- Confirm workspace memory exists under `.agents/.engram/`.
- Run `engram verify` to check hashes.

## Hooks not injecting

- Confirm `engram set-read status` is not `off` or `manual`.
- Confirm the host is linked: `engram link <target>`.
- Restart or reload the host after `link`/`unlink` (especially OpenCode).
- Check `engram set-proof status` for proof line visibility.

## Save failed

- Read the approval preview for related-memory hints.
- If accept-all reported related memories, no file was saved. Rerun with `DEPENDS_ON` or `UPDATE` candidates.
- Check schema, secret, and injection scan errors in the CLI output.

## Profile confusion

- Run `engram profile status`.
- Confirm the workspace `default_profile` and active user profile.
- Remember: an explicit profile different from the workspace default disables workspace memory for that command.

## Invalid memory files

```bash
engram verify
engram repair
engram rebuild-index
engram graph --rebuild
```

## Stale adapters after package update

```bash
engram upgrade
engram upgrade --latest
engram link all
```

Use `--force` only when replacing generated Engram adapter files intentionally.

## SQLite config DB unavailable

Normal read/write commands fall back to JSON config snapshots. DB-specific commands report SQLite as unavailable instead of blocking normal memory use.

## Global Git sync issues

- Confirm `global_git.enabled` is `true`.
- Check `global_git.remote_url` is a valid Git remote URL.
- Review `global_git.auto_resolve` — auto conflict handling can mask memory diffs.
- Run `engram entry` and open the Construct tab, or run `engram config view`, to inspect resolved Git detection.

## Next steps

- [FAQ](faq.md)
- [CLI: verify / repair / quality-check](../cli/verify-repair-quality.md)
