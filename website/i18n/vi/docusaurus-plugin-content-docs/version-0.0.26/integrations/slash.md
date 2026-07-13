---
title: Bộ điều hợp slash
sidebar_position: 10
description: Các bộ điều hợp slash của Engram cung cấp các lệnh /engram trên Claude, Cursor, Gemini và OpenCode.
---

# Bộ điều hợp slash

Mục tiêu `slash` ghi các bộ điều hợp slash `/engram` gốc cho các máy chủ hỗ trợ lệnh slash của dự án hoặc Agent Skills.

## Các tệp được ghi

| Tệp | Máy chủ |
| --- | --- |
| `.claude/commands/engram.md` | Claude Code |
| `.claude/skills/engram/SKILL.md` | Claude Code (dạng skill) |
| `.cursor/commands/engram.md` | Cursor |
| `.gemini/commands/engram.toml` | Gemini CLI |
| `.opencode/commands/engram.md` | OpenCode |

## Các lệnh phổ biến

```text
/engram
/engram propose
/engram load deployment workflow
/engram entry
/engram save knowledge
/engram save-session
/engram save-session --query-level 3
/engram ss
/engram ss -f
/engram ss -f last 50 sessions
/engram take-control
/engram take control accept all
/engram restructure workspace memory accept all
/engram resolve conflicts and metacognize
/engram graph release workflow
/engram archive --reason "Superseded" knowledge/old-fact.md
/engram set-rule-variant strict
/engram verify
```

## Hành vi

Nếu máy chủ chỉ hiển thị một lệnh `/engram` duy nhất, lệnh `/engram` không tham số sẽ trả về một menu thu gọn bao gồm `load`, `search`, `save`, `propose`, `entry` và `help` thay vì chạy CLI. `/engram propose` là bí danh cấp slash: chuẩn hóa nó thành `engram save-session` trên cuộc trò chuyện/phiên hiện tại.

`/engram ss -f` là phím tắt chấp nhận tất cả. Agent không được tự động thêm `--force` trừ khi con người yêu cầu điều đó.

## Chuẩn hóa ngôn ngữ tự nhiên

| Ngôn ngữ tự nhiên | Chuẩn hóa thành |
| --- | --- |
| `/engram auto save` | `engram save-session` |
| `/engram take control accept all` | `engram take-control --force` |
| `/engram restructure workspace memory accept all` | `engram metacognize --workspace --force` |
| `/engram take control accept all metacognize` | `engram take-control --force --metacognize` |
| `/engram resolve conflicts and metacognize` | `engram resolve-conflicts --metacognize` |
| `/engram ss -f last 50 sessions` | `engram save-session --query-level 50 --force` |

## Các bước tiếp theo

- [Công cụ MCP](mcp.md)
- [Hook và dòng kiểm chứng](hooks.md)

