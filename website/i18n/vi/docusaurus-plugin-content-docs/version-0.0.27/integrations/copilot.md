---
title: Copilot
sidebar_position: 8
description: Tích hợp Engram với GitHub Copilot thông qua hướng dẫn tùy chỉnh của kho lưu trữ và người dùng.
---

# Copilot

GitHub Copilot đọc các hướng dẫn tùy chỉnh của kho lưu trữ từ `.github/copilot-instructions.md`. Đối với các cài đặt Copilot toàn cục, Engram thêm khối được quản lý của mình vào `~/.copilot/copilot-instructions.md`.

## Cài đặt

```bash
engram link copilot
```

## Các tệp được ghi

| Tệp | Mục đích |
| --- | --- |
| `.github/copilot-instructions.md` | Hướng dẫn tùy chỉnh của kho lưu trữ |

## Cài đặt toàn cục

```bash
engram link --global copilot
```

Thêm một khối được quản lý vào `~/.copilot/copilot-instructions.md`.

## Mục tiêu dự phòng thu gọn/thủ công

Copilot là một mục tiêu dự phòng thu gọn/thủ công. Nó nhận giao thức thu gọn hoàn chỉnh vì các hook hiện tại để lộ ngữ cảnh bắt đầu phiên nhưng không có cơ chế chèn ngữ cảnh thời điểm prompt đáng tin cậy nào trong v1. Cài đặt hook bị bỏ qua; không có cấu hình hook nào được ghi.

## Các bước tiếp theo

- [Tổng quan về tích hợp Agent](overview.md)
- [Hook và dòng kiểm chứng](hooks.md)
