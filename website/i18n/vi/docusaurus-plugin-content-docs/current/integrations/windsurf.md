---
title: Windsurf / Cascade
sidebar_position: 6
description: Tích hợp Engram với Windsurf Cascade thông qua quy tắc, MCP, hook và bộ nhớ toàn cục.
---

# Windsurf / Cascade

Windsurf đọc quy tắc workspace từ `.windsurf/rules/*.md`. Engram ghi tệp `.windsurf/rules/engram.md` với frontmatter `trigger: always_on`. `cascade` là một bí danh cho `windsurf`.

## Cài đặt

```bash
engram link windsurf
```

MCP workspace không được tạo vì các tài liệu chính thức chỉ quy định cấu hình MCP ở cấp người dùng. Lệnh `engram link windsurf` thông báo rõ điều này và gợi ý chạy `engram link --global windsurf` để cấu hình MCP.

## Các tệp được ghi

| Tệp | Mục đích |
| --- | --- |
| `.windsurf/rules/engram.md` | Quy tắc dự án với `trigger: always_on` |
| `.windsurf/hooks.json` | Hook `pre_user_prompt` |

## Cài đặt toàn cục

```bash
engram link --global windsurf
```

Engram ghi một khối được quản lý vào `~/.codeium/windsurf/memories/global_rules.md` (giữ nguyên văn bản người dùng và ở mức dưới giới hạn ký tự), hợp nhất cấu hình MCP vào `~/.codeium/windsurf/mcp_config.json`, và hợp nhất cấu hình hook vào `~/.codeium/windsurf/hooks.json`.

## Hành vi hook

Hook `pre_user_prompt` có thể kiểm tra/tải trước/chặn nhưng không thể trực tiếp chèn ngữ cảnh cho mô hình. Các quy tắc và MCP cung cấp các kênh ngữ cảnh AI đáng tin cậy.

## Các bước tiếp theo

- [Tổng quan về tích hợp Agent](overview.md)
- [Hook và dòng kiểm chứng](hooks.md)
