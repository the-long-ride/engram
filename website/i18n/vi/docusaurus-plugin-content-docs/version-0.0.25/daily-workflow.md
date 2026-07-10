---
title: Quy trình làm việc hàng ngày
sidebar_position: 4
description: Vòng lặp Engram hàng ngày — tải, làm việc, tìm kiếm, lưu và giữ cho bộ nhớ khỏe mạnh.
---

# Quy trình làm việc hàng ngày

Vòng lặp hàng ngày của Engram được thiết kế đơn giản: tải bộ nhớ khi bắt đầu, tìm kiếm khi cần thêm thông tin, lưu khi có điều gì đó bền vững xuất hiện, và kiểm tra vào cuối phiên.

## Bắt đầu phiên làm việc

```text
/engram load "tác vụ hiện tại"
```

Hoặc từ terminal:

```bash
engram load "<tác vụ>"
```

Tác nhân nên trả lời bằng một dòng số lượng thu gọn như `Engram loaded: 8 memories / 24 total related memories.` trừ khi con người yêu cầu hiển thị ID, quy tắc hoặc kết quả thô.

## Trong khi làm việc

Tìm kiếm khi tác vụ thay đổi hoặc khi bạn nghi ngờ thiếu kiến thức dự án:

```text
/engram search "chủ đề tôi có thể đang thiếu"
```

Xem trước các tệp bộ nhớ nào sẽ được định tuyến mà không in nội dung của chúng:

```bash
engram load --dry-run "<truy vấn>"
```

Trả về mọi kết quả định tuyến khớp hiển thị thay vì giới hạn thu gọn:

```bash
engram load --all "<truy vấn>"
```

## Lưu một sự thật bền vững

```text
/engram save knowledge
```

`engram save` nắm bắt ứng viên bộ nhớ đơn lẻ tốt nhất, tự động cập nhật bộ nhớ phù hợp hoặc tạo bộ nhớ mới, và luôn hiển thị cổng phê duyệt A/B/C trước khi ghi.

## Lưu nhiều bộ nhớ từ một phiên làm việc

```text
/engram save-session
/engram ss
```

Cung cấp các ứng viên theo dạng này:

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` là tùy chọn. Chỉ thêm nó khi nó giải thích lý do tồn tại của bộ nhớ.

## Khai thác các cuộc trò chuyện gần đây

```text
/engram save-session --query-level 3
/engram ss -f last 50 sessions
```

`--query-level` phải là một số nguyên dương. Tác nhân có thể sử dụng tối đa bấy nhiêu phiên chat gần đây giữa người và tác nhân, bao gồm cả phiên hiện tại, và không được tự tạo ra lịch sử không có sẵn.

## Phím tắt chấp nhận tất cả

```text
/engram ss -f
```

`-f` nghĩa là con người phê duyệt rõ ràng mọi ứng viên được đề xuất bởi tác nhân. Tác nhân không được tự ý thêm `--force` trừ khi con người yêu cầu.

Khi một lượt chạy chấp nhận tất cả báo cáo các bộ nhớ liên quan trước khi ghi, không có tệp nào được lưu. Tác nhân nên chạy lại với các ứng viên có cấu trúc:

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## Định tuyến vai trò (Role routing)

Lưu bộ nhớ đặc thù cho vai trò:

```bash
engram save --role frontend ...
engram save-session --role backend ...
```

Điều chỉnh định tuyến vai trò:

```bash
engram set-role frontend
engram set-role backend security
engram set-role
```

Khi `engram set-role ...` hoặc `engram set-rule-variant ...` thành công, CLI sẽ trả về một dòng `Agent action:`. Các bộ chuyển đổi slash và host MCP nhận biết Engram nên chạy lại ngay lập tức `engram load "<tác vụ/yêu cầu hiện tại>"` và coi kết quả đó thay thế cho ngữ cảnh đã tải trước đó của Engram.

## Kết thúc công việc có ý nghĩa

```text
Check Engram health, report invalid memories, and propose anything worth saving from this session.
```

Các lệnh hữu ích:

```bash
engram upgrade
engram verify
engram repair
engram graph "<chủ đề>"
engram quality-check
engram archive --reason "<lý do>" <id-hoặc-tệp>
```

## Các bước tiếp theo

- [Tài liệu tham khảo CLI](cli/overview.md)
- [Khắc phục sự cố vận hành](operations/troubleshooting.md)
- [Giao diện Web Entry](entry/index.md)

