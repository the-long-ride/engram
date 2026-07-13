---
title: load / search / graph
sidebar_position: 2
description: Các lệnh đọc — tải bộ nhớ được định tuyến, tìm kiếm hầm chứa và kiểm tra định tuyến đồ thị.
---

# load / search / graph

Các lệnh đọc giúp tải bộ nhớ được định tuyến, tìm kiếm hầm chứa và kiểm tra định tuyến đồ thị.

## load

```bash
engram load "<task>"
engram load "<task>"
engram load --dry-run "<task>"
engram load --all "<task>"
```

`load` trước tiên sẽ neo định tuyến vào các từ khóa truy vấn có ý nghĩa, bỏ qua các từ nhớ chung chung như `rule`, `knowledge` và các từ dừng phổ biến. Sau đó, nó tinh chỉnh tập hợp ứng viên rộng hơn thành một gói ngữ cảnh nhỏ gọn. Lượt tải thông thường sẽ báo cáo số lượng đã chọn và tổng số liên quan, ví dụ `loaded 8 memory files / 14 total related memories`.

- `--full` — đường dẫn thu gọn dành cho tác nhân (chỉ có `id`, `type`, `tags`, `confidence`, `depends_on` trong frontmatter; một biến thể quy tắc được chọn)
- `--dry-run` — hiển thị số lượng ứng viên, thẻ thu hẹp và lý do khớp mà không in nội dung
- `--all` — trả về tất cả các kết quả khớp định tuyến hiển thị thay vì giới hạn thu gọn

`workflow` và `workflows` vẫn định tuyến đến các bộ nhớ kỹ năng, nhưng các từ loại chung chung tự bản thân chúng không tạo nên kết quả khớp rộng.

## search

```bash
engram search "<topic>"
engram search --semantic "<topic>"
```

Tìm kiếm mặc định là tìm kiếm từ vựng mang tính quyết định. `search --semantic` bổ sung độ tương đồng cục bộ mang tính quyết định, không phải tìm kiếm ngữ nghĩa được hỗ trợ bởi embedding.

## graph

```bash
engram graph "<topic>"
engram graph --rebuild
```

Kiểm tra định tuyến đồ thị. Chạy `engram graph --rebuild` sau khi chỉnh sửa thủ công. Đồ thị báo cáo các lớp phụ thuộc, và `engram load` kéo các điều kiện tiên quyết được định tuyến vào cùng một gói ngữ cảnh nhỏ gọn trước các bộ nhớ sâu hơn.

Các cạnh liên quan trong đồ thị và kết quả khớp vector không tự động tải các bộ nhớ không liên quan; chúng chỉ giúp xếp hạng lại hoặc mở rộng các bộ nhớ đã trùng khớp với các từ khóa truy vấn có ý nghĩa. Các điều kiện tiên quyết `depends_on` rõ ràng vẫn có thể tải mà không cần từ khóa trùng khớp riêng của chúng.

## Các lớp phụ thuộc (Dependency layers)

```yaml
depends_on: [release-foundation]
level: advanced
```

Sử dụng frontmatter `depends_on` khi một bộ nhớ nên được xây dựng trên một bộ nhớ khác thay vì lặp lại nó.

## Các bước tiếp theo

- [save / save-session / observe](save-session.md)
- [Khái niệm: đường dẫn đọc và định tuyến](../concepts/read-path.md)

