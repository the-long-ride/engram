---
title: Cấu hình tác giả Git
sidebar_position: 2
description: Cấu hình danh tính được ghi vào các bộ nhớ Engram tương lai và commit Git.
---

# Cấu hình tác giả Git

Engram sở hữu hồ sơ tác giả để quyền tác giả bộ nhớ rõ ràng và di động.

<!-- future-memories-only -->
Cấu hình tác giả **chỉ ảnh hưởng đến các bộ nhớ tương lai**.

<a id="global-author"></a>
## Tác giả toàn cục

Thiết lập danh tính Engram mặc định cho mọi không gian làm việc:

```bash
engram author set --name "Jane Doe" --email "jane@example.com"
engram author show
engram author --help
engram author set --help
```

Các tệp mới sử dụng các trường riêng biệt `author_name` và `author_email`.

<a id="workspace-override"></a>
## Ghi đè không gian làm việc

Một không gian làm việc có thể ghi đè hồ sơ Engram toàn cục:

```bash
engram author set --scope workspace --name "Workspace Jane" --email "jane@work.com"
engram author show --scope workspace
```

<!-- workspace-never-syncs-global-git -->
Ghi đè không gian làm việc không bao giờ đồng bộ cấu hình Git toàn cục.

<a id="resolution-order"></a>
## Thứ tự phân giải

```bash
engram author show
engram author show --json
engram author show --help
```

Engram phân giải danh tính theo thứ tự:
1. Tác giả Engram của không gian làm việc.
2. Tác giả Engram toàn cục.
3. Dự phòng Git chỉ đọc.
4. Chưa phân giải.

Trong Entry, nguồn được hiển thị bằng các huy hiệu `WORKSPACE`, `GLOBAL`, `GIT` hoặc `UNRESOLVED`.

<a id="remove-an-author-profile"></a>
## Xóa hồ sơ tác giả

```bash
engram author unset --scope workspace
engram author unset --scope global
engram author unset --help
```

Sử dụng `engram author unset --scope workspace` hoặc `--scope global`.

<a id="global-git-configuration"></a>
## Cấu hình Git toàn cục

Entry hiển thị cài đặt Git trong thẻ Toàn cục tại **Cài đặt → Git**.

<a id="sync-to-global-git"></a>
## Đồng bộ sang Git toàn cục

```bash
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author sync-git-global --help
```

Chỉ hồ sơ toàn cục mới có thể sao chép. Xem trước trước, sau đó dùng `--confirm` để thực thi.

<a id="migrate-existing-memories"></a>
## Di chuyển các bộ nhớ hiện có

```bash
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Điền `author_name` và `author_email` bằng `engram author migrate-memories --plan` và `--confirm`.
