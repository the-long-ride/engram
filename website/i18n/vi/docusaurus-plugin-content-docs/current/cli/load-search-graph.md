---
title: load / search / graph
sidebar_position: 2
description: Các lệnh đọc — tải bộ nhớ được định tuyến, tìm kiếm hầm chứa và kiểm tra định tuyến đồ thị.
---

# load / search / graph

Các lệnh đọc giúp tải bộ nhớ được định tuyến, tìm kiếm kho lưu trữ và kiểm tra định tuyến đồ thị.

## load

```bash
engram load "<task>"
engram load --full "<task>"
engram load --dry-run "<task>"
engram load --all "<task>"
engram load --budget-tokens 800 "<task>"
engram load --disclosure full "<task>"
engram load --id <id>,<id>
engram load --exclude-keys workspace:rules/use-pnpm.md "<task>"
```

`load` trước tiên neo định tuyến vào các từ khóa truy vấn có ý nghĩa, bỏ qua các từ chỉ loại chung chung như `rule`, `knowledge` và các stopword phổ biến. Sau đó, nó tinh chỉnh tập ứng viên rộng hơn thành một gói ngữ cảnh nhỏ gọn. Lượt tải thông thường sẽ báo cáo số lượng đã chọn và tổng số liên quan, ví dụ `loaded 8 memory files / 14 total related memories`.

- `load` mặc định — định tuyến phân tầng hướng tới agent: các kết quả hàng đầu theo `load.expand_top` (mặc định 3) hiển thị dưới dạng toàn bộ nội dung (body), mọi kết quả được chọn khác hiển thị dưới dạng thẻ (card) tóm tắt một dòng, kèm theo gợi ý `fetch: engram load --id <ids>` ở cuối; mỗi tiêu đề body mang trường `authority` của bộ nhớ, frontmatter như `evidence_refs`, `## Context`, `## Example` và `## Origin` không được hiển thị (dùng `--full` để xem đầy đủ), và quy tắc chỉ hiển thị một biến thể được chọn.
- `--id <id,...>` — lấy toàn bộ nội dung cho các thẻ; các id phân tách bằng dấu phẩy, và lượt lấy tường minh này được tính vào `stats --usage`.
- `--budget-tokens <200-16000>` — giới hạn cứng cho toàn bộ đầu ra phân tầng; các nội dung sẽ chuyển thành thẻ trước, và chỉ khi đó các thẻ có thứ hạng thấp nhất mới bị lược bỏ.
- `--disclosure auto|full` — `full` in toàn bộ nội dung đã đóng gói thay vì gói phân tầng (cũng cấu hình qua `load.disclosure: full`).
- `--exclude-keys <scope:file,...>` — bỏ qua các bộ nhớ mà bên gọi đã nắm giữ; không in body hay card, và `--json` liệt kê chúng trong `already_loaded`.
- `--full` — đầu ra kế thừa mở rộng với đầy đủ frontmatter và tất cả biến thể quy tắc.
- `--dry-run` — hiển thị số lượng ứng viên, thẻ thu hẹp và lý do khớp mà không in nội dung.
- `--all` — trả về tất cả kết quả khớp hiển thị thay vì giới hạn thu gọn.

`workflow` và `workflows` vẫn định tuyến tới các bộ nhớ kỹ năng (skill), nhưng các từ loại chung chung tự bản thân chúng không tạo nên kết quả khớp rộng.

Dưới chế độ hiển thị `auto`, danh sách JSON `selected` và `entries` chỉ mô tả các body được mở rộng; các card được báo cáo riêng biệt. Cấu hình `load.expand_top` và `load.disclosure` trong khối `load` của `engram.config.json` (xem [hồ sơ / workspace / cấu hình](profiles-workspaces-config.md#load-configuration)).

## search

```bash
engram search "<topic>"
engram search --semantic "<topic>"
```

Tìm kiếm mặc định là tìm kiếm từ vựng mang tính xác định. `search --semantic` bổ sung độ tương đồng cục bộ mang tính xác định, không phải tìm kiếm ngữ nghĩa dùng embedding. Kết quả `search --json` mang theo trường `score`.

## graph

```bash
engram graph "<topic>"
engram graph --rebuild
```

Kiểm tra định tuyến đồ thị. Chạy `engram graph --rebuild` sau khi chỉnh sửa thủ công. Đồ thị báo cáo các lớp phụ thuộc, và `engram load` kéo các điều kiện tiên quyết được định tuyến vào cùng gói ngữ cảnh nhỏ gọn trước các bộ nhớ sâu hơn.

Các cạnh liên quan trong đồ thị và kết quả khớp vector không tự động tải các bộ nhớ không liên quan; chúng chỉ giúp xếp hạng lại hoặc mở rộng các bộ nhớ đã trùng khớp với các từ khóa truy vấn có ý nghĩa. Các điều kiện tiên quyết `depends_on` rõ ràng vẫn có thể tải mà không cần từ khóa trùng khớp riêng của chúng.

## Các tầng phụ thuộc {#dependency-layers}

```yaml
depends_on: [release-foundation]
level: advanced
```

Sử dụng frontmatter `depends_on` khi một bộ nhớ nên được xây dựng dựa trên một bộ nhớ khác thay vì lặp lại nó.

## Các bước tiếp theo {#next-steps}

- [save / save-session / observe](save-session.md)
- [Khái niệm: đường dẫn đọc và định tuyến](../concepts/read-path.md)
