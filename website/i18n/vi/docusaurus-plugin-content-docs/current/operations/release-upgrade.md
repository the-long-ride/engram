---
title: Release and upgrade process
sidebar_position: 2
description: Upgrade Engram packages and reconcile memory roots safely.
---

# Release and upgrade process

## After an npm package update

The next normal Engram command quietly reconciles already-initialized workspace/global roots once for the new version. This covers release-to-release memory schema changes from v0.0.8 onward by refreshing generated help, memory indexes, graph files, and eligible vector sidecars when older metadata is detected.

The startup check is intentionally cheap after the first run: it only reads small config markers when the current version is already recorded. It does not run from npm postinstall, create new memory roots, or replace human-authored files. Use `--no-auto-upgrade` or `ENGRAM_NO_AUTO_UPGRADE=1` to skip it for a command.

## Explicit upgrade

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

`engram upgrade` refreshes generated workspace help, memory indexes, graph files, eligible vector sidecars, existing Engram-generated workspace skillset files, and registered global skillsets while preserving human-authored files.

`engram upgrade --latest` is stronger: it overwrites current Engram-managed linked agent artifacts for already-linked workspace agents and registered global installs, including instruction files, rules, MCP/plugin config, and managed hooks, so linked hosts pick up the new package output immediately.

Use `--force` only when replacing generated Engram adapter files intentionally.

## Skillset render profiles

For runtime-capable hosts, Engram installs small bootstrap instructions instead of the full protocol. Hooks provide routed task context, MCP tools provide load/search/proposal behavior, and slash adapters or Agent Skills carry detailed command workflows. Fallback targets without reliable runtime context injection still receive compact manual instructions.

## SQLite config DB fallback

Engram's SQLite config DB is an optimization for workspace/profile management. If the DB cannot be opened or initialized, normal read/write commands fall back to JSON config snapshots. DB-specific commands report SQLite as unavailable instead of blocking normal memory use.

## Next steps

- [Troubleshooting](troubleshooting.md)
- [CLI: inject / link / upgrade](../cli/inject-link-upgrade.md)

## Legacy memory migration to schema v3

`engram upgrade --latest` also migrates active v1/v2 memory files in the workspace and configured global roots to schema v3. Engram preserves each Markdown body exactly, creates `<memory-file>.pre-v3.bak`, fills only deterministic metadata, refreshes integrity hashes, and rebuilds the index, graph, and eligible vector sidecars. It never invents `evidence_refs`; a memory without verified trace links is marked `evidence_status: unverified`. Invalid memories are reported and skipped, archived memories are not rewritten, and a second run is idempotent.

Preview all changes without writing:

```bash
engram upgrade --latest --plan
```

Run only the memory migration, without overwriting linked agent artifacts:

```bash
engram upgrade --migrate-memories
```

Skip memory migration during a latest upgrade:

```bash
engram upgrade --latest --no-migrate-memories
```

<!-- configuration-upgrade-inventory -->

Rà soát xung đột sử dụng cùng một kế hoạch chia sẻ trong CLI và Entry. Chạy ngram upgrade --latest --review để chấp nhận đề xuất mới nhất theo loại, chỉnh sửa qua $VISUAL/$EDITOR hoặc xác nhận **Keep current**. Entry cung cấp các chế độ xem **Current**, **Proposed** và **Diff**; **Diff** mặc định ở chế độ **Inline** và có thể chuyển sang **Parallel**, với nội dung bị xóa được làm nổi bật màu đỏ và nội dung thêm vào màu xanh. Thao tác áp dụng cuối cùng bị chặn khi pendingReviewCount khác 0, và ngram upgrade --latest --yes từ chối các quyết định chưa giải quyết hoặc đã lỗi thời. Mỗi quyết định được kiểm tra so với mã băm nguồn trước khi ghi.

## Đối soát cấu hình nhận biết quyền sở hữu

Danh mục nâng cấp loại bỏ trùng lặp các tích hợp đã đăng ký theo tệp vật lý. Nếu nhiều host chia sẻ cùng một hướng dẫn Engram, Engram sẽ render và ghi tệp đó một lần.

Khi việc chỉnh sửa thủ công khiến tệp không an toàn để thay thế bình thường, Entry chỉ cung cấp **Force upgrade** khi có thể chứng minh quyền sở hữu. Đối với khối Engram được đánh dấu, việc buộc thay thế chỉ thay thế khối Engram đó và giữ nguyên văn bản người dùng xung quanh. Đối với tệp được sinh/tạo bởi Engram, việc buộc thay thế có thể thay thế toàn bộ tệp được sinh ra. Quyền sở hữu không rõ ràng không bao giờ có thể buộc thay thế, và xác nhận hàng loạt không bao giờ thực hiện hành động buộc.

Việc áp dụng thành công được xác minh bằng cách quét lại sau khi ghi. Các tệp mong đợi cập nhật không hội tụ về current sẽ được báo cáo là lỗi xác minh.

## Git author identity

Engram can store a global author and an optional workspace override. Resolution is workspace, global, then read-only Git fallback. Settings affect future memories only; a workspace override never changes global Git configuration. Use explicit plan and confirmation for global Git sync or legacy-memory migration.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Read the complete [Git author settings guide](../operations/git-author-settings.md).
