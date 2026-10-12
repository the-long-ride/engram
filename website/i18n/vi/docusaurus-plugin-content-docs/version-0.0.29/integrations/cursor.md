---
title: Cursor
sidebar_position: 5
description: Tích hợp Engram với Cursor thông qua quy tắc, MCP, plugin cục bộ, lệnh slash và hook bắt đầu phiên.
---

# Cursor

Cursor đọc các quy tắc dự án từ các tệp `.cursor/rules/*.mdc`. Engram ghi tệp `.cursor/rules/engram.mdc` với frontmatter hợp lệ (`alwaysApply: true`) và một khối lệnh hướng dẫn khởi động.

## Cài đặt {#install}

```bash
engram link cursor
```

## Các tệp được ghi {#files-written}

| Tệp | Mục đích |
| --- | --- |
| `.cursor/rules/engram.mdc` | Quy tắc dự án với `alwaysApply: true` |
| `.cursor/mcp.json` | Đăng ký MCP (`type: "stdio"`) |
| `.cursor/rules/engram/<id>.mdc` | Một quy tắc được tạo cho mỗi bộ nhớ workspace có `applies_to` (`alwaysApply: false`, các glob nối bằng dấu phẩy); bộ nhớ tầng làm việc không bao giờ được ghi |
| `.cursor/hooks.json` | Hook `sessionStart` |
| `.cursor/commands/engram.md` | Bộ điều hợp slash `/engram` |

## Cài đặt toàn cục {#global-install}

```bash
engram link --global cursor
```

Engram tạo một plugin cục bộ tại `~/.cursor/plugins/local/engram/` chứa manifest của plugin, các quy tắc, skill, lệnh, cấu hình MCP và hook.

## Mục tiêu ưu tiên runtime {#runtime-first-target}

Cursor là một mục tiêu ưu tiên runtime. Quy tắc dự án chứa các hướng dẫn khởi động ngắn gọn dựa vào các công cụ MCP và hook để thực hiện giao thức chi tiết; tài liệu hướng dẫn đi kèm đảm nhận toàn bộ luồng ghi/phê duyệt, và tệp Agent Skill là một con trỏ ngắn trỏ tới nó.

## Hành vi hook {#hook-behavior}

Hook `sessionStart` đưa ngữ cảnh khởi động của Engram vào thông qua trường đầu ra `additional_context`. `beforeSubmitPrompt` chỉ dùng cho việc cho phép/chặn và không được dùng để chèn ngữ cảnh.

## Định dạng xuất {#export-format}

`engram export --format cursor-rules` ghi `.cursor/rules/engram.mdc` với frontmatter `description` và `alwaysApply: false`. Lệnh này thay thế cho `cursorrules`, bí danh này vẫn được chấp nhận trong một bản phát hành và in thông báo cảnh báo lỗi thời trên stderr. `live_sync.targets` sử dụng tên mới.

## Các bước tiếp theo {#next-steps}

- [Tổng quan về tích hợp Agent](overview.md)
- [Hook và dòng kiểm chứng](hooks.md)
