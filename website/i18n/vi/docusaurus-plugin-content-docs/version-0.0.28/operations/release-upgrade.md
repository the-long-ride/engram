---
title: Quy trình phát hành và nâng cấp
sidebar_position: 2
description: Nâng cấp các gói Engram và đối chiếu các gốc bộ nhớ một cách an toàn.
---

# Quy trình phát hành và nâng cấp

## Sau khi cập nhật gói npm

Lệnh Engram thông thường tiếp theo sẽ âm thầm đối chiếu các gốc workspace/global đã khởi tạo một lần cho phiên bản mới. Điều này bao gồm các thay đổi lược đồ bộ nhớ từ phiên bản này sang phiên bản khác từ v0.0.8 trở đi bằng cách làm mới trợ giúp được tạo, chỉ mục bộ nhớ, tệp đồ thị và các vector sidecar đủ điều kiện khi phát hiện siêu dữ liệu cũ hơn.

Kiểm tra khi khởi động cố ý được tối ưu hóa rất nhẹ sau lần chạy đầu tiên: nó chỉ đọc các dấu hiệu cấu hình nhỏ khi phiên bản hiện tại đã được ghi nhận. Nó không chạy từ npm postinstall, tạo gốc bộ nhớ mới hoặc thay thế các tệp do con người viết. Sử dụng `--no-auto-upgrade` hoặc `ENGRAM_NO_AUTO_UPGRADE=1` để bỏ qua thao tác này cho một lệnh.

## Nâng cấp rõ ràng

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

Lệnh `engram upgrade` làm mới các trợ giúp workspace được tạo, chỉ mục bộ nhớ, tệp đồ thị, các vector sidecar đủ điều kiện, các tệp skillset workspace do Engram tạo hiện có và các skillset toàn cục đã đăng ký trong khi vẫn giữ nguyên các tệp do con người tự viết.

Lệnh `engram upgrade --latest` mạnh mẽ hơn: nó ghi đè lên các bản cấu phần agent liên kết được quản lý bởi Engram hiện tại cho các agent workspace đã liên kết và các lượt cài đặt toàn cục đã đăng ký, bao gồm các tệp hướng dẫn, quy tắc, cấu hình MCP/plugin và các hook được quản lý, để các host liên kết nhận được gói đầu ra mới ngay lập tức.

Chỉ sử dụng `--force` khi có chủ ý thay thế các tệp bộ điều hợp Engram được tạo.

## Hồ sơ kết xuất bộ kỹ năng (Skillset render profiles)

Đối với các host hỗ trợ chạy thực thi (runtime-capable), Engram sẽ cài đặt các hướng dẫn bootstrap nhỏ thay vì toàn bộ giao thức. Các hook cung cấp ngữ cảnh tác vụ được định tuyến, công cụ MCP cung cấp hành vi tải/tìm kiếm/đề xuất và các bộ điều hợp slash hoặc Agent Skills mang lại các quy trình lệnh chi tiết. Các mục tiêu dự phòng không có chèn ngữ cảnh thời gian chạy đáng tin cậy vẫn sẽ nhận được hướng dẫn thủ công nhỏ gọn.

## Cơ chế dự phòng cơ sở dữ liệu SQLite config

Cơ sở dữ liệu cấu hình SQLite của Engram là một tối ưu hóa cho việc quản lý workspace/profile. Nếu cơ sở dữ liệu không thể mở hoặc khởi tạo, các lệnh đọc/ghi bình thường sẽ tự động chuyển sang sử dụng các ảnh chụp nhanh cấu hình JSON (JSON config snapshots). Các lệnh đặc thù của cơ sở dữ liệu sẽ báo cáo SQLite không khả dụng thay vì chặn việc sử dụng bộ nhớ thông thường.

## Bước tiếp theo

- [Khắc phục sự cố](troubleshooting.md)
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

Read the complete [Git author settings guide](git-author-settings.md).
