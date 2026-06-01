# Operations Guide

## Commands

| Need | Command |
| --- | --- |
| Load task memory | `engram load "<task>"` |
| Search memory | `engram search "<topic>"` |
| Save one memory | `engram save [rule|workflow|knowledge] "<text>"` |
| Save session | `engram save-session` or `engram ss` |
| Accept all | `engram ss -a` |
| Capture raw note | `engram observe --file session.md` |
| Import docs/guidance | `engram take-control --all` |
| Preview takeover | `engram take-control --plan` |
| Inspect graph | `engram graph "<topic>"` |
| Verify hashes | `engram verify` |
| Find invalid files | `engram repair` |
| Archive wrong memory | `engram archive --reason "<why>" <id-or-file>` |
| Tune rule strength | `engram set-rule-variant strict|balanced|light|off` |

長いセッションの memory proposal には `save-session` を使います。短縮形は `ss` です。

## Save Session

```text
TYPE: rule | TEXT: Always run tests before release.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`--accept-all` なしでは Engram が保存する候補を確認します。`ss -a` は人間が明示承認したので全候補を保存します。

## Take Control

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
```

保存された memories は `source_files` と `source_hashes` を記録します。

## Observe

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`inbox/` notes は変換されるまで active memory ではありません。

## Repair And Review

```bash
engram repair
engram rebuild-index
engram verify
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

次: [Comparison](comparison.md)。
