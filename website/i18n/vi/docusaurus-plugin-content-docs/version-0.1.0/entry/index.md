---
title: Tổng quan về Entry Web UI
sidebar_position: 1
description: Entry Web UI là bảng điều khiển chỉ dành cho cục bộ để cấu hình bộ nhớ, hồ sơ, không gian làm việc và kết nối tác nhân Engram.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Tổng quan về Entry Web UI

Entry Web UI là bảng điều khiển chỉ dành cho cục bộ cho Engram. Sử dụng nó để cấu hình các gốc bộ nhớ, liên kết các tác nhân AI, tinh chỉnh định tuyến, xem xét các bộ nhớ trùng lặp, kiểm tra đồ thị bộ nhớ và gỡ lỗi cấu hình thời gian chạy mà không cần chỉnh sửa tệp JSON bằng tay.

## Khi nào nên sử dụng

- Thiết lập lần đầu cho một không gian làm việc hoặc gốc bộ nhớ toàn cục
- Liên kết hoặc hủy liên kết các tác nhân AI mà không cần nhớ các tùy chọn CLI
- Tinh chỉnh các cài đặt định tuyến, đồ thị, vector và biến thể quy tắc
- Xem xét các bộ nhớ trùng lặp hoặc xung đột
- Kiểm tra đồ thị bộ nhớ
- Gỡ lỗi cấu hình đã giải quyết, các đường dẫn và phát hiện Git

## Mô hình truy cập cục bộ (Local-only)

Bảng điều khiển chạy trực tiếp trên máy của bạn. Nó không phải là một dịch vụ đám mây. Hãy đóng máy chủ khi bạn làm việc xong để đảm bảo vệ sinh an ninh.

<RiskCallout level="risky">
Bảng điều khiển Entry chỉ khả dụng cục bộ. Hãy coi nó là mở trong khi bạn đang định cấu hình bộ nhớ, sau đó đóng máy chủ từ chân thanh bên khi hoàn thành.
</RiskCallout>

## Mối quan hệ với các lệnh CLI

Mỗi điều khiển hiển thị tương ứng với một lệnh CLI hoặc khóa cấu hình. Khi có cấu hình CLI tương đương, tài liệu tham khảo trường sẽ liệt kê nó. CLI vẫn là nguồn dữ liệu chuẩn cho việc viết kịch bản và tự động hóa.

## Điều hướng và định tuyến URL

Entry Web UI sử dụng định tuyến `#hash` trên URL để mỗi tab có thể được đánh dấu trang, tải lại hoặc điều hướng bằng lịch sử trình duyệt:

- `#config` — Construct
- `#author` — Git
- `#upgrade` — Updates
- `#recall` — Memories
- `#review` — Review
- `#maintain` — Core
- `#connect` — Connections

Thanh bên bao gồm mục **Workspace** cho các điều khiển theo phạm vi workspace và hiển thị huy hiệu đếm số mục chờ rà soát trên **Review** mỗi khi có phát hiện, ứng viên bị hoãn hoặc biên nhận đang chờ phân loại. Trên màn hình hẹp, thanh bên thu gọn thành ngăn kéo di động mà bạn có thể đóng bằng nút đóng hoặc nhấn `Escape`.

## Sơ lược về các tab

| Tab | Hash | Nhiệm vụ |
| --- | --- | --- |
| [Construct](construct.md) | `#config` | Cấu hình các trường thời gian chạy, hồ sơ, không gian làm việc và trạng thái thời gian chạy của Engram |
| [Git](../operations/git-author-settings.md) | `#author` | Quản lý danh tính tác giả và cấu hình Global Git |
| [Updates](../operations/configuration-upgrades.md) | `#upgrade` | Kiểm tra cập nhật gói và áp dụng nâng cấp cấu hình |
| [Memories](memories.md) | `#recall` | Tìm kiếm, mô phỏng định tuyến, kiểm tra, thăng hạng và lưu trữ bộ nhớ đang hoạt động |
| [Review](review.md) | `#review` | Phân loại biên nhận học phiên, phát hiện rà soát và các lần ghi bộ nhớ bị hoãn |
| [Core](core.md) | `#maintain` | Xem xét các bộ nhớ trùng lặp và xung đột |
| [Connections](connections.md) | `#connect` | Kiểm tra sức khỏe Doctor, phát hiện tác nhân và liên kết các tác nhân AI được hỗ trợ |

## Các bước tiếp theo

- [Khởi chạy bảng điều khiển](launch.md)
- [Tab Construct](construct.md)
- [Tab Core](core.md)
- [Tài liệu tham khảo trường đầy đủ](field-reference.md)


## Git author identity

Engram can store a global author and an optional workspace override. Resolution is workspace, global, then read-only Git fallback. Settings affect future memories only; a workspace override never changes global Git configuration. Use explicit plan and confirmation for global Git sync or legacy-memory migration.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Read the complete [Git author settings guide](../operations/git-author-settings.md)
