---
title: Các loại bộ nhớ
sidebar_position: 2
description: Bộ nhớ Engram được phân loại — Rule (Quy tắc), Skill (Kỹ năng), và Knowledge (Kiến thức) — để quá trình định tuyến và đánh giá luôn tập trung.
---

# Các loại bộ nhớ

Mỗi bộ nhớ Engram đang hoạt động đều có một loại cụ thể. Loại bộ nhớ sẽ kiểm soát việc định tuyến, đánh giá và cách bộ nhớ được hiển thị cho các agent.

| Loại | Cách dùng |
| --- | --- |
| Rule | Tùy chọn của người dùng, sửa lỗi, ràng buộc, hướng dẫn luôn/không bao giờ thực hiện |
| Skill | Quy trình làm việc có thể lặp lại, danh sách kiểm tra, thủ tục, tài liệu hướng dẫn |
| Knowledge | Sự thật khách quan của dự án, quyết định, chi tiết triển khai |

Mỗi tệp bộ nhớ đang hoạt động đều có các phần `Context` (Ngữ cảnh), `Content` (Nội dung) và `Example` (Ví dụ). Bộ nhớ dạng Rule cũng hướng tới giới hạn dòng ngắn gọn để các hướng dẫn được tải lên luôn hữu ích.

## Bộ nhớ tốt

Bộ nhớ Engram tốt là bộ nhớ:

- Đủ ổn định để vẫn còn giá trị trong tuần tới
- Đủ cụ thể để định tuyến sau này
- Đủ ngắn để tải vào ngữ cảnh của agent
- Đủ an toàn để chia sẻ trong phạm vi dự kiến
- Được viết dưới dạng một quy tắc (rule), quy trình làm việc (workflow) hoặc thông tin kiến thức (knowledge)

Bộ nhớ xấu là những tạp âm trò chuyện tạm thời, thông tin bí mật, thông tin xác thực, suy đoán một lần hoặc các sự thật chưa được ai phê duyệt.

## Các biến thể quy tắc (Rule variants)

Engram luôn lưu trữ bộ nhớ quy tắc với các phiên bản nhẹ (light), cân bằng (balanced) và nghiêm ngặt (strict). Chế độ biến thể quy tắc là một thấu kính hiển thị cho bộ nhớ hướng tới agent:

- **Strict** giúp các mô hình cấp thấp hơn được kiểm soát tốt hơn.
- **Light** hoặc **balanced** thường giúp ích cho các mô hình mạnh hơn để các quy tắc không giới hạn khả năng suy luận của chúng.

Khi các biến thể bị tắt, Engram sẽ hiển thị từ ngữ quy tắc cân bằng theo mặc định. Điều chỉnh bằng:

```bash
engram set-rule-variant strict|balanced|light|off
```

## Đầu ra hướng tới Agent (`--full`)

Khi `engram load "<task>"` chạy, đầu ra sẽ được tinh giản cho các AI agent:

| Khía cạnh | Con người (`engram load`) | Agent (`--full`) |
| --- | --- | --- |
| Frontmatter | Tất cả các trường (id, type, tags, confidence, scope, author, created, updated, depends_on, v.v.) | Chỉ `id`, `type`, `tags`, `confidence`, `depends_on` |
| Thân quy tắc | Toàn bộ phần `## Rule Variants` với cả ba biến thể | Một biến thể được chọn dưới phần `## Rule variants (1/3 based on current: <active>)` |
| Nội dung không phải quy tắc | Toàn bộ phần `## Content` | Cùng nội dung, tiêu đề không đổi |

MCP `engram_load` và hook SessionStart mặc định sử dụng `--full` (tắt thông qua `full: true` trên công cụ MCP). Các bộ điều hợp skillset mã hóa cứng `--full` trong các hướng dẫn được tạo của chúng.

## Bước tiếp theo

- [Bộ nhớ Workspace so với bộ nhớ Global](scopes.md)
- [Đường dẫn đọc và định tuyến](read-path.md)

