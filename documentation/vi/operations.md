# Huong Dan Operations

Trang nay giu chi tiet su dung de README gon hon.

## Command Surface

| Nhu cau | Lenh |
| --- | --- |
| Load memory cho task | `engram load "<task>"` |
| Search memory | `engram search "<topic>"` |
| Save mot memory | `engram save [rule|workflow|knowledge] "<text>"` |
| Save nhieu memory tu session | `engram save-session` hoac `engram ss` |
| Chap nhan tat ca candidates | `engram ss -a` |
| Ghi raw note | `engram observe --file session.md` |
| Chuyen docs/guidance co san | `engram take-control --all` |
| Preview source takeover | `engram take-control --plan` |
| Inspect graph routing | `engram graph "<topic>"` |
| Kiem tra hash | `engram verify` |
| Tim memory file loi | `engram repair` |
| Archive memory sai | `engram archive --reason "<why>" <id-or-file>` |
| Dieu chinh do manh rule | `engram set-rule-variant strict|balanced|light|off` |

Dung `save-session` cho long-session memory proposals. Dang ngan: `ss`.

## Save Session

Dung `save-session` khi long interaction tao nhieu candidate:

```text
TYPE: rule | TEXT: Always run tests before release.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

Khong co `--accept-all`, Engram hoi candidate nao can save. Voi `ss -a`, moi candidate sinh ra duoc save vi con nguoi da chap nhan ro rang shortcut do.

## Take Control

`take-control` giup dua Engram vao repo co san. No scan agent guidance, notes, docs va file duoc chon, roi nho agent tao candidates ngan gon.

Selectors huu ich:

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
```

Memory duoc save tu take-control co `source_files` va `source_hashes`, nen lan sau source khong doi se duoc bo qua.

## Observe

`observe` luu raw note da sanitize vao `inbox/`. Inbox note khong phai active memory.

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

Dung khi muon giu rough note truoc khi quyet dinh cai gi nen thanh durable memory.

## Repair Va Review

Dung `repair` sau manual edit hoac import:

```bash
engram repair
engram rebuild-index
engram verify
```

Dung graph va quality check truoc khi archive:

```bash
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Tiep theo: [So sanh va roadmap](comparison.md).
