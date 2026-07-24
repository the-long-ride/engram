---
title: Tab Connections (Kết nối)
sidebar_position: 3
description: Phát hiện và liên kết các tác nhân AI (AI agent) được hỗ trợ từ Entry Web UI.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Tab Connections

Tab Connections quét máy của bạn để tìm các bề mặt tác nhân AI được hỗ trợ và cho phép bạn liên kết Engram với từng tác nhân ở cấp độ không gian làm việc (workspace) hoặc toàn cục (global).

## Quét tác nhân (Agent scan)

Tab này hiển thị một thẻ cho mỗi tác nhân được hỗ trợ. Mỗi thẻ báo cáo trạng thái phát hiện được (detected) hoặc bị thiếu (missing).

- **Detected** — Engram đã tìm thấy bề mặt tác nhân cục bộ được hỗ trợ (đường dẫn cấu hình hoặc ứng dụng hiện diện).
- **Missing** — Engram không tìm thấy bề mặt tác nhân. Trạng thái bị thiếu không phải lúc nào cũng có nghĩa là không được hỗ trợ; nó có thể có nghĩa là ứng dụng hoặc đường dẫn cấu hình chưa hiện diện.

<RiskCallout level="caution">
Bị thiếu không có nghĩa là không được hỗ trợ. Nó có thể có nghĩa là ứng dụng hoặc đường dẫn cấu hình chưa có trên máy này.
</RiskCallout>

## Nút bật tắt liên kết không gian làm việc (Workspace link toggle)

Liên kết Engram với kho lưu trữ (repo)/không gian làm việc hiện tại cho tác nhân đó. Sử dụng khi bộ nhớ nên đi theo kho lưu trữ: quy tắc riêng cho từng dự án, bộ nhớ riêng cho kho lưu trữ, hướng dẫn chia sẻ trong nhóm.

## Nút bật tắt liên kết toàn cục (Global link toggle)

Liên kết Engram trên toàn cục cho tác nhân đó. Sử dụng cho bộ nhớ cá nhân, quy trình làm việc trên nhiều dự án, và các kiểu dáng/quy tắc có thể tái sử dụng.

<RiskCallout level="risky">
Sử dụng liên kết toàn cục cẩn thận trên các máy tính dùng chung. Engram viết các khối được quản lý vào các tệp hướng dẫn dùng chung. Hãy xem xét các tệp Engram viết cho từng tác nhân trước khi liên kết toàn cục.
</RiskCallout>

## Các tệp Engram viết cho mỗi tác nhân

| Mục tiêu | Tệp |
| --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` |
| `agents-md` | `AGENTS.md` |
| `copilot` | `.github/copilot-instructions.md`; toàn cục: `~/.copilot/copilot-instructions.md` |
| `claude` | `CLAUDE.md` |
| `cursor` | `.cursor/rules/engram.mdc`; toàn cục: `~/.cursor/plugins/local/engram/` |
| `gemini` | `GEMINI.md`; toàn cục: `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` |
| `cline` | `.clinerules` |
| `windsurf` | `.windsurf/rules/engram.md`; toàn cục: `~/.codeium/windsurf/memories/global_rules.md` |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` |
| `mcp` | `.mcp.json`; toàn cục: các tệp cấu hình MCP của máy chủ |
| `slash` | `.claude/commands/engram.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` |

## Khi nào cần hủy liên kết

- Lưu trữ một kho lưu trữ hoặc không gian làm việc thử nghiệm
- Chuyển một tác nhân rời khỏi Engram
- Dọn dẹp các khối được quản lý cũ trước khi chạy `engram upgrade --latest` mới

`engram unlink` chỉ xóa các mục nhập hook và tệp bộ tiếp hợp (adapter) do Engram quản lý. Các tệp do con người viết được bảo tồn trừ khi có tùy chọn `--force` rõ ràng.

## Tương đương CLI

```bash
engram link codex
engram link claude
engram link --global opencode
engram unlink
```

## Các bước tiếp theo

- [Tab Construct](construct.md)
- [Tổng quan về Tích hợp Tác nhân](../integrations/overview.md)
