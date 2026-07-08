---
title: Gemini
sidebar_position: 4
description: Tích hợp Engram với Gemini CLI và các bề mặt tương thích với Gemini của Antigravity.
---

# Gemini

Gemini CLI tìm kiếm các tệp `GEMINI.md` làm ngữ cảnh. Mục tiêu `slash` ghi `.gemini/commands/engram.toml` để `/engram <args>` trở thành một lệnh tùy chỉnh dự án trong Gemini CLI.

Engram cũng xử lý `gemini` như mục tiêu được công bố cho Antigravity 2.0, Antigravity CLI và Antigravity IDE bởi vì các tài liệu hiện tại của Google vẫn gắn ngữ cảnh và skill của Antigravity với các vị trí tương thích với Gemini. Các tên mục tiêu ẩn như `antigravity` và `antigravity-cli` vẫn là các đường dẫn tương thích rõ ràng, nhưng chúng không được hiển thị trong `engram link list`, trợ giúp, hoàn thành lệnh, hoặc `all`.

## Cài đặt

```bash
engram link gemini
```

## Các tệp được ghi

| Tệp | Mục đích |
| --- | --- |
| `GEMINI.md` | Khởi tạo ngữ cảnh dự án |
| `.gemini/commands/engram.toml` | Bộ điều hợp slash `/engram` |
| `.gemini/settings.json` | Các hook `SessionStart` và `BeforeAgent` |
| Gemini MCP config | Đăng ký MCP |

## Cài đặt toàn cục

```bash
engram link --global gemini
```

Ghi `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md`, và tệp cấu hình Gemini MCP.

## Mục tiêu ưu tiên runtime

Gemini là một mục tiêu ưu tiên runtime. `GEMINI.md` chứa hướng dẫn khởi tạo ngắn gọn dựa vào các công cụ MCP và hook để thực hiện giao thức chi tiết; tệp Agent Skill đảm nhận toàn bộ luồng ghi/phê duyệt.

## Hành vi hook

Gemini hỗ trợ khởi động và chèn `hookSpecificOutput.additionalContext` tại thời điểm prompt thông qua các sự kiện `SessionStart` và `BeforeAgent`.

## Khả năng tương thích với Antigravity

Đối với các hook, `gemini` cũng là phương án dự phòng Antigravity công khai. Các mục tiêu hook bị ẩn như `antigravity` và `antigravity-cli` được chuẩn hóa theo hành vi và đường dẫn hook của Gemini cho đến khi Google công bố tài liệu chính thức và ổn định về cấu hình/hook của Antigravity.

## Các bước tiếp theo

- [Tổng quan về tích hợp Agent](overview.md)
- [Hook và dòng kiểm chứng](hooks.md)
