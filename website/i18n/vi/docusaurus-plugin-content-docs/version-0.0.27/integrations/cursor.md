---
title: Cursor
sidebar_position: 5
description: Tích hợp Engram với Cursor thông qua quy tắc, MCP, plugin cục bộ, lệnh slash, và hook bắt đầu phiên.
---

# Cursor

Cursor đọc các quy tắc dự án từ các tệp `.cursor/rules/*.mdc`. Engram ghi tệp `.cursor/rules/engram.mdc` với frontmatter hợp lệ (`alwaysApply: true`) và một khối hướng dẫn khởi động.

## Cài đặt

```bash
engram link cursor
```

## Các tệp được ghi

| Tệp | Mục đích |
| --- | --- |
| `.cursor/rules/engram.mdc` | Quy tắc dự án với `alwaysApply: true` |
| `.cursor/mcp.json` | Đăng ký MCP (`type: "stdio"`) |
| `.cursor/hooks.json` | Hook `sessionStart` |
| `.cursor/commands/engram.md` | Bộ điều hợp slash `/engram` |

## Cài đặt toàn cục

```bash
engram link --global cursor
```

Engram tạo một plugin cục bộ tại `~/.cursor/plugins/local/engram/` chứa plugin manifest, các quy tắc, skill, lệnh, cấu hình MCP, và các hook.

## Mục tiêu ưu tiên runtime

Cursor là một mục tiêu ưu tiên runtime. Các quy tắc dự án chứa hướng dẫn khởi tạo ngắn gọn dựa vào các công cụ MCP và hook để thực hiện giao thức chi tiết; tệp Agent Skill đảm nhận toàn bộ luồng ghi/phê duyệt.

## Hành vi hook

Hook `sessionStart` chèn ngữ cảnh khởi động của Engram thông qua trường đầu ra `additional_context`. Hook `beforeSubmitPrompt` chỉ có quyền cho phép/chặn và không được dùng để chèn ngữ cảnh.

## Các bước tiếp theo

- [Tổng quan về tích hợp Agent](overview.md)
- [Hook và dòng kiểm chứng](hooks.md)
