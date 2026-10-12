---
title: Tab Runtime (Thời gian chạy)
sidebar_position: 9
description: Cấu hình và đường dẫn được phân giải chỉ đọc, cùng với hành động đóng máy chủ.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Tab Runtime

Tab Runtime là báo cáo cấu hình và đường dẫn được phân giải chỉ đọc. Hãy coi đây là trang khắc phục sự cố đầu tiên.

## Các nhóm báo cáo thời gian chạy

Báo cáo nhóm các giá trị được phân giải cho:

- **Profile** — hồ sơ đang hoạt động và nguồn giải quyết
- **Memory roots** — các đường dẫn bộ nhớ không gian làm việc và toàn cục
- **Core config** — enabled, scope, read, proof, roles
- **Routing** — load limit, các cài đặt đồ thị, vector
- **Graph** — enabled, số lượng tối đa liên quan, điểm số tối thiểu
- **Git detection** — remote, URL remote, nhánh, tự động đồng bộ

Mỗi đầu ra giải thích những gì Engram thực sự giải quyết được, chứ không chỉ là những gì đã được định cấu hình. Sử dụng nó để gỡ lỗi hành vi hồ sơ, gốc bộ nhớ, Git, định tuyến và hook.

## Đóng máy chủ (Close server)

Dừng máy chủ Entry cục bộ. Sử dụng nó để đảm bảo vệ sinh an ninh sau khi hoàn thành cấu hình.

<RiskCallout level="risky">
Bảng điều khiển này chỉ dành cho cục bộ. Hãy đóng máy chủ từ tab Runtime khi hoàn thành để tránh để nó mở.
</RiskCallout>

## Tương đương CLI

```bash
engram config view
engram entry
```

## Các bước tiếp theo

- [Tài liệu tham khảo trường đầy đủ](field-reference.md)
- [Khắc phục sự cố hoạt động](../operations/troubleshooting.md)
