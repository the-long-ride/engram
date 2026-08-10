---
title: Claude
sidebar_position: 3
description: Tích hợp Engram với Claude Code thông qua CLAUDE.md, các lệnh slash, Agent Skills, MCP, và hook.
---

# Claude

Claude Code đọc `CLAUDE.md` để lấy hướng dẫn dự án và hỗ trợ cấu hình công cụ bên ngoài thông qua `.mcp.json`.

## Cài đặt

```bash
engram link claude
```

## Các tệp được ghi

| Tệp | Mục đích |
| --- | --- |
| `CLAUDE.md` | Khởi tạo hướng dẫn dự án |
| `.claude/commands/engram.md` | Lệnh slash `/engram` cổ điển |
| `.claude/skills/engram/SKILL.md` | Agent Skill cho việc gọi lệnh slash |
| `.claude/settings.json` | Các hook `SessionStart` và `UserPromptSubmit` |
| `.mcp.json` | Đăng ký MCP |

Claude nhận cả `.claude/commands/engram.md` và `.claude/skills/engram/SKILL.md` để `/engram` xuất hiện trong các menu lệnh cũ và các phiên Claude Code mới có nhận biết skill.

## Cài đặt toàn cục

```bash
engram link --global claude
```

Engram thêm một khối được quản lý vào `~/.claude/CLAUDE.md` (giữ nguyên văn bản của người dùng) và ghi skill Claude vào `~/.claude/skills/engram/SKILL.md`. MCP toàn cục ghi vào `~/.claude/mcp.json`.

## Mục tiêu ưu tiên runtime

Claude là một mục tiêu ưu tiên runtime. `CLAUDE.md` chứa các hướng dẫn khởi tạo ngắn gọn dựa vào các công cụ MCP và hook để thực hiện giao thức chi tiết; tệp Agent Skill đảm nhận toàn bộ luồng ghi/phê duyệt.

## Hành vi hook

Claude hỗ trợ khởi động và đưa thêm ngữ cảnh tại thời điểm prompt. `SessionStart` tải bộ nhớ được định tuyến lúc khởi động; `UserPromptSubmit` chỉ đưa lại ngữ cảnh khi ngữ cảnh Engram được định tuyến thay đổi.

## Các bước tiếp theo

- [Tổng quan về tích hợp Agent](overview.md)
- [Bộ điều hợp slash](slash.md)
- [Công cụ MCP](mcp.md)
