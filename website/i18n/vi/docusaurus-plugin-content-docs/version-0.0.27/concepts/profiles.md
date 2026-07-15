---
title: Hồ sơ và phân giải phạm vi
sidebar_position: 4
description: Hồ sơ cô lập các gốc bộ nhớ toàn cục cho các ngữ cảnh công ty, nhóm và cá nhân.
---

# Hồ sơ và phân giải phạm vi

Hồ sơ (Profiles) cô lập các gốc bộ nhớ toàn cục (global memory roots) cho các ngữ cảnh công ty, nhóm và cá nhân. Chúng giúp bộ nhớ của khách hàng, công ty và cá nhân không bị rò rỉ qua các ranh giới.

## Tạo và chuyển đổi hồ sơ

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

## Thứ tự phân giải

Thứ tự phân giải hồ sơ là:

1. Chỉ định rõ ràng bằng `--profile` hoặc biến môi trường `ENGRAM_PROFILE`
2. Hồ sơ mặc định của workspace `default_profile`
3. Hồ sơ đang hoạt động của người dùng (active user profile)

Nếu workspace `W` được ghim vào hồ sơ `B` trong khi mặc định của người dùng vẫn là hồ sơ `A`, mọi lượt tải bình thường, tải qua MCP và lượt chèn hook-agent cho `W` sẽ đọc bộ nhớ toàn cục của hồ sơ `B` và không bao giờ đọc hồ sơ `A`. Việc chỉ định rõ ràng một hồ sơ khác với hồ sơ mặc định của workspace sẽ sử dụng bộ nhớ toàn cục của hồ sơ đó và vô hiệu hóa bộ nhớ workspace đối với lệnh đó.

## Khi nào nên sử dụng hồ sơ

- Bộ nhớ cá nhân không bao giờ được đưa vào repo của khách hàng
- Bộ nhớ công ty không bao giờ được đưa vào repo cá nhân
- Bộ nhớ cô lập của khách hàng dành cho các tư vấn viên làm việc qua nhiều dự án khác nhau
- Bộ nhớ chia sẻ trong nhóm không nên ảnh hưởng đến các thử nghiệm cá nhân

## Cơ chế dự phòng cơ sở dữ liệu SQLite config

Cơ sở dữ liệu cấu hình SQLite của Engram là một tối ưu hóa cho việc quản lý workspace/profile. Nếu cơ sở dữ liệu không thể mở hoặc khởi tạo, các lệnh đọc/ghi bình thường sẽ tự động chuyển sang sử dụng các ảnh chụp nhanh cấu hình JSON (JSON config snapshots). Các lệnh đặc thù của cơ sở dữ liệu sẽ báo cáo SQLite không khả dụng thay vị chặn việc sử dụng bộ nhớ thông thường.

## Bước tiếp theo

- [Bộ nhớ Workspace so với bộ nhớ Global](scopes.md)
- [Đường dẫn ghi và phê duyệt](write-path.md)
