---
title: Tổng quan về Tích hợp Agent
sidebar_position: 1
description: Engram hỗ trợ các tệp skill, bộ điều hợp slash, công cụ MCP và hook agent trên nhiều máy chủ AI.
---

# Tổng quan về Tích hợp Agent {#agent-integrations-overview}

Engram hỗ trợ hai tầng tích hợp:

- **Tệp Skill** — hướng dẫn được tạo cho các agent đọc ngữ cảnh dự án.
- **Bộ điều hợp Slash** — lời nhắc lệnh `/engram` được tạo cho các agent hỗ trợ lệnh slash dự án hoặc Agent Skills.
- **Công cụ kiểu MCP** — bộ bao bọc JSON-lines cho các agent có thể đăng ký quy trình công cụ bên ngoài.
- **Hook agent** — các hook máy chủ tùy chọn tiêm ngữ cảnh Engram đã định tuyến khi bắt đầu phiên và trong các lượt chuyển đổi tác vụ sau đó.

## Bắt đầu nhanh {#quick-start}

```bash
engram inject
engram link all
```

`engram link all` cài đặt tập mục tiêu công khai và báo cáo lý do `SKIPPED` có tính tất định cho các máy chủ hỗ trợ một phần trên các tệp hướng dẫn skillset, cấu hình MCP, bộ điều hợp slash và hook agent trong một lượt cài đặt hợp nhất.

## Phân loại mục tiêu {#target-categories}

| Danh mục | Mục tiêu | Hành vi |
| --- | --- | --- |
| Ưu tiên runtime | `codex`, `claude`, `cursor`, `gemini` | Hướng dẫn khởi động ngắn gọn, hướng dẫn đồng hành với quy trình làm việc đầy đủ, con trỏ Agent Skill ngắn gọn và cấu hình MCP |
| Hỗ trợ hook | `codex`, `claude`, `gemini`, `opencode`, `cursor`, `windsurf`/`cascade` | Các hook agent với schema sự kiện đặc thù cho từng máy chủ |
| Dự phòng thu gọn/thủ công | `agents-md`, `copilot`, `cline` | Giao thức thu gọn đầy đủ; không có tiêm ngữ cảnh runtime đáng tin cậy trong v1 |

## Các mục tiêu được hỗ trợ {#supported-targets}

| Mục tiêu | Tệp | Công dụng chính |
| --- | --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` | Hướng dẫn dự án OpenAI Codex và Agent Skill |
| `agents-md` | `AGENTS.md` | Dự phòng chung cho các agent tương thích AGENTS.md chưa được liệt kê |
| `copilot` | `.github/copilot-instructions.md`; toàn cục: `~/.copilot/copilot-instructions.md` | Hướng dẫn kho lưu trữ và người dùng của GitHub Copilot |
| `claude` | `AGENTS.md`, `.claude/engram.md`, `.agents/engram.md`, kèm một khối `CLAUDE.md` chỉ khi tệp đó đã tồn tại, và các quy tắc đường dẫn `.claude/rules/engram/<id>.md` | Hướng dẫn dự án Claude Code và quy tắc đường dẫn gốc |
| `cursor` | `.cursor/rules/engram.mdc`, quy tắc đường dẫn `.cursor/rules/engram/<id>.mdc`; toàn cục: `~/.cursor/plugins/local/engram/` | Quy tắc dự án Cursor, quy tắc đường dẫn gốc và plugin cục bộ |
| `gemini` | `GEMINI.md`; toàn cục: `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` | Ngữ cảnh Gemini CLI, bao gồm các bề mặt tương thích Gemini trong Antigravity |
| `cline` | `.clinerules` | Quy tắc không gian làm việc kiểu Cline |
| `windsurf` | `.windsurf/rules/engram.md`; toàn cục: `~/.codeium/windsurf/memories/global_rules.md` | Quy tắc không gian làm việc Windsurf và quy tắc/MCP toàn cục |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` | Quy tắc OpenCode, Agent Skill, công cụ MCP, lệnh tùy chỉnh, hook plugin |
| `mcp` | `.mcp.json`; toàn cục: `~/.gemini/settings.json`, `~/.codex/config.toml`, và gợi ý `claude mcp add` | Đăng ký bộ bao bọc JSON-lines kiểu MCP |
| `slash` | `.claude/commands/engram.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` | Bộ điều hợp slash `/engram` gốc |

Bí danh: `codex` cài đặt bộ điều hợp `agents-md` cùng tệp Agent Skill chung, `open-code` ánh xạ tới `opencode`, và `cascade` ánh xạ tới `windsurf`. Các mục tiêu cũ `antigravity` và `antigravity-cli` hiện là các bí danh tương thích ẩn.

## Ma trận khả năng của hook {#hook-capability-matrix}

| Máy chủ | Cài đặt hook trong v1 | Sự kiện |
| --- | --- | --- |
| `codex` | Có | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PreCompact`, `SubagentStart` (tùy chọn `SessionEnd`) |
| `claude` | Có | `SessionStart`, `UserPromptSubmit`, `InstructionsLoaded` (`PreToolUse` với `hooks.path_rules hook`), `PreCompact`, `SubagentStart` (tùy chọn `SessionEnd`) |
| `gemini` | Có | `SessionStart`, `BeforeAgent`, `AfterTool`, `PreCompress` |
| `cursor` | Có | `sessionStart` |
| `windsurf` / `cascade` | Có | `pre_user_prompt` |
| `opencode` | Được hỗ trợ qua plugin cục bộ | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | Bỏ qua | N/A |
| `cline` | Bỏ qua | N/A |

## Các bước tiếp theo {#next-steps}

- [Codex](codex.md)
- [Claude](claude.md)
- [Gemini](gemini.md)
- [Cursor](cursor.md)
- [Windsurf / Cascade](windsurf.md)
- [OpenCode](opencode.md)
- [Copilot](copilot.md)
- [Cline](cline.md)
- [Bộ điều hợp slash](slash.md)
- [Công cụ MCP](mcp.md)
- [Hook và dòng bằng chứng](hooks.md)
