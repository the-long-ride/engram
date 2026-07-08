---
title: Tab Workspaces (Không gian làm việc)
sidebar_position: 6
description: Đăng ký và liên kết các kho lưu trữ dự án từ Entry Web UI.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Tab Workspaces

Tab Workspaces đăng ký các kho lưu trữ dự án và quản lý trạng thái liên kết của chúng.

## Tên không gian làm việc (Workspace name)

Tên hiển thị thân thiện cho đường dẫn của kho lưu trữ/dự án. Hãy giữ nó ngắn gọn và dễ nhận biết.

## Đường dẫn không gian làm việc (Workspace path)

Đường dẫn hệ thống tệp đến một kho lưu trữ/dự án. Đảm bảo thư mục tồn tại hoặc có thể khởi tạo; tránh các thư mục hệ thống.

## Liên kết / Hủy liên kết (Link / Unlink)

Liệu Engram có chủ động kết nối các hướng dẫn và hook được tạo ra với không gian làm việc đó hay không. Liên kết các repo đang hoạt động; hủy liên kết các repo thử nghiệm hoặc đã lưu trữ.

<RiskCallout level="caution">
Hủy liên kết sẽ dừng tác nhân nhận hướng dẫn từ Engram. Hãy xác nhận trước khi hủy liên kết một không gian làm việc đang hoạt động.
</RiskCallout>

## Xóa (Delete)

Xóa đăng ký không gian làm việc. Làm rõ việc xóa này chỉ xóa đăng ký hay xóa các tệp bộ nhớ; tài liệu phải khớp với triển khai thực tế. Ưu tiên hủy liên kết hơn là xóa để giữ khả năng kiểm tra lịch sử.

## Tương đương CLI

```bash
engram inject
engram link codex
engram unlink
```

## Các bước tiếp theo

- [Tab Profiles](profiles.md)
- [Tab Connections](connections.md)
