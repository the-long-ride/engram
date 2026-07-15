---
title: sync / clone-memory / archive
sidebar_position: 7
description: Các lệnh sync, clone và archive để di chuyển bộ nhớ giữa các phạm vi.
---

# sync / clone-memory / archive

Di chuyển bộ nhớ giữa các phạm vi và loại bỏ bộ nhớ sai lệch một cách an toàn.

## clone-memory

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
engram clone-memory workspace global --metacognize
```

Sao chép Markdown hoạt động của `rules/`, `skills/` và `knowledge/` giữa các phạm vi không gian làm việc (workspace) và toàn cục (global). Thêm `--metacognize` khi bạn muốn các bộ nhớ được sao chép được đề xuất thông qua quy trình phê duyệt của save-session thay vì được sao chép nguyên văn.

Tác nhân có thể chuẩn hóa các yêu cầu sao chép tự nhiên thành `engram clone-memory`, ví dụ "clone workspace memory to global" -> `engram clone-memory workspace global`. Đảo ngược các phạm vi để sao chép bộ nhớ toàn cục vào một không gian làm việc; chỉ sử dụng `--force` khi con người yêu cầu ghi đè lên các bản sao đích một cách rõ ràng.

## archive

```bash
engram archive --reason "<why>" <id-or-file>
```

Lưu trữ bộ nhớ sai hoặc đã bị thay thế. Tệp sẽ rời khỏi định tuyến hoạt động chỉ sau khi phê duyệt và vẫn được bảo tồn dưới thư mục `archive/`. Sử dụng archive, không sử dụng delete, để phục vụ mục đích kiểm toán.

## observe (inbox)

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` lưu trữ các ghi chú thô đã được làm sạch thông tin nhạy cảm vào thư mục `inbox/`. Ghi chú inbox không phải là bộ nhớ hoạt động.

## Đồng bộ Git toàn cục (Global Git sync)

Đồng bộ Git toàn cục được điều khiển bởi các trường cấu hình `global_git.*`. Xem [Giao diện Web Entry: Tab Construct](../entry/construct.md) để biết chi tiết từng trường. Sử dụng tab Runtime trong `engram entry` để kiểm tra phát hiện Git đã giải quyết.

## Các bước tiếp theo

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [Vận hành: quy trình Git của nhóm](../operations/team-git-workflow.md)
