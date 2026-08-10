---
title: Codex
sidebar_position: 2
description: Tích hợp Engram với OpenAI Codex thông qua AGENTS.md và Agent Skills.
---

# Codex

OpenAI Codex và các agent khác tương thích với AGENTS.md sử dụng `AGENTS.md` làm tệp hướng dẫn dự án. Bí danh `codex` cũng ghi vào `.agents/skills/engram/SKILL.md` để các agent khi phát hiện Agent Skills có thể định tuyến Engram như một skill có thể gọi được.

## Cài đặt

```bash
engram link codex
```

## Các tệp được ghi

| Tệp | Mục đích |
| --- | --- |
| `AGENTS.md` | Khởi tạo hướng dẫn dự án |
| `.agents/skills/engram/SKILL.md` | Agent Skill với luồng ghi/phê duyệt đầy đủ |
| `.codex/hooks.json` | Các hook `SessionStart` và `UserPromptSubmit` |
| `.mcp.json` | Đăng ký MCP |

## Cài đặt toàn cục

```bash
engram link --global codex
```

Ghi skill Codex vào `~/.codex/skills/engram/SKILL.md` và thêm một khối được quản lý vào các tệp hướng dẫn Codex dùng chung.

## Hành vi hook

Codex hỗ trợ khởi động và đưa thêm ngữ cảnh tại thời điểm prompt. `SessionStart` tải bộ nhớ được định tuyến lúc khởi động; `UserPromptSubmit` chỉ đưa lại ngữ cảnh khi ngữ cảnh Engram được định tuyến thay đổi.

## Mục tiêu ưu tiên runtime

Codex là một mục tiêu ưu tiên runtime. `AGENTS.md` chứa các hướng dẫn khởi tạo ngắn gọn dựa vào các công cụ MCP và hook để thực hiện giao thức chi tiết; tệp Agent Skill đảm nhận toàn bộ luồng ghi/phê duyệt.

## Các bước tiếp theo

- [Tổng quan về tích hợp Agent](overview.md)
- [Hook và dòng kiểm chứng](hooks.md)
