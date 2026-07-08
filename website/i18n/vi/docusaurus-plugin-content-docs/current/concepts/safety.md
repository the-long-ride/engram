---
title: Quyền riêng tư, quy tắc bỏ qua và an toàn
sidebar_position: 7
description: Các quy tắc bỏ qua, cổng phê duyệt, mã băm và hồ sơ giúp bảo vệ ngữ cảnh riêng tư khỏi bị ghi lại một cách vô tình.
---

# Quyền riêng tư, quy tắc bỏ qua và an toàn

Engram mặc định ở chế độ riêng tư. Nhiều lớp bảo mật giúp giữ cho ngữ cảnh riêng tư không bị rò rỉ vào bộ nhớ lâu dài hoặc vượt qua ranh giới hồ sơ.

## Cổng phê duyệt (Approval gate)

Mọi thao tác ghi đều cần sự phê duyệt của con người. Các agent sẽ đề xuất ứng viên; con người sẽ phê duyệt, từ chối, chỉnh sửa hoặc lưu trữ. CLI terminal trực tiếp sử dụng cơ chế A/B/C. Cuộc trò chuyện của AI agent sử dụng `yes` / `audit` / `cancel`.

## Quy tắc bỏ qua (Ignore rules)

Quy tắc bỏ qua là các chốt kiểm soát quyền riêng tư. Chúng ẩn các mục không liên quan hoặc nhạy cảm khỏi quá trình định tuyến. Hãy định cấu hình chúng trong tệp `.engramignore` và cấu hình bộ nhớ workspace để các đường dẫn và mẫu riêng tư không bao giờ đi vào chỉ mục.

## Mã băm (Hashes)

Mã băm đóng vai trò là các bước kiểm tra tính toàn vẹn. Chúng chạy trước khi nội dung được in ra và phát hiện các chỉnh sửa không an toàn bỏ qua luồng ghi thông thường.

## Hồ sơ (Profiles)

Hồ sơ cô lập bộ nhớ của công ty, khách hàng và cá nhân để các API bên ngoài hoặc các agent do công ty cung cấp không làm rò rỉ ngữ cảnh qua các dự án. Xem thêm tại [Hồ sơ và phân giải phạm vi](profiles.md).

## Quét thông tin mật và mã độc tấn công (Secrets and injection scanning)

Tại thời điểm lưu, Engram sẽ kiểm tra:

- xác thực lược đồ (schema validation)
- quét thông tin mật (secret scan)
- các mẫu tấn công chèn lệnh prompt (prompt-injection patterns)
- an sau đường dẫn (path safety)

## Các giới hạn cần biết

Tìm kiếm Engram mặc định là tìm kiếm từ vựng xác định (deterministic lexical search). Lệnh `engram search --semantic` bổ sung độ tương đồng cục bộ xác định, chứ không phải tìm kiếm ngữ nghĩa được hỗ trợ bởi nhúng (embedding-backed semantic search). Các vector đồ thị là các vector từ băm cục bộ, không phải là nhúng ngữ nghĩa. Phát hiện mâu thuẫn chỉ mang tính chất khuyến nghị. Cấu hình mã hóa đã tồn tại, nhưng bộ nhớ mã hóa vẫn chưa được triển khai.

Những giới hạn này được nêu rõ một cách có chủ ý. Engram cần nói rõ cho người dùng biết những gì đã hoạt động thực tế hôm nay và những gì là công việc trong tương lai.

## Bước tiếp theo

- [Đường dẫn ghi và phê duyệt](./write-path.md)
- [Khắc phục sự cố vận hành](../operations/troubleshooting.md)
