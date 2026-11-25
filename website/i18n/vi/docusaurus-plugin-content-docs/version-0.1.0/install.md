---
title: Cài đặt và cấu hình
sidebar_position: 3
description: Cài đặt Engram CLI, khởi tạo không gian làm việc, cấu hình bộ nhớ toàn cục và liên kết các tác nhân AI.
---

# Cài đặt và cấu hình

## Yêu cầu

- Node.js `>=20`
- Tác nhân AI được hỗ trợ (Codex, Claude, Gemini, Cursor, Windsurf, OpenCode, Copilot, Cline, hoặc bất kỳ host nào tương thích với AGENTS.md)

## Cài đặt CLI

```bash
npm install -g @the-long-ride/engram
```

Xác minh:

```bash
engram --version
```

Hai tệp nhị phân được cài đặt:

- `engram` — CLI chính
- `engram-mcp` — tệp nhị phân máy chủ MCP cho các host đăng ký tiến trình công cụ bên ngoài

## Khởi tạo không gian làm việc (workspace)

Từ thư mục gốc của dự án:

```bash
engram inject
```

Lệnh này tạo `.agents/.engram/` và cài đặt mục tiêu Codex thu gọn theo mặc định: `AGENTS.md` cộng với `.agents/skills/engram/SKILL.md`.

Sử dụng `engram inject --no-skillset` để bỏ qua các tệp tác nhân, hoặc `engram inject --skillset all` để cài đặt mọi adapter được hỗ trợ trong khi inject. Các tệp hiện có do con người viết sẽ được bỏ qua.

## Cấu hình bằng Giao diện Web Entry

Cách thiết lập thân thiện nhất:

```bash
engram entry
```

Lệnh này khởi chạy một bảng điều khiển chỉ chạy cục bộ. Cấu hình các thư mục gốc bộ nhớ, liên kết các tác nhân và điều chỉnh định tuyến mà không cần chỉnh sửa JSON thủ công. Xem [Giao diện Web Entry](entry/index.md) để biết chi tiết về từng tab và trường.

## Cấu hình bộ nhớ toàn cục (global)

Bộ nhớ toàn cục là tùy chọn và nằm ở bất kỳ đâu bạn cấu hình nó. Nó lưu trữ các tùy chọn và ngữ cảnh nhóm để đi theo bạn qua các kho lưu trữ khác nhau.

```bash
engram inject --global-only --global-path ~/Documents/engram
```

Hoặc cập nhật thư mục toàn cục sau đó:

```bash
engram update-global-folder ~/Documents/engram
engram ugf ~/Documents/engram
```

Các dạng câu lệnh chat như `engram set global memory path to <new-path>` và `engram move global folder from <old-path> to <new-path>` được chuẩn hóa về cùng một câu lệnh. Thêm `--move-from-path <old-path>` khi người dùng muốn Engram chuyển toàn bộ thư mục gốc toàn cục cũ sang vị trí mới.

## Liên kết tác nhân AI

Cài đặt hook tác nhân và đăng ký MCP cho một host:

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

`engram link all` cài đặt tập hợp mục tiêu công khai và báo cáo lý do `SKIPPED` mang tính quyết định cho các host chưa hoàn thiện trên các tệp hướng dẫn bộ kỹ năng, cấu hình MCP, bộ chuyển đổi slash và hook tác nhân trong một lần cài đặt thống nhất. `engram unlink` gỡ bỏ tất cả chúng cùng lúc.

Xem [Tích hợp Tác nhân](integrations/overview.md) để biết ma trận mục tiêu đầy đủ.

## Quy trình làm việc với Submodule

Nếu con người muốn `.agents/.engram` được theo dõi như một kho lưu trữ riêng biệt:

```bash
engram inject --submodule
```

Chỉ thêm `--submodule-remote <git-url>` sau khi con người cung cấp URL. Engram xác thực URL, khởi tạo submodule trên nhánh `main`, và tạo commit submodule đầu tiên với nội dung `Initialize engram`.

## Nguồn Git toàn cục dùng chung

Nếu `engram entry` hiển thị không phát hiện được `global_git_detected.remote_url`, hãy hỏi con người xem bộ nhớ toàn cục có nên được chia sẻ qua Git không. Khi họ cung cấp URL:

```bash
engram inject --global-remote <git-url>
```

## Xác minh cài đặt

```bash
engram verify
engram load --dry-run "setup"
engram llm
```

`engram llm` in ra tài liệu hướng dẫn sử dụng tác nhân AI đi kèm và không yêu cầu không gian làm việc đã được inject.

## Các bước tiếp theo

- [Quy trình làm việc hàng ngày](daily-workflow.md)
- [Giao diện Web Entry](entry/index.md)
- [Tích hợp Tác nhân](integrations/overview.md)
