---
title: Tab Memories (Bộ nhớ)
sidebar_position: 8
description: Kiểm tra biểu đồ bộ nhớ, xem trước bộ nhớ, chỉnh sửa và lưu trữ.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Tab Memories

Tab Memories dùng để kiểm tra đồ thị bộ nhớ và thực hiện các hành động bảo trì bộ nhớ.

## Các thẻ phạm vi (Scope chips)

Lọc đồ thị theo nguồn bộ nhớ. So sánh bộ nhớ không gian làm việc so với bộ nhớ toàn cục. Hãy bắt đầu với chỉ không gian làm việc hiện tại khi đồ thị có vẻ quá nhiều thông tin gây nhiễu.

## Các thẻ loại (Type chips)

Lọc đồ thị theo loại bộ nhớ. Kiểm tra riêng các quy tắc (rules), kỹ năng (skills) hoặc kiến thức (knowledge).

## Bật tắt liên kết ngữ nghĩa (Semantic links toggle)

Hiển thị các cạnh đồ thị ngữ nghĩa. Hãy tắt đi khi đồ thị quá nhiễu về mặt hình ảnh.

## Làm mới / Xây dựng lại (Refresh / rebuild)

Tải lại hoặc xây dựng lại dữ liệu đồ thị. Sử dụng sau khi chỉnh sửa, nhập dữ liệu, lưu trữ hoặc thay đổi cấu hình.

## Xem trước bộ nhớ (Memory preview)

Đọc nội dung bộ nhớ được chọn. Hữu ích để kiểm tra những gì tác nhân sẽ nhận được.

<RiskCallout level="caution">
Nội dung nhạy cảm cục bộ có thể hiển thị trong trình duyệt. Hãy coi bảng điều khiển là công khai khi đang xem trước.
</RiskCallout>

## Chỉnh sửa bộ nhớ (Edit memory)

Mở tệp trong một trình soạn thảo và sao chép đường dẫn. Sử dụng cho việc chỉnh sửa thủ công hoặc xem xét. Nguồn dữ liệu chuẩn luôn là tệp Markdown.

## Lưu trữ bộ nhớ (Archive memory)

Loại bỏ bộ nhớ khỏi định tuyến hoạt động trong khi vẫn bảo tồn nó dưới thư mục `archive/`. Hãy sử dụng lưu trữ (archive), không phải xóa (delete), để có khả năng kiểm tra lại lịch sử.

<RiskCallout level="caution">
Lưu trữ sẽ thay đổi định tuyến ngay lập tức. Hãy sử dụng lưu trữ, không phải xóa thủ công, để lịch sử được bảo tồn.
</RiskCallout>

## Tương đương CLI

```bash
engram graph "<topic>"
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

## Các bước tiếp theo

- [Tab Core](core.md)
- [Tab Runtime](runtime.md)
