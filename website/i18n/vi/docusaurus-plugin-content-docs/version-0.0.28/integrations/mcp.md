---
title: Công cụ MCP
sidebar_position: 11
description: Máy chủ Engram MCP cung cấp các công cụ tải, tìm kiếm và chỉ-đề-xuất cho các máy chủ hỗ trợ MCP.
---

# Công cụ MCP

Engram đi kèm với một tệp nhị phân máy chủ MCP `engram-mcp` cung cấp các công cụ cho các máy chủ hỗ trợ MCP.

## Đăng ký

Theo mặc định, `engram link <target>` cũng cài đặt đăng ký MCP đã biết cho mục tiêu đó.

| Phạm vi | Đường dẫn |
| --- | --- |
| Workspace (hầu hết máy chủ) | `.mcp.json` |
| Workspace của Cursor | `.cursor/mcp.json` |
| Workspace của OpenCode | trường `mcp` trong `opencode.json` / `opencode.jsonc` |
| Global Claude | `~/.claude/mcp.json` |
| Global Gemini / Antigravity | Tệp cấu hình Gemini MCP |
| Global OpenCode | trường `mcp` trong `~/.config/opencode/opencode.jsonc` / `opencode.json` |
| Global Cursor | Được đóng gói trong plugin cục bộ |
| Global Windsurf | `~/.codeium/windsurf/mcp_config.json` |

MCP workspace của Windsurf bị bỏ qua vì tài liệu chính thức chỉ quy định cấu hình MCP ở cấp người dùng.

## Công cụ

Các máy chủ MCP nên xử lý `engram_save` và `engram_autosave` như các công cụ **chỉ-đề-xuất**; chúng vẫn phải định tuyến các lệnh ghi cuối cùng thông qua luồng phê duyệt CLI hiển thị với con người. `engram_load` mặc định là `--full` (chọn bỏ qua thông qua `full: true`).

## Quy tắc phê duyệt tất cả

Các yêu cầu rõ ràng `/engram save-session --force`, bao gồm cả phím tắt `/engram ss -f`, nên sử dụng đường dẫn ghi của CLI vì tính năng tự động lưu của MCP vẫn chỉ là đề xuất. Phím tắt đếm số phiên `/engram ss -f last 50 sessions` nên sử dụng `engram save-session --query-level 50 --force`.

## Khai báo OpenCode MCP

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

Máy chủ MCP triển khai quy trình bắt tay JSON-RPC tiêu chuẩn (`initialize`, `notifications/initialized`, `tools/list`, và `tools/call`).

## Các bước tiếp theo

- [Tổng quan về tích hợp Agent](overview.md)
- [Hook và dòng kiểm chứng](hooks.md)

