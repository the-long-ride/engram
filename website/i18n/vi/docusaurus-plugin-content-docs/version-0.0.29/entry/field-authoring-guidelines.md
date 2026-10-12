---
title: Hướng dẫn biên soạn trường
sidebar_position: 11
description: Các quy tắc dành cho người bảo trì tài liệu khi viết tài liệu cho các trường Entry UI mới.
---

# Hướng dẫn biên soạn trường

Các quy tắc dành cho người bảo trì tài liệu khi viết tài liệu cho các trường Entry UI mới.

## Khi bạn thêm một trường

1. Thêm trường đó vào `CONFIG_FIELDS` trong tệp `src/core/web/config-schema.ts` với một `description` ngắn gọn, `options`, `min`/`max`/`step`, và mức độ `risk` (rủi ro).
2. Thêm một mục tài liệu vào `website/src/data/entryFields.ts` với tối thiểu các trường `shortDescription`, `useCases`, và `guidelines`.
3. Tài liệu hóa trường đó trên trang [Tab Construct](construct.md) và trong [Tài liệu tham khảo trường đầy đủ](field-reference.md).
4. Chạy kiểm tra phạm vi bảo hiểm của tài liệu các trường:

   ```bash
   npm --prefix website run check:entry-fields
   ```

5. Nếu trường đó có rủi ro (risky), hãy thêm ít nhất một ghi chú khôi phục/gỡ lỗi.

## Các mục tài liệu bắt buộc cho mỗi trường

| Mục | Bắt buộc |
| --- | --- |
| Mô tả bằng ngôn ngữ thông thường | Có |
| Các trường hợp sử dụng | Có (ít nhất 1) |
| Giá trị mặc định được đề xuất | Có |
| Các giá trị được cho phép / phạm vi | Có |
| Mức độ rủi ro | Có |
| Tác dụng phụ | Khi liên quan |
| Tương đương CLI | Khi liên quan |
| Ví dụ giá trị | Cho các trường văn bản/đường dẫn |
| Ghi chú khắc phục sự cố | Cho các trường rủi ro |

## Quy tắc viết

- Viết cho người dùng đang định cấu hình hệ thống bộ nhớ tác nhân AI, không viết cho người bảo trì đọc mã nguồn.
- Nêu rõ ảnh hưởng thực tế đối với quyền sở hữu bộ nhớ, định tuyến, kích thước ngữ cảnh, quyền riêng tư hoặc đồng bộ hóa Git.
- Ưu tiên các ví dụ từ quy trình làm việc của Engram: Codex, Claude, Gemini, Cursor, OpenCode, bộ nhớ cá nhân, hồ sơ khách hàng, repo của nhóm.
- Không đề xuất giới hạn cao theo mặc định; giải thích các đánh đổi về phình to ngữ cảnh.
- Đánh dấu các cài đặt là rủi ro khi chúng có thể vô hiệu hóa Engram, thay đổi vị trí lưu, thay đổi đồng bộ Git, lưu trữ bộ nhớ hoặc ảnh hưởng đến mã hóa/bảo mật.
- Bao gồm các lệnh khôi phục cho các cài đặt rủi ro.
- Giữ mô tả ngắn gọn trong ứng dụng; đưa hướng dẫn chi tiết vào Docusaurus.

## Kiểm tra CI

Tệp `website/scripts/check-entry-field-docs.mjs` sẽ thất bại khi:

1. Một khóa `CONFIG_FIELDS` hiển thị thiếu mục tài liệu tương ứng.
2. Một mục tài liệu tham chiếu đến một trường không còn nằm trong `CONFIG_FIELDS`.
3. Một trường thiếu `shortDescription`, `useCases`, hoặc `guidelines`.
4. Một trường rủi ro thiếu ít nhất một ghi chú khắc phục sự cố.
5. Một trường số bỏ qua phạm vi được phép trong tài liệu hiển thị.

## Các bước tiếp theo

- [Tài liệu tham khảo trường đầy đủ](field-reference.md)
- [Tab Construct](construct.md)
