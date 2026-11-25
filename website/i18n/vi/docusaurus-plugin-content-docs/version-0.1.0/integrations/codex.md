---
title: Codex
sidebar_position: 2
description: Tích hợp Engram với OpenAI Codex thông qua AGENTS.md và Agent Skills.
---

# Codex

OpenAI Codex và các agent khác tương thích với AGENTS.md sử dụng `AGENTS.md` làm tệp hướng dẫn dự án. Bí danh `codex` cũng ghi vào `.agents/skills/engram/SKILL.md` để các agent khi phát hiện Agent Skills có thể định tuyến Engram như một skill có thể gọi được.

## Cài đặt {#install}

```bash
engram link codex
```

## Các tệp được ghi {#files-written}

| Tệp | Mục đích |
| --- | --- |
| `AGENTS.md` | Khởi tạo hướng dẫn dự án |
| `.agents/skills/engram/SKILL.md` | Con trỏ Agent Skill ngắn gọn trỏ tới tài liệu hướng dẫn |
| `.agents/engram.md` | Tài liệu hướng dẫn đi kèm với luồng ghi/phê duyệt đầy đủ |
| `.codex/hooks.json` | Các hook `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PreCompact` và `SubagentStart` |
| `.mcp.json` | Đăng ký MCP |

## Cài đặt toàn cục {#global-install}

```bash
engram link --global codex
```

Ghi skill Codex vào `~/.codex/skills/engram/SKILL.md` và thêm một khối được quản lý vào các tệp hướng dẫn Codex dùng chung. MCP toàn cục là khối được quản lý `[mcp_servers.engram]` trong `~/.codex/config.toml`; nó cũng đặt `approval_mode = "approve"` trên `[mcp_servers.engram.tools.engram_commit]` để Codex hỏi bạn trước mỗi lần commit (`engram upgrade` hoặc `engram link codex` sẽ làm mới các khối cũ). `engram doctor` báo cáo kích thước chuỗi AGENTS.md của bạn so với giới hạn 32 KiB của Codex (`host.agents_md_chain`).

## Hành vi hook {#hook-behavior}

Codex hỗ trợ đưa thêm ngữ cảnh lúc khởi động và thời điểm prompt. `SessionStart` tải bộ nhớ được định tuyến lúc khởi động; `UserPromptSubmit` chỉ đưa các phần thân bộ nhớ chưa được phân phối trong phiên. `PreToolUse` đưa vào các bộ nhớ có glob `applies_to` khớp với các tệp được chỉnh sửa qua `apply_patch` (nó không kích hoạt khi đọc), và `PreCompact` đặt lại tập hợp đã phân phối. `SubagentStart` (matcher `*`) đưa ngữ cảnh được định tuyến vào từng subagent; tập hợp đã phân phối của subagent được đặt khóa `<session_id>#agent:<agent_id>`, nên nó không bao giờ chạm vào của tiến trình cha. Codex giới hạn một thông báo hook ở khoảng 2.500 token, do đó Engram giữ `additionalContext` ở mức hoặc dưới 2.400 token và hạ cấp phần thân thành thẻ thay vì cắt bớt chúng.

## Mục tiêu ưu tiên runtime {#runtime-first-target}

Codex là một mục tiêu ưu tiên runtime. `AGENTS.md` chứa các hướng dẫn khởi động ngắn gọn dựa vào các công cụ MCP và hook để thực hiện giao thức chi tiết; tài liệu hướng dẫn đi kèm đảm nhận toàn bộ luồng ghi/phê duyệt, và tệp Agent Skill là một con trỏ ngắn trỏ tới nó.

## Các bước tiếp theo {#next-steps}

- [Tổng quan về tích hợp Agent](overview.md)
- [Hook và dòng kiểm chứng](hooks.md)
