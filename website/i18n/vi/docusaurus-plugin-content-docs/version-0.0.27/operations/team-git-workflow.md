---
title: Quy trình làm việc nhóm với Git
sidebar_position: 1
description: Sử dụng Git để truyền tải bộ nhớ Engram giữa các máy và lưu giữ lịch sử đánh giá.
---

# Quy trình làm việc nhóm với Git

Git truyền tải bộ nhớ giữa các máy và lưu lịch sử đánh giá. Engram hoạt động tự nhiên với Git: bộ nhớ là các tệp Markdown thông thường, do đó quy trình Git bình thường sẽ được áp dụng.

## Bộ nhớ Workspace dưới dạng submodule

Nếu con người muốn theo dõi thư mục `.agents/.engram` như một kho lưu trữ riêng biệt:

```bash
engram inject --submodule
engram inject --submodule-remote <git-url>
```

Engram sẽ xác thực URL, khởi tạo submodule trên nhánh `main` và tạo commit submodule đầu tiên với nội dung `Initialize engram`.

## Git origin toàn cục được chia sẻ (Shared global Git origin)

Nếu lệnh `engram entry` không hiển thị trường `global_git_detected.remote_url`, hãy hỏi người dùng xem bộ nhớ global có nên được chia sẻ qua Git hay không. Khi họ cung cấp URL:

```bash
engram inject --global-remote <git-url>
```

Định cấu hình hành vi đồng bộ hóa bằng các trường `global_git.*`:

- `global_git.enabled` — bật tính năng Git cho bộ nhớ global
- `global_git.remote` — tên remote (mặc định là `origin`)
- `global_git.remote_url` — URL remote của bộ nhớ global dùng chung
- `global_git.branch` — nhánh đích (mặc định là `main`)
- `global_git.auto_sync` — hành vi tự động pull/push
- `global_git.auto_resolve` — tự động xử lý xung đột

:::warning
Tự động xử lý xung đột có thể che giấu các khác biệt (diffs) bộ nhớ. Hãy xem lại các khác biệt của bộ nhớ trước khi dựa vào `global_git.auto_resolve`.
:::

## Quy trình đánh giá (Review workflow)

1. Agent đề xuất các ứng viên bộ nhớ.
2. Con người phê duyệt thông qua cổng A/B/C (terminal) hoặc `yes`/`audit`/`cancel` (chat).
3. Engram viết Markdown đã phê duyệt và làm mới mã băm, chỉ mục, đồ thị và nhật ký thay đổi.
4. Commit và push thay đổi bộ nhớ qua Git.
5. Các thành viên khác pull về và chạy `engram upgrade` để đồng bộ đối chiếu.

## Bước tiếp theo

- [Quy trình phát hành và nâng cấp](release-upgrade.md)
- [Concepts: đường dẫn ghi và phê duyệt](../concepts/write-path.md)
