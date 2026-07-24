---
title: save / save-session / observe
sidebar_position: 3
description: Các lệnh ghi — lưu một bộ nhớ, lưu nhiều bộ nhớ từ một phiên làm việc và ghi lại các ghi chú thô.
---

# save / save-session / observe

Các lệnh ghi đề xuất bộ nhớ thông qua cổng phê duyệt.

## save

```bash
engram save [rule|workflow|knowledge] "<text>"
engram save --role frontend "<text>"
engram save --scope global "<text>"
```

`engram save` nắm bắt ứng viên bộ nhớ đơn lẻ tốt nhất, tự động cập nhật bộ nhớ phù hợp hoặc tạo bộ nhớ mới, và luôn hiển thị cổng phê duyệt A/B/C trước khi ghi.

Khi `engram save` tìm thấy các bộ nhớ đang hoạt động có liên quan, bản xem trước phê duyệt sẽ báo cáo chúng kèm theo gợi ý `depends_on` hoặc cảnh báo trùng lặp tiềm ẩn.

## save-session

```bash
engram save-session
engram ss
engram save-session --query-level 3
engram ss -f
engram ss -f last 50 sessions
engram save-session --file transcript.md
engram save-session --force
```

Sử dụng `save-session` khi một tương tác dài tạo ra nhiều ứng viên:

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` là tùy chọn. Chỉ thêm nó khi nó giải thích lý do tại sao bộ nhớ tồn tại. Các ứng viên cũng có thể thêm các trường `DEPENDS_ON`, `LEVEL`, hoặc `UPDATE` khi cấu trúc lại bộ nhớ liên quan.

- `--query-level <n>` — khai thác tối đa n cuộc trò chuyện gần đây giữa người và tác nhân; phải là số nguyên dương; tác nhân không được tự ý bịa ra lịch sử không có sẵn
- `--force` / `-f` — mọi ứng viên được tạo đều được lưu lại vì con người đã phê duyệt rõ ràng cho phím tắt đó
- `--file <path>` — dành cho bản ghi cuộc trò chuyện hoặc bản tóm tắt dài đã có trên đĩa

Đối với `/engram take-control --force` hoặc `/engram take control accept all` tự nhiên, bộ chuyển đổi slash sẽ chuẩn hóa cách diễn đạt, chỉ tạo ra các ứng viên `TYPE: ... | TEXT: ...` ngắn gọn và để Engram lưu chúng mà không cần thông báo phê duyệt lần thứ hai.

## observe

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` lưu trữ các ghi chú thô đã được làm sạch thông tin nhạy cảm vào thư mục `inbox/`. Các ghi chú hộp thư đến không phải là bộ nhớ hoạt động. Sử dụng tính năng này khi bạn muốn lưu giữ các ghi chú sơ bộ trước khi quyết định những gì sẽ trở thành bộ nhớ bền vững.

## Gợi ý bộ nhớ liên quan

Khi một lượt chạy accept-all báo cáo các bộ nhớ liên quan trước khi ghi, không có tệp nào được lưu. Tác nhân nên chạy lại với các ứng viên có cấu trúc:

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## Các bước tiếp theo

- [inject / link / upgrade](inject-link-upgrade.md)
- [Khái niệm: đường dẫn ghi và phê duyệt](../concepts/write-path.md)

