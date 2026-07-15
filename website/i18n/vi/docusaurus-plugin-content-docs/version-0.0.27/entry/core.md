---
title: Tab Core (Cốt lõi)
sidebar_position: 7
description: Xem xét các bộ nhớ trùng lặp và xung đột với các bộ lọc phạm vi và loại.
---

# Tab Core

Tab Core dùng để xem xét các bộ nhớ trùng lặp và xung đột. Đây là không gian làm việc nhận thức siêu việt (metacognition) bên trong bảng điều khiển Entry.

## Các thẻ phạm vi (Scope chips): profile / global / workspace

Lọc phân tích trùng lặp/xung đột theo nguồn bộ nhớ. Kiểm tra một phạm vi hoặc so sánh các trùng lặp chéo phạm vi. Giữ ít nhất một phạm vi được chọn.

## Các thẻ loại (Type chips): rule / skill / workflow / knowledge

Lọc các ứng viên trùng lặp theo loại bộ nhớ. Tập trung dọn dẹp các quy tắc (rule) trước hoặc các dữ kiện kiến thức (knowledge) trước. Tài liệu hóa ý nghĩa loại bộ nhớ inline để người dùng hiểu khi nào việc trùng lặp là vô hại.

## Bao gồm các ứng viên ngữ nghĩa (Include semantic candidates)

Thêm tính năng tìm kiếm trùng lặp theo ngữ nghĩa, chứ không chỉ khớp chính xác/từ vựng. Sử dụng khi dọn dẹp các kho lưu trữ bộ nhớ trưởng thành; chuẩn bị cho nhiều trường hợp dương tính giả hơn.

## Sao chép gợi ý (Copy prompt)

Sao chép một gợi ý `/engram` cho tác nhân hoặc mô hình mạnh hơn để giải quyết các trùng lặp. Sử dụng cho quy trình dọn dẹp và đánh giá có con người hướng dẫn. Nhắc nhở người dùng xem lại các thay đổi được tạo ra thông qua các cổng phê duyệt.

## Xem trước (Preview)

Hiển thị gợi ý trước khi sao chép. Khuyến khích xem trước cho các hoạt động dọn dẹp rủi ro.

## Tương đương CLI

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
engram metacognize --workspace --force
```

## Các bước tiếp theo

- [Tab Memories](memories.md)
- [CLI: verify / repair / quality-check](../cli/verify-repair-quality.md)

