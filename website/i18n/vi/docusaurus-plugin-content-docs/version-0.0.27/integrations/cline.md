---
title: Cline
sidebar_position: 9
description: Tích hợp Engram với Cline thông qua các quy tắc workspace.
---

# Cline

Cline đọc các quy tắc workspace từ `.clinerules`.

## Cài đặt

```bash
engram link cline
```

## Các tệp được ghi

| Tệp | Mục đích |
| --- | --- |
| `.clinerules` | Các quy tắc workspace kiểu Cline |

## Mục tiêu dự phòng thu gọn/thủ công

Cline là một mục tiêu dự phòng thu gọn/thủ công. Hỗ trợ hook dựa trên plugin và không phù hợp với trình cài đặt bộ điều hợp ưu tiên tệp của Engram trong v1, vì vậy cài đặt hook bị bỏ qua và không có cấu hình hook nào được ghi.

## Các bước tiếp theo

- [Tổng quan về tích hợp Agent](overview.md)
