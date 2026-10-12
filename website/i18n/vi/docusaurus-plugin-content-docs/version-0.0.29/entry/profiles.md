---
title: Tab Profiles (Hồ sơ)
sidebar_position: 5
description: Quản lý các hồ sơ bộ nhớ toàn cục bị cô lập từ Entry Web UI.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Tab Profiles

Tab Profiles quản lý các hồ sơ bộ nhớ toàn cục được cô lập. Các hồ sơ giúp giữ bộ nhớ của khách hàng, công ty và cá nhân không bị rò rỉ lẫn nhau.

## Tên hồ sơ (Profile name)

Ngữ cảnh bộ nhớ được đặt tên như `personal`, `client-a`, `team-platform`. Sử dụng chữ cái, chữ số, `.`, `_`, `-`; tránh khoảng trắng và các tên nhạy cảm. Tên phải khớp với `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$`.

## Đường dẫn toàn cục (Global path)

Thư mục hệ thống tệp làm nền tảng cho hồ sơ. Ưu tiên các đường dẫn tuyệt đối nằm ngoài các thư mục tạm thời dễ bay hơi; đảm bảo có quyền ghi.

## Kích hoạt (Activate)

Kích hoạt hồ sơ cho độ phân giải mặc định ở cấp người dùng. Việc chuyển đổi từ bộ nhớ cá nhân sang bộ nhớ công việc/khách hàng sẽ ảnh hưởng đến các lần tải và lưu trong tương lai.

<RiskCallout level="caution">
Kích hoạt một hồ sơ sẽ thay đổi bộ nhớ toàn cục nào được sử dụng cho các lần tải và lưu trong tương lai. Hãy xác nhận tên hồ sơ trước khi kích hoạt.
</RiskCallout>

## Xóa (Delete)

Xóa đăng ký hồ sơ. Siêu dữ liệu hồ sơ bị xóa; các tệp bộ nhớ vẫn có thể tồn tại trên đĩa trừ khi hành vi mã thay đổi. Hãy xem lại thư mục trước khi dựa vào việc xóa.

## Tương đương CLI

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

## Các bước tiếp theo

- [Hồ sơ và giải quyết phạm vi](../concepts/profiles.md)
- [Tab Workspaces](workspaces.md)
