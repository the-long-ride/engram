---
title: Câu hỏi thường gặp
sidebar_position: 4
description: Các câu hỏi thường gặp về Engram.
---

# Câu hỏi thường gặp (FAQ)

## Engram có phải là một cơ sở dữ liệu vector không?

Không. Tìm kiếm mặc định của Engram là tìm kiếm từ vựng xác định (deterministic lexical search). Lệnh `engram search --semantic` bổ sung độ tương đồng cục bộ xác định, chứ không phải tìm kiếm ngữ nghĩa được hỗ trợ bởi nhúng (embedding-backed semantic search). Các vector đồ thị là các vector từ băm cục bộ, không phải là nhúng ngữ nghĩa. Tùy chọn sqlite-vec cục bộ chỉ là một lớp tăng tốc, không phải là nguồn dữ liệu gốc đáng tin cậy.

## Engram có tự động ghi bộ nhớ không?

Không. Các agent chỉ đề xuất ứng viên; con người sẽ phê duyệt. CLI terminal trực tiếp sử dụng A/B/C. Trò chuyện của AI agent sử dụng `yes`/`audit`/`cancel`. Chỉ các yêu cầu accept-all rõ ràng (`ss -a`) mới lưu mọi ứng viên và các agent không được phép thêm `--accept-all` trừ khi con người yêu cầu điều đó.

## Bộ nhớ được lưu ở đâu?

- Bộ nhớ Workspace: `<project>/.agents/.engram/`
- Bộ nhớ Global: bất cứ nơi nào bạn cấu hình (mặc định trống cho đến khi được định cấu hình)

Bộ nhớ Workspace luôn thắng thế. Bộ nhớ Global đóng vai trò dự phòng cho các tùy chọn có thể tái sử dụng và ngữ cảnh nhóm.

## Những agent nào được hỗ trợ?

Codex, Claude, Gemini (và các bề mặt tương thích với Gemini của Antigravity), Cursor, Windsurf/Cascade, OpenCode, Copilot, Cline, các máy chủ tương thích với tệp AGENTS.md thông thường, các máy chủ hỗ trợ MCP và các máy chủ lệnh slash. Xem thêm tại [Tổng quan về tích hợp Agent](../integrations/overview.md).

## Mã hóa đã được triển khai chưa?

Cấu hình mã hóa đã tồn tại, nhưng lưu trữ mã hóa vẫn chưa được triển khai. Các giới hạn hiện tại cần được ghi chép rõ ràng trong tài liệu.

## Tôi có thể sử dụng Engram mà không có Git không?

Có. Git là tùy chọn nhưng được khuyên dùng để theo dõi lịch sử kiểm tra, tính di động và đánh giá của nhóm.

## Làm cách nào để lưu trữ (archive) bộ nhớ sai?

```bash
engram archive --reason "<lý do>" <id-hoặc-tệp>
```

Tệp sẽ rời khỏi định tuyến hoạt động chỉ sau khi phê duyệt và vẫn được bảo tồn trong thư mục `archive/`. Hãy sử dụng tính năng lưu trữ chứ không xóa để phục vụ khả năng kiểm tra.

## Làm cách nào để di chuyển bộ nhớ global?

```bash
engram update-global-folder <đường-dẫn-mới>
engram ugf <đường-dẫn-mới>
engram di chuyển thư mục global từ <đường-dẫn-cũ> sang <đường-dẫn-mới>
```

Thêm `--move-from-path <đường-dẫn-cũ>` khi người dùng muốn Engram di chuyển toàn bộ gốc global cũ sang vị trí mới.

## Bước tiếp theo

- [Khắc phục sự cố](troubleshooting.md)
- [So sánh và lộ trình phát triển](../comparison/overview.md)
