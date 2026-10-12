---
title: Copilot
sidebar_position: 8
description: Tích hợp Engram với GitHub Copilot thông qua hướng dẫn tùy chỉnh của kho lưu trữ và người dùng.
---

# Copilot

GitHub Copilot đọc các hướng dẫn tùy chỉnh của kho lưu trữ từ `.github/copilot-instructions.md`. Đối với các cài đặt Copilot toàn cục, Engram thêm khối được quản lý của mình vào `~/.copilot/copilot-instructions.md`.

## Cài đặt {#install}

```bash
engram link copilot
```

## Các tệp được ghi {#files-written}

| Tệp | Mục đích |
| --- | --- |
| `.github/copilot-instructions.md` | Hướng dẫn tùy chỉnh của kho lưu trữ |

## Cài đặt toàn cục {#global-install}

```bash
engram link --global copilot
```

Thêm một khối được quản lý vào `~/.copilot/copilot-instructions.md`.

## Mục tiêu dự phòng thu gọn/thủ công {#compact-manual-fallback-target}

Copilot là một mục tiêu dự phòng thu gọn/thủ công. Nó nhận toàn bộ giao thức thu gọn. Việc cài đặt hook được bỏ qua trong v1; hãy sử dụng skillset Engram hoặc lệnh thủ công `engram load` để lấy ngữ cảnh.

## Các bước tiếp theo {#next-steps}

- [Tổng quan về tích hợp Agent](overview.md)
- [Hook và dòng kiểm chứng](hooks.md)
