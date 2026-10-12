---
title: Claude
sidebar_position: 3
description: Tích hợp Engram với Claude Code thông qua CLAUDE.md, các lệnh slash, Agent Skills, MCP, và hook.
---

# Claude

Claude Code đọc `CLAUDE.md` để lấy hướng dẫn dự án (và `AGENTS.md` của dự án chỉ khi không có `CLAUDE.md`) và hỗ trợ cấu hình công cụ bên ngoài thông qua `.mcp.json`. Khởi động của Engram ưu tiên AGENTS.md trước.

## Cài đặt {#install}

```bash
engram link claude
```

## Các tệp được ghi {#files-written}

| Tệp | Mục đích |
| --- | --- |
| `AGENTS.md` | Khởi tạo hướng dẫn dự án (khối được quản lý, dùng chung với Codex và OpenCode) |
| `CLAUDE.md` hoặc `.claude/CLAUDE.md` | Một khối khởi tạo, chỉ khi tệp đó đã tồn tại và không import `@AGENTS.md`; không bao giờ được tạo mới |
| `.claude/engram.md`, `.agents/engram.md` | Hướng dẫn đi kèm với toàn bộ luồng ghi/phê duyệt |
| `.claude/rules/engram/<id>.md` | Một quy tắc đường dẫn được tạo cho mỗi bộ nhớ workspace có `applies_to` (`hooks.path_rules native`) |
| `.claude/commands/engram.md` | Lệnh slash cổ điển `/engram` |
| `.claude/skills/engram/SKILL.md` | Agent Skill để gọi lệnh slash |
| `.claude/settings.json` | Các hook `SessionStart`, `UserPromptSubmit`, `InstructionsLoaded`, `PreCompact` và `SubagentStart` |
| `.mcp.json` | Đăng ký MCP |

Claude nhận cả `.claude/commands/engram.md` và `.claude/skills/engram/SKILL.md` để `/engram` xuất hiện trong các menu lệnh cũ và các phiên Claude Code mới có nhận biết skill.

## Cài đặt toàn cục {#global-install}

```bash
engram link --global claude
```

Engram thêm một khối được quản lý vào `~/.claude/CLAUDE.md` (giữ nguyên văn bản của người dùng) và ghi skill Claude vào `~/.claude/skills/engram/SKILL.md`. Claude Code không đọc `~/.claude/mcp.json`, do đó MCP toàn cục là một gợi ý: Engram in lệnh `claude mcp add --scope user engram -- engram-mcp` để bạn tự chạy.

## Mục tiêu ưu tiên runtime {#runtime-first-target}

Claude là một mục tiêu ưu tiên runtime. Khối `AGENTS.md` (và khối `CLAUDE.md` khi tệp đó tồn tại) chứa các hướng dẫn khởi động ngắn gọn dựa vào công cụ MCP và hook để thực hiện giao thức chi tiết; hướng dẫn đi kèm đảm nhận toàn bộ luồng ghi/phê duyệt, và tệp Agent Skill là con trỏ ngắn trỏ tới nó. Khối `CLAUDE.md` hiện có được làm mới và không bao giờ bị xóa, và `engram link` báo cáo `CLAUDE.local.md` hoặc tệp `CLAUDE.md` ở thư mục cha che mất `AGENTS.md` đối với Claude. Skill được tạo tuân thủ đặc tả Agent Skills và thêm `when_to_use` cùng `user-invocable: true`; `engram doctor` xác thực nó (`host.skill_frontmatter`). Cài đặt toàn cục vẫn ghi vào `~/.claude/CLAUDE.md`, vì Claude không đọc `AGENTS.md` cấp người dùng.

## Hành vi hook {#hook-behavior}

Claude hỗ trợ đưa thêm ngữ cảnh lúc khởi động và thời điểm prompt. `SessionStart` tải bộ nhớ được định tuyến lúc khởi động; `UserPromptSubmit` chỉ đưa các phần thân bộ nhớ chưa được phân phối trong phiên. `PreCompact` đặt lại tập hợp đã phân phối. `SubagentStart` (matcher `*`) đưa ngữ cảnh được định tuyến vào từng subagent theo tập hợp phân phối riêng của nó, và đầu ra của hook giữ ở mức dưới 9.500 ký tự. Các bộ nhớ có glob `applies_to` đến với Claude dưới dạng các quy tắc đường dẫn native: `engram link claude` ghi `.claude/rules/engram/<id>.md` (frontmatter chỉ chứa đường dẫn cộng với dấu hiệu `<!-- engram:<scope>:<file> sha:<8> -->`), và hook `InstructionsLoaded` (matcher `path_glob_match`) ghi lại từng lần tải vào tập hợp đã phân phối và `usage.json`. Các bộ nhớ tầng làm việc không bao giờ được ghi, bộ nhớ global chuyển đến `~/.claude/rules/engram/` khi chạy `engram link --global claude`, và các tệp không có dấu hiệu trên được giữ nguyên. Glob dấu ngoặc nhọn cần Claude Code v2.1.217 trở lên. Để giữ lại phương thức đưa ngữ cảnh `PreToolUse` cũ, hãy chạy `engram config set hooks.path_rules hook` và `engram link claude`; thao tác này cũng xóa các tệp quy tắc đã tạo.

## Phê duyệt MCP {#mcp-approval}

`engram_commit` mang `_meta["anthropic/requiresUserInteraction"]: true`, vì vậy Claude Code hỏi bạn trước mỗi lệnh gọi, ngay cả trong các chế độ bypass. Hãy giữ nguyên như vậy: `approval_token` chỉ chứng minh rằng một đề xuất đang tồn tại. Xem [công cụ MCP](mcp.md).

## Các bước tiếp theo {#next-steps}

- [Tổng quan về tích hợp Agent](overview.md)
- [Bộ điều hợp slash](slash.md)
- [Công cụ MCP](mcp.md)
