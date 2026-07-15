---
title: verify / repair / quality-check
sidebar_position: 6
description: Các lệnh bảo trì — xác minh mã băm, sửa chữa tệp lỗi, kiểm tra chất lượng và giải quyết xung đột.
---

# verify / repair / quality-check

Các lệnh bảo trì giúp giữ cho bộ nhớ khỏe mạnh.

## verify

```bash
engram verify
```

Kiểm tra mã băm để đảm bảo tính toàn vẹn. Chạy sau khi chỉnh sửa thủ công hoặc nhập dữ liệu.

## repair

```bash
engram repair
engram rebuild-index
```

Sử dụng `repair` sau khi chỉnh sửa thủ công hoặc nhập dữ liệu để tìm các tệp bộ nhớ bị lỗi cấu trúc bị bỏ qua bởi việc xây dựng lại chỉ mục.

## quality-check

```bash
engram quality-check
```

Báo cáo các ứng viên mâu thuẫn một cách ngắn gọn. Phát hiện mâu thuẫn là mang tính heuristic và tham khảo.

## graph

```bash
engram graph "package manager"
engram graph --rebuild
```

Kiểm tra định tuyến đồ thị trước khi lưu trữ. Chạy `engram graph --rebuild` sau khi chỉnh sửa thủ công.

## archive

```bash
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Lưu trữ bộ nhớ sai hoặc bị thay thế. Sử dụng archive, không dùng delete, để phục vụ mục đích kiểm toán. Tệp rời khỏi định tuyến hoạt động chỉ sau khi phê duyệt và vẫn được bảo tồn dưới thư mục `archive/`.

## resolve-conflicts

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
```

Xem trước hoặc chỉ giải quyết các xung đột bộ nhớ không gian làm việc do Engram sở hữu. Thêm `--metacognize` khi tác nhân nên xem xét thư mục bộ nhớ sau khi xử lý xung đột. Lệnh này giữ cho việc xử lý xung đột mang tính quyết định trong phạm vi `.agents/.engram/`, sau đó thêm gói nguồn tự đánh giá không gian làm việc cho các ứng viên `TYPE/TEXT` ngắn gọn.

## benchmark

```bash
engram benchmark
```

Kiểm tra suy thoái truy xuất.

## Các bước tiếp theo

- [sync / archive](sync-archive.md)
- [Khắc phục sự cố vận hành](../operations/troubleshooting.md)
