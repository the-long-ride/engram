---
title: Gemini
sidebar_position: 4
description: Tích hợp Engram với Gemini CLI và các giao diện tương thích Gemini của Antigravity.
---

# Gemini

Gemini CLI tìm kiếm các tệp `GEMINI.md` để làm ngữ cảnh. Mục tiêu `slash` ghi `.gemini/commands/engram.toml`, giúp `/engram <args>` trở thành lệnh tùy chỉnh dự án trong Gemini CLI.

Engram cũng coi `gemini` là mục tiêu công khai cho Antigravity 2.0, Antigravity CLI và Antigravity IDE, vì tài liệu Google hiện tại vẫn liên kết ngữ cảnh và skill của Antigravity với các vị trí tương thích Gemini. Các tên mục tiêu ẩn `antigravity` và `antigravity-cli` vẫn là các đường dẫn tương thích tường minh, nhưng chúng không xuất hiện trong `engram link list`, trợ giúp, tự động hoàn thành hoặc `all`.

## Cài đặt {#install}

```bash
engram link gemini
```

## Các tệp được ghi {#files-written}

| Tệp | Mục đích |
| --- | --- |
| `GEMINI.md` | Khởi tạo ngữ cảnh dự án |
| `.gemini/commands/engram.toml` | Bộ điều hợp slash `/engram` |
| `.gemini/settings.json` | Các hook `SessionStart`, `BeforeAgent`, `AfterTool` và `PreCompress` |
| `.gemini/settings.json` | Đăng ký MCP (`mcpServers.engram`, được hợp nhất bên cạnh các hook) |

## Cài đặt toàn cục {#global-install}

```bash
engram link --global gemini
```

Ghi `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md`, và hợp nhất `mcpServers.engram` vào `~/.gemini/settings.json`.

## Mục tiêu ưu tiên runtime {#runtime-first-target}

Gemini là một mục tiêu ưu tiên runtime. `GEMINI.md` chứa các hướng dẫn khởi động ngắn gọn dựa vào các công cụ MCP và hook để thực hiện giao thức chi tiết; tài liệu hướng dẫn đi kèm đảm nhận toàn bộ luồng ghi/phê duyệt, và tệp Agent Skill là một con trỏ ngắn trỏ tới nó.

## Hành vi hook {#hook-behavior}

Gemini hỗ trợ đưa thêm `hookSpecificOutput.additionalContext` tại thời điểm khởi động và prompt thông qua các sự kiện `SessionStart` và `BeforeAgent`; `PreCompress` (trước khi CLI tóm tắt lịch sử) đặt lại tập hợp đã gửi. `AfterTool` (matcher `read_file|write_file|replace`, thời gian chờ tính bằng mili giây) đưa vào tối đa 3 bộ nhớ chưa gửi có các glob `applies_to` khớp với tệp mà công cụ chạm tới; ngữ cảnh được nối vào kết quả công cụ, vì vậy nó đến sau bước đọc một bước. Nó dùng chung tập hợp đã gửi với `BeforeAgent` và không bao giờ trả về quyết định. `engram link gemini` hoặc `engram upgrade --latest` thêm sự kiện này vào cài đặt hiện có.

Nếu `mcpServers.engram` trong `.gemini/settings.json` đặt `trust: true`, Gemini sẽ bỏ qua bước xác nhận cho `engram_commit`; `engram doctor` cảnh báo về điều đó (`host.gemini_trust`).

## Tương thích Antigravity {#antigravity-compatibility}

Đối với hook, `gemini` cũng là phương án dự phòng công khai cho Antigravity. Các mục tiêu hook ẩn `antigravity` và `antigravity-cli` sẽ chuẩn hóa theo hành vi và đường dẫn hook của Gemini cho đến khi Google công bố tài liệu chính thức về cấu hình/hook Antigravity ổn định.

## Các bước tiếp theo {#next-steps}

- [Tổng quan về tích hợp Agent](overview.md)
- [Hook và dòng kiểm chứng](hooks.md)
