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
Bảng điều khiển Entry chỉ khả dụng cục bộ. Hãy coi nó là mở trong khi bạn đang định cấu hình bộ nhớ, sau đó đóng máy chủ từ tab Runtime khi hoàn thành.
</RiskCallout>

## Mối quan hệ với các lệnh CLI

Mỗi điều khiển hiển thị tương ứng với một lệnh CLI hoặc khóa cấu hình. Khi có cấu hình CLI tương đương, tài liệu tham khảo trường sẽ liệt kê nó. CLI vẫn là nguồn dữ liệu chuẩn cho việc viết kịch bản và tự động hóa.

## Sơ lược về các tab

| Tab | Nhiệm vụ |
| --- | --- |
| [Connections](connections.md) | Phát hiện và liên kết các tác nhân AI được hỗ trợ |
| [Construct](construct.md) | Cấu hình mọi trường thời gian chạy của Engram |
| [Profiles](profiles.md) | Quản lý các hồ sơ bộ nhớ toàn cục bị cô lập |
| [Workspaces](workspaces.md) | Đăng ký và liên kết các kho lưu trữ dự án |
| [Core](core.md) | Xem xét các bộ nhớ trùng lặp và xung đột |
| [Memories](memories.md) | Kiểm tra đồ thị bộ nhớ và lưu trữ bộ nhớ |
| [Runtime](runtime.md) | Cấu hình và các đường dẫn được giải quyết chỉ đọc |

## Các bước tiếp theo

- [Khởi chạy bảng điều khiển](launch.md)
- [Tab Construct](construct.md)
- [Tài liệu tham khảo trường đầy đủ](field-reference.md)
