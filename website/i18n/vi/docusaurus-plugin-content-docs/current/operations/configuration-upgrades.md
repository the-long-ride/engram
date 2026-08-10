---
title: Configuration upgrades
sidebar_position: 3
description: Preview, review, and safely upgrade Engram-managed memories and connected-agent configuration.
---

# Configuration upgrades

Engram uses one upgrade inventory engine for the CLI and Entry Web UI. It scans the configured **workspace** and **global** scopes, classifies Engram-managed artifacts, builds a deterministic plan, and uses hashes/fingerprints to prevent stale writes.

```bash
engram upgrade --latest --plan
engram upgrade --latest --review
engram upgrade --latest
engram upgrade --latest --yes
engram upgrade --help
```

`--plan` is read-only. Human-readable output is grouped by artifact kind in this order: Config, Instructions, Memories, Skillsets, Hooks, Plugins. `--plan --json` exposes the same grouped plan, its fingerprint, review states, and `pendingReviewCount`. UI kind tabs use the exact labels `All`, `Config`, `Instructions`, `Memories`, `Skillsets`, `Hooks`, `Plugins`.

## What Engram detects

The inventory covers `memory`, `instruction`, `skillset`, `config`, `hook`, and `plugin` artifacts in known Engram locations or registered connected-agent installs. Workspace and global roots are scanned separately; Engram does not recursively crawl arbitrary home-directory trees.

Engram first trusts explicit schema/version metadata and registered install metadata. Legacy files without markers fall back to known managed structure and expected content. Each item is classified as `current`, `outdated`, `conflict`, or `invalid`.

## Type-aware replacement and merge

A conflict means **review required**, not permanently blocked. Engram preserves user edits until the user confirms a replacement/merge decision.

- **Instructions:** Engram proposes the latest managed block while preserving user text outside Engram markers. An Engram-owned whole instruction file can be replaced.
- **Skillsets:** Engram proposes the latest Engram-managed content. Explicitly user-owned sections are preserved when the format supports them.
- **Config:** Engram parses the configuration and proposes a merged migration: known Engram keys are upgraded, new defaults are added where required, and unrelated user keys/values are preserved.
- **Memories:** Engram performs schema migration rather than template replacement.
- **Hooks/plugins:** generated artifacts are replaced only when ownership is provable. Ambiguous user code stays review-only and can be confirmed as **Keep current**.

## Entry Web UI conflict review

The Updates page now uses a compact dashboard: a **status banner** reports whether configuration is current, needs an update, or requires conflict review; the **Workspace**, **Global**, and **Conflicts** summary cards show the important counts at a glance. After preview, every actionable item appears in one **actionable artifact table** with Artifact, Scope, Agent(s), Status, Review, and Actions columns. The table stays structurally intact on narrow screens and uses one shared **horizontal scroll** container instead of per-row scrollbars.

Open `engram entry`, then **Settings → Updates**. The sidebar **copy command** action copies `engram upgrade --latest --plan` without navigating away. The preview has `All` plus only actionable kind tabs: `Config`, `Instructions`, `Memories`, `Skillsets`, `Hooks`, and `Plugins`.

Every conflict has a **Review** action. The modal provides **Current**, **Proposed**, and **Diff** views. **Current** is read-only. **Proposed** is editable for replaceable Config/Instruction/Skillset items and starts from Engram's type-aware merged/replacement result. **Diff** defaults to **Inline** and can switch to **Parallel**. Inline marks removed lines with `-` trên nền đỏ and added lines with `+` trên nền xanh; Parallel aligns **Current** and **Proposed** rows with the same nổi bật đỏ/xanh. Use **Use latest**, **Reset proposed**, **Keep current**, or—when Engram can prove ownership—**Force upgrade**, then **Confirm change**.

**Open in editor** opens the exact current artifact resolved by the server, using `$VISUAL`, then `$EDITOR`, then the platform fallback. The browser never supplies a filesystem path. For **Instructions**, **Proposed** contains only the managed `<!-- engram:start -->` block; the full global skillset stays in the companion `.agents/engram.md` guide. If the external edit changes the file, the preview/source hash becomes stale and the review must be refreshed before confirmation.

Eligible pending replaceable conflicts have selection checkboxes. **Select all visible** selects eligible rows in the active kind tab; selection persists when switching tabs. **Confirm selected changes** accepts **Use latest** for the checked rows, while **Confirm all changes** accepts **Use latest** for every eligible pending conflict in the full preview. Non-replaceable, stale, and already-reviewed rows cannot be selected. The server validates the complete batch against the preview fingerprint, current source hashes, review states, and generated proposals before one atomic review-store write. If any selected item fails validation, zero batch decisions are saved.

Entry uses the same custom checkbox treatment across upgrade review: checked, keyboard-focus, and disabled states are visibly distinct. Result toast feedback uses a viền/hào quang xanh for success and a viền/hào quang đỏ for errors.

The page shows review progress. The final Upgrade action remains disabled until every conflict is explicitly resolved as accepted latest, edited proposal, **Force upgrade**, or **Keep current**. A final confirmation summarizes automatic updates, accepted proposals, edited proposals, forced replacements, kept-current files, and backups.

## Ownership-aware force upgrade

Engram canonicalizes connected-agent upgrade inventory by **physical file**, so a shared guide such as `.agents/engram.md` is represented once even when Codex, Claude, Gemini, or another registered host points at it. The host list remains visible as metadata, but one physical file receives one canonical renderer output and one write transaction.

**Force upgrade** is intentionally narrower than **Use latest**. It appears only when Engram can prove an ownership boundary:

- **Managed region:** Engram replaces only the marked Engram block and preserves all user-authored bytes outside it, including the file's CRLF/LF newline style.
- **Generated file:** Engram may replace the whole registered/generated Engram file, including manual edits inside that Engram-owned file.
- **Unknown ownership:** no Force upgrade action is offered; use **Keep current** or resolve the ownership ambiguity first.

Bulk controls never force. **Confirm selected changes** and **Confirm all changes** remain limited to safe **Use latest** decisions. Force decisions are reviewed one item at a time and are rejected if the source hash, ownership evidence, or force mode changed after preview.

After writes complete, Engram rescans the upgraded physical artifacts. Expected-updated items must converge to `current`; a failed or rolled-back transaction, or an item that remains `outdated`/`conflict`, makes the entire apply report an error instead of showing a success toast. Explicit **Keep current** items are excluded from that convergence requirement.

## CLI conflict review

Run:

```bash
engram upgrade --latest --review
```

The interactive reviewer handles unresolved conflicts one at a time:

```text
[V] View diff
[E] Edit proposed content
[L] Accept latest proposal
[K] Keep current
[Q] Save and quit
```

`E` opens a temporary proposed file using `$VISUAL`, then `$EDITOR`, then a platform fallback. Engram validates the edited proposal before accepting it. Decisions are persisted under Engram state by plan fingerprint, so `Q` can stop the session and a later `--review` resumes the saved decisions.

For automation:

```bash
engram upgrade --latest --yes
```

`--yes` never invents conflict decisions. If any conflict remains pending or stale, Engram exits non-zero and asks you to run `engram upgrade --latest --review`.

## Stale-review protection

Every reviewed item records its source hash. Before apply, Engram compares the current source hash with the reviewed source hash. If the file changed after review, that decision becomes stale/pending and must be reviewed again. A plan fingerprint also prevents applying a different inventory than the one reviewed.

## Transaction groups, backup, and rollback

Accepted replacements and merges use the same transaction path as safe automatic upgrades. Engram captures original bytes and permissions, creates backups where required, validates proposed content, writes through a temporary file, and atomically renames it into place. A failed durable transformation rolls back its transaction group. **Keep current** performs no write.

## Vector index is fail-open

Vector search is an optional acceleration layer. Engram binds `sqlite-vec` `memory_vectors` primary keys with integer-compatible `BigInt` values. If vector rebuilding fails, Engram removes the incomplete vector sidecar/WAL/SHM, reports a degraded warning, and continues the durable lexical/graph upgrade. A vector-only failure cannot abort an otherwise valid configuration upgrade.

## Package version vs configuration state

A new npm package and outdated local configuration are separate signals. Recommended release flow:

```bash
npm install -g @the-long-ride/engram@latest
engram upgrade --latest --plan
engram upgrade --latest --review
engram upgrade --latest
```

Re-running the upgrade is idempotent for current artifacts. Reviewed `Keep current` files remain untouched unless their state changes and requires a new review.

## Đối soát cấu hình nhận biết quyền sở hữu

Danh mục nâng cấp loại bỏ trùng lặp các tích hợp đã đăng ký theo tệp vật lý. Nếu nhiều host chia sẻ cùng một hướng dẫn Engram, Engram sẽ render và ghi tệp đó một lần.

Khi việc chỉnh sửa thủ công khiến tệp không an toàn để thay thế bình thường, Entry chỉ cung cấp **Force upgrade** khi có thể chứng minh quyền sở hữu. Đối với khối Engram được đánh dấu, việc buộc thay thế chỉ thay thế khối Engram đó và giữ nguyên văn bản người dùng xung quanh. Đối với tệp được sinh/tạo bởi Engram, việc buộc thay thế có thể thay thế toàn bộ tệp được sinh ra. Quyền sở hữu không rõ ràng không bao giờ có thể buộc thay thế, và xác nhận hàng loạt không bao giờ thực hiện hành động buộc.

Việc áp dụng thành công được xác minh bằng cách quét lại sau khi ghi. Các tệp mong đợi cập nhật không hội tụ về current sẽ được báo cáo là lỗi xác minh.

Trang cập nhật sử dụng bảng điều khiển gọn gàng: **biểu ngữ trạng thái** báo cáo tình trạng, các thẻ **Workspace**, **Global** và **Conflicts** hiển thị số lượng. Các phần tử hiển thị trong **bảng** với **cuộn ngang** chia sẻ. Sử dụng **ô chọn** tùy chỉnh và **thông báo** kết quả hiển thị viền xanh cho **thành công** và viền đỏ cho **lỗi**.
