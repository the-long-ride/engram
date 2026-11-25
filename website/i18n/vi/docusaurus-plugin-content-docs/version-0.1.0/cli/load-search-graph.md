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

`load` tách từ cho truy vấn và bộ nhớ với cơ chế hỗ trợ Unicode/Tiếng Việt/CJK, rồi neo định tuyến vào các từ khóa truy vấn có ý nghĩa bằng `rawStems` chưa mở rộng (`hasAnchorOverlap`), bỏ qua các từ chỉ loại chung chung như `rule`, `knowledge` và các stopword phổ biến để việc mở rộng từ đồng nghĩa không đưa vào các bộ nhớ không liên quan. Khi thiếu mỏ neo chính xác, 24 cụm khái niệm mang tính xác định và các cầu nối đồng xuất hiện trong kho ngữ liệu vẫn có thể nối các thuật ngữ liên quan. Các ứng viên được chấm điểm bằng BM25F 3 luồng (`title`, `tags`, `body`) kết hợp đo lường kết quả vòng kín từ `usage.json` (tăng điểm `applied`, giảm điểm `corrected` và suy giảm nhiễu cho các bộ nhớ bị chèn lặp lại không mang lại giá trị). Sau đó, nó tinh chỉnh tập ứng viên rộng hơn thành một gói ngữ cảnh nhỏ gọn và sắp xếp các nội dung mở rộng bằng `orderForAgentConsumption` (quy tắc, chỉ thị và điều kiện tiên quyết `depends_on` ở đầu; ngữ cảnh bền vững cũ hơn ở giữa; các mục lá mới `<=14d` hoặc thuộc tầng `working` ở cuối). Lượt tải thông thường sẽ báo cáo số lượng đã chọn và tổng số liên quan, ví dụ `loaded 8 memory files / 14 total related memories`.

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

## why

```bash
engram why <id>
engram why <id> "<query>"
engram why <id> "<query>" --json
```

Giải thích vì sao một bộ nhớ cụ thể được đưa vào, xếp hạng hoặc bị loại bỏ cho một truy vấn: báo cáo `status` (`expanded_body`, `card`, `omitted_budget`, `omitted_limit`, `rejected_no_anchor`, `excluded_lifecycle`, `not_found`), `rank`, `score`, `matched_stems`, `missing_stems`, `budget` và `hint`. Truyền `--json` để lấy kết quả chẩn đoán có cấu trúc.

## graph

```bash
engram graph "<topic>"
engram graph --rebuild
engram graph link <parent-id> <child-id...>
```

Kiểm tra định tuyến đồ thị hoặc khai báo các cạnh phụ thuộc tường minh. Chạy `engram graph --rebuild` sau khi chỉnh sửa thủ công, hoặc dùng `engram graph link <parent-id> <child-id...>` để thêm liên kết `depends_on` từ bộ nhớ con đến điều kiện tiên quyết cha và làm mới đồ thị. Đồ thị báo cáo các lớp phụ thuộc, và `engram load` kéo các điều kiện tiên quyết được định tuyến vào cùng gói ngữ cảnh nhỏ gọn trước các bộ nhớ sâu hơn.

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
