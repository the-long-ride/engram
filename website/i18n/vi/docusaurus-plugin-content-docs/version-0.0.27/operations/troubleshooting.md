---
title: Khắc phục sự cố
sidebar_position: 3
description: Các sự cố thường gặp của Engram và cách khôi phục.
---

# Khắc phục sự cố

Bước đầu tiên: mở `engram entry` và đọc tab **Runtime**. Tab này hiển thị hồ sơ đã được phân giải, các gốc bộ nhớ, cấu hình cốt lõi, định tuyến, đồ thị và phát hiện Git.

## Bộ nhớ không tải được

- Chạy lệnh `engram load --dry-run "<tác vụ>"` để kiểm tra số lượng ứng viên và các thẻ thu hẹp phạm vi.
- Kiểm tra `engram config view` xem các trường `enabled`, `read`, và `load.limit` có được bật hay không.
- Xác nhận bộ nhớ workspace có tồn tại trong thư mục `.agents/.engram/`.
- Chạy lệnh `engram verify` để kiểm tra các mã băm.

## Các hook không chèn được

- Xác nhận trạng thái `engram set-read status` không ở chế độ `off` hoặc `manual`.
- Xác nhận host đã được liên kết: `engram link <mục-tiêu>`.
- Khởi động lại hoặc tải lại host sau khi thực hiện `link`/`unlink` (đặc biệt là đối với OpenCode).
- Kiểm tra `engram set-proof status` xem dòng chứng minh (proof line) có hiển thị hay không.

## Lưu không thành công

- Đọc bản xem trước phê duyệt để xem các gợi ý về bộ nhớ liên quan.
- Nếu accept-all báo cáo bộ nhớ liên quan, không có tệp nào được lưu. Hãy chạy lại với các ứng viên `DEPENDS_ON` hoặc `UPDATE`.
- Kiểm tra lỗi quét lược đồ, quét secrets và tiêm lệnh (injection scan) trong đầu ra của CLI.

## Nhầm lẫn hồ sơ (Profile confusion)

- Chạy lệnh `engram profile status`.
- Xác nhận hồ sơ mặc định của workspace `default_profile` và hồ sơ hoạt động của người dùng.
- Hãy nhớ rằng: việc chỉ định một hồ sơ rõ ràng khác với mặc định của workspace sẽ vô hiệu hóa bộ nhớ workspace đối với lệnh đó.

## Các tệp bộ nhớ không hợp lệ

```bash
engram verify
engram repair
engram rebuild-index
engram graph --rebuild
```

## Các bộ điều hợp lỗi thời sau khi cập nhật gói

```bash
engram upgrade
engram upgrade --latest
engram link all
```

Chỉ sử dụng `--force` khi có chủ ý thay thế các tệp bộ điều hợp Engram được tạo.

## Cơ sở dữ liệu SQLite config không khả dụng

Các lệnh đọc/ghi thông thường sẽ tự động chuyển sang sử dụng các ảnh chụp nhanh cấu hình JSON (JSON config snapshots). Các lệnh đặc thù của cơ sở dữ liệu sẽ báo cáo SQLite không khả dụng thay vì chặn việc sử dụng bộ nhớ thông thường.

## Sự cố đồng bộ hóa Git toàn cầu

- Xác nhận `global_git.enabled` được đặt thành `true`.
- Kiểm tra xem `global_git.remote_url` có phải là một URL Git remote hợp lệ hay không.
- Xem lại trường `global_git.auto_resolve` — tự động xử lý xung đột có thể che giấu các khác biệt bộ nhớ.
- Chạy tab Runtime của `engram entry` để kiểm tra `global_git_detected`.

## Bước tiếp theo

- [Câu hỏi thường gặp](faq.md)
- [CLI: verify / repair / quality-check](../cli/verify-repair-quality.md)
