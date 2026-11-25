---
title: Tab Review
sidebar_position: 5
description: Giải quyết các phát hiện kiểm tra, chỉ đạo agent AI và xác nhận rõ ràng việc ghi bộ nhớ dự phòng.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Tab Review

Review là luồng được kiểm soát dành cho các phát hiện kiểm tra và ứng viên bị trì hoãn. Tab này không bao giờ tự ý gọi nhà cung cấp AI. Bạn kiểm tra ngữ cảnh, sao chép prompt có giới hạn cho agent AI, sau đó để agent lưu qua terminal hoặc tự mình xác nhận rõ ràng phản hồi được dán vào.

## Hàng đợi và ngữ cảnh

Hàng đợi kết hợp các biên nhận học phiên, ứng viên hộp thư đến bị hoãn và các phát hiện rà soát. Lọc danh sách bằng các thẻ lọc hàng đợi: **All**, **Session learning**, **Deferred** và **Findings**.

Chọn một mục để kiểm tra tóm tắt, metadata bộ nhớ liên kết và toàn bộ nội dung. Các tệp liên kết trống hoặc không khả dụng được báo cáo mà không làm gián đoạn việc rà soát phần còn lại của hàng đợi.

Bạn cũng có thể phân loại bằng bàn phím:

- `j` / `k` — chuyển đến mục tiếp theo hoặc trước đó trong hàng đợi
- `a` — phê duyệt biên nhận đang chọn
- `d` — bỏ qua mục đang chọn

## Phê duyệt và bỏ qua biên nhận

Với các biên nhận `session-learning`, bạn có thể áp dụng trực tiếp các ứng viên đã duyệt mà không cần sao chép prompt:

- **Approve receipt** áp dụng biên nhận `session-learning` đang chọn thông qua `POST /api/review/apply`.
- **Approve N** phê duyệt hàng loạt tất cả các biên nhận hộp thư đến **đã chọn** trong một yêu cầu `POST /api/review/apply`.
- **Dismiss** xóa một mục khỏi hàng đợi mà không ghi bộ nhớ.

## Prompt rà soát cho AI

Mục **02 Review prompt** có thể thu gọn để bạn đóng lại khi phân loại biên nhận nhanh và mở rộng khi một mục cần agent rà soát. Chọn bất kỳ bộ nhớ được liên kết nào làm phần phụ thuộc hoặc phần thay thế, sau đó sử dụng **Copy AI review prompt**. Prompt chỉ chứa ứng viên đã chọn, ngữ cảnh bộ nhớ hiển thị, hướng dẫn quan hệ và phạm vi ghi bắt buộc.

Khi agent AI có quyền truy cập terminal và được phê duyệt để ghi, agent nên lưu kết quả đã khử dữ liệu nhạy cảm bằng lệnh được nhúng trong prompt. Luồng trong ứng dụng là phương án dự phòng, không phải luồng ghi tự động.

## Dán, so sánh diff và xác nhận

Chỉ dán đề xuất bộ nhớ đã được AI rà soát. Review hiển thị bản so sánh diff dạng chỉ đọc: các dòng bị xóa màu đỏ và dòng được thêm màu xanh lá. **Approve & write** mở hộp thoại xác nhận trước khi Engram xác thực và ghi đề xuất.

<RiskCallout level="risky">
Hộp thoại xác nhận sẽ ghi vào bộ nhớ workspace hoặc global ngay lập tức. Hãy rà soát đề xuất, phạm vi và mọi hướng dẫn thay thế trước khi xác nhận.
</RiskCallout>

Chỉ được chọn một quan hệ thay thế. Các phần phụ thuộc có thể được chọn độc lập. Hãy làm mới hàng đợi sau khi lưu để tải trạng thái hiện tại.

## Các bước tiếp theo

- [Tab Construct](construct.md)
- [Tab Memories](memories.md)
- [CLI: save-session](../cli/save-session.md)
