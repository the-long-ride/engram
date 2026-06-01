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

긴 세션 memory proposal에는 `save-session`을 사용합니다. 짧은 형식은 `ss`입니다.

## Save Session

```text
TYPE: rule | TEXT: Always run tests before release.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

Without `--accept-all`, Engram asks which candidates to save. With `ss -a`, every candidate is saved because the human explicitly approved.

## Take Control

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
```

Saved memories record `source_files` and `source_hashes`.

## Observe

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`inbox/` notes are not active memory until converted.

## Repair And Review

```bash
engram repair
engram rebuild-index
engram verify
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

다음: [Comparison](comparison.md).
