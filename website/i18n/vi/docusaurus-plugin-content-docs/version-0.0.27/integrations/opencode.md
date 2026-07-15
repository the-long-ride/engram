---
title: OpenCode
sidebar_position: 7
description: Tích hợp Engram với OpenCode thông qua AGENTS.md, Agent Skills, MCP, các lệnh tùy chỉnh và plugin cục bộ.
---

# OpenCode

OpenCode đọc quy tắc từ `AGENTS.md` của dự án và quy tắc toàn cục tại `~/.config/opencode/AGENTS.md`. Engram ghi một khối được quản lý ở đó, ghi hướng dẫn đầy đủ vào `.opencode/engram.md` hoặc `~/.config/opencode/engram.md`, ghi skill đầy đủ vào `.opencode/skills/engram/SKILL.md` hoặc `~/.config/opencode/skills/engram/SKILL.md`, và dành riêng tệp `opencode.json` của dự án (hoặc tệp `opencode.jsonc` hiện có) và tệp toàn cục `~/.config/opencode/opencode.jsonc` để đăng ký MCP.

## Cài đặt

```bash
engram link opencode
```

## Các tệp được ghi

| Tệp | Mục đích |
| --- | --- |
| `AGENTS.md` | Quy tắc dự án với khối được quản lý |
| `.opencode/engram.md` | Hướng dẫn đầy đủ |
| `.opencode/skills/engram/SKILL.md` | Agent Skill |
| `.opencode/commands/engram.md` | Bộ điều hợp slash `/engram` |
| `opencode.json` / `opencode.jsonc` | Đăng ký MCP (`mcp.engram`) |

## Cài đặt toàn cục

```bash
engram link --global opencode
```

Đồng thời cài đặt một plugin JavaScript cục bộ được quản lý tại `~/.config/opencode/plugins/engram.js`. Plugin này sử dụng `chat.message` để định tuyến prompt hiện tại của người dùng và `experimental.chat.system.transform` để chèn bộ nhớ được định tuyến trước mỗi yêu cầu LLM.

:::warning
OpenCode phải được khởi động lại hoặc tải lại sau khi `link`/`unlink` vì các tệp plugin cục bộ được tải lúc khởi động.
:::

## Đăng ký MCP

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

Máy chủ MCP triển khai quy trình bắt tay JSON-RPC tiêu chuẩn (`initialize`, `notifications/initialized`, `tools/list`, và `tools/call`) để OpenCode có thể phát hiện và gọi các công cụ của Engram.

## Hành vi plugin

Plugin sẽ chuyển sang trạng thái bỏ qua lỗi (fails open) và chỉ lưu giữ bộ nhớ định tuyến thô trong tiến trình OpenCode đang chạy. Bộ nhớ đệm hook trên đĩa của Engram vẫn chỉ lưu các mã băm, session ID, host, cwd, và chữ ký định tuyến. Lệnh `engram unlink --global opencode` chỉ xóa plugin do Engram tạo ra; tệp `engram.js` do con người viết sẽ được giữ lại trừ khi chỉ định rõ ràng `--force`.

## Các bước tiếp theo

- [Tổng quan về tích hợp Agent](overview.md)
- [Công cụ MCP](mcp.md)
- [Hook và dòng kiểm chứng](hooks.md)
