---
title: Hook và dòng kiểm chứng
sidebar_position: 12
description: Các hook agent của Engram chèn bộ nhớ được định tuyến tại thời điểm bắt đầu phiên và các lượt prompt. Các dòng kiểm chứng giúp việc chèn hiển thị rõ ràng.
---

# Hook và dòng kiểm chứng

Các hook của agent là các hook máy chủ tùy chọn giúp chèn ngữ cảnh Engram được định tuyến lúc khởi động phiên và các lượt thay đổi tác vụ sau đó khi máy chủ cung cấp kênh ngữ cảnh thời điểm prompt an toàn.

## Cài đặt hook

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

Sử dụng `--global` cho cấu hình cấp người dùng và `engram unlink` để chỉ xóa các mục nhập hook do Engram quản lý.

## Chế độ đọc

`engram set-read startup|auto|always|manual|off` kiểm soát hành vi runtime:

- `auto` tải khi bắt đầu phiên và chỉ đưa lại ngữ cảnh khi ngữ cảnh Engram được định tuyến thay đổi.
- `startup` chỉ tải khi bắt đầu phiên.
- `always` đưa lại ngữ cảnh trong mọi lượt hợp lệ.
- `manual` và `off` giảm bớt tính tự động.

Bộ nhớ đệm hook lưu trữ mã băm, session id, host, cwd, và chữ ký được định tuyến — không bao giờ lưu văn bản prompt thô.

## Chế độ kiểm chứng

`engram set-proof off|compact` kiểm soát việc các hook được hỗ trợ có nối thêm dòng kiểm chứng thu gọn `Engram proof:` trên mỗi lượt đủ điều kiện hay không. Khả năng hiển thị kiểm chứng độc lập với `set-read`: chế độ `compact` can báo cáo các lượt được tải, dùng lại hoặc bị bỏ qua mà không làm thay đổi thời điểm bộ nhớ Engram đầy đủ được chèn vào.

## Bảng tính năng hook

| Máy chủ | Đường dẫn cấu hình | Sự kiện |
| --- | --- | --- |
| `codex` | `.codex/hooks.json`; global `~/.codex/hooks.json` | `SessionStart`, `UserPromptSubmit` |
| `claude` | `.claude/settings.json`; global `~/.claude/settings.json` | `SessionStart`, `UserPromptSubmit` |
| `gemini` | `.gemini/settings.json`; global `~/.gemini/settings.json` | `SessionStart`, `BeforeAgent` |
| `cursor` | `.cursor/hooks.json`; plugin toàn cục `hooks/hooks.json` | `sessionStart` |
| `windsurf` / `cascade` | `.windsurf/hooks.json`; global `~/.codeium/windsurf/hooks.json` | `pre_user_prompt` |
| `opencode` | `~/.config/opencode/plugins/engram.js` | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | Không ghi | N/A |
| `cline` | Không ghi | N/A |

## Các bước tiếp theo

- [Tổng quan về tích hợp Agent](overview.md)
- [CLI: inject / link / nâng cấp](../cli/inject-link-upgrade.md)
