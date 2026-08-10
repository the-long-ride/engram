---
title: Khởi chạy bảng điều khiển
sidebar_position: 2
description: Chạy engram entry để khởi chạy bảng điều khiển Entry chỉ dành cho cục bộ.
---

# Khởi chạy bảng điều khiển

Khởi chạy bảng điều khiển:

```bash
engram entry
```

Lệnh này khởi động một máy chủ cục bộ và mở trình duyệt mặc định của bạn tại URL của bảng điều khiển.

## Hành vi trình duyệt

Bảng điều khiển sẽ tự động mở trong trình duyệt mặc định của bạn. Nếu không, hãy sao chép URL được in ra và dán vào trình duyệt theo cách thủ công.

## Hành vi máy chủ cục bộ

Máy chủ chỉ liên kết nội bộ để chỉ máy tính của bạn mới có thể truy cập được. Nó không được tiếp xúc với mạng theo mặc định.

## Quy trình đóng máy chủ

Đóng máy chủ từ tab **Runtime** bằng hành động **Close server**, hoặc dừng tiến trình terminal đã khởi chạy `engram entry`. Việc đóng tab trình duyệt sẽ không làm dừng máy chủ.

## Các lỗi khởi chạy thường gặp

- **Port already in use (Cổng đã được sử dụng)** — một tiến trình khác đang sử dụng cổng của bảng điều khiển. Hãy dừng tiến trình đó hoặc làm theo hướng dẫn dự phòng được in ra.
- **Browser did not open (Trình duyệt không mở)** — sao chép URL được in ra và dán vào trình duyệt theo cách thủ công.
- **No workspace initialized (Không có không gian làm việc nào được khởi tạo)** — chạy lệnh `engram inject` trước, hoặc sử dụng `engram entry` từ thư mục gốc của dự án.

## Các bước tiếp theo

- [Tab Connections](connections.md)
- [Tab Construct](construct.md)
