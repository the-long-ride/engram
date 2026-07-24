---
title: Quy trình phát hành và nâng cấp
sidebar_position: 2
description: Nâng cấp các gói Engram và đối chiếu các gốc bộ nhớ một cách an toàn.
---

# Quy trình phát hành và nâng cấp

## Sau khi cập nhật gói npm

Lệnh Engram thông thường tiếp theo sẽ âm thầm đối chiếu các gốc workspace/global đã khởi tạo một lần cho phiên bản mới. Điều này bao gồm các thay đổi lược đồ bộ nhớ từ phiên bản này sang phiên bản khác từ v0.0.8 trở đi bằng cách làm mới trợ giúp được tạo, chỉ mục bộ nhớ, tệp đồ thị và các vector sidecar đủ điều kiện khi phát hiện siêu dữ liệu cũ hơn.

Kiểm tra khi khởi động cố ý được tối ưu hóa rất nhẹ sau lần chạy đầu tiên: nó chỉ đọc các dấu hiệu cấu hình nhỏ khi phiên bản hiện tại đã được ghi nhận. Nó không chạy từ npm postinstall, tạo gốc bộ nhớ mới hoặc thay thế các tệp do con người viết. Sử dụng `--no-auto-upgrade` hoặc `ENGRAM_NO_AUTO_UPGRADE=1` để bỏ qua thao tác này cho một lệnh.

## Nâng cấp rõ ràng

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

Lệnh `engram upgrade` làm mới các trợ giúp workspace được tạo, chỉ mục bộ nhớ, tệp đồ thị, các vector sidecar đủ điều kiện, các tệp skillset workspace do Engram tạo hiện có và các skillset toàn cục đã đăng ký trong khi vẫn giữ nguyên các tệp do con người tự viết.

Lệnh `engram upgrade --latest` mạnh mẽ hơn: nó ghi đè lên các bản cấu phần agent liên kết được quản lý bởi Engram hiện tại cho các agent workspace đã liên kết và các lượt cài đặt toàn cục đã đăng ký, bao gồm các tệp hướng dẫn, quy tắc, cấu hình MCP/plugin và các hook được quản lý, để các host liên kết nhận được gói đầu ra mới ngay lập tức.

Chỉ sử dụng `--force` khi có chủ ý thay thế các tệp bộ điều hợp Engram được tạo.

## Hồ sơ kết xuất bộ kỹ năng (Skillset render profiles)

Đối với các host hỗ trợ chạy thực thi (runtime-capable), Engram sẽ cài đặt các hướng dẫn bootstrap nhỏ thay vì toàn bộ giao thức. Các hook cung cấp ngữ cảnh tác vụ được định tuyến, công cụ MCP cung cấp hành vi tải/tìm kiếm/đề xuất và các bộ điều hợp slash hoặc Agent Skills mang lại các quy trình lệnh chi tiết. Các mục tiêu dự phòng không có chèn ngữ cảnh thời gian chạy đáng tin cậy vẫn sẽ nhận được hướng dẫn thủ công nhỏ gọn.

## Cơ chế dự phòng cơ sở dữ liệu SQLite config

Cơ sở dữ liệu cấu hình SQLite của Engram là một tối ưu hóa cho việc quản lý workspace/profile. Nếu cơ sở dữ liệu không thể mở hoặc khởi tạo, các lệnh đọc/ghi bình thường sẽ tự động chuyển sang sử dụng các ảnh chụp nhanh cấu hình JSON (JSON config snapshots). Các lệnh đặc thù của cơ sở dữ liệu sẽ báo cáo SQLite không khả dụng thay vì chặn việc sử dụng bộ nhớ thông thường.

## Bước tiếp theo

- [Khắc phục sự cố](troubleshooting.md)
- [CLI: inject / link / upgrade](../cli/inject-link-upgrade.md)
