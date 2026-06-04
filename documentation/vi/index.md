# Engram

Engram là một giao thức bộ nhớ do con người sở hữu dành cho các tác nhân AI (AI agents). Giao thức này lưu giữ kiến thức bền vững về dự án, nhóm và cá nhân dưới dạng các tệp tin mà con người có thể kiểm tra, xem xét, đồng bộ hóa và sửa chữa.

Engram không phải là một bộ não ẩn của tác nhân AI. Tác nhân AI có thể đề xuất bộ nhớ, nhưng nguồn sự thật (source of truth) duy nhất luôn là các tệp Markdown đã được phê duyệt nằm trong thư mục `.agents/.engram/` hoặc một thư mục bộ nhớ toàn cục (global) tùy chọn.

## Vấn Đề Engram Giải Quyết

Các tác nhân AI thường quên các quyết định của dự án, lặp lại các câu hỏi thiết lập và trộn lẫn ngữ cảnh cũ với các hướng dẫn mới. Bộ nhớ tích hợp sẵn thường thuộc quyền sở hữu riêng của một nhà cung cấp, một ứng dụng hoặc một máy tính cụ thể.

Engram mang lại cho bộ nhớ một hợp đồng ổn định:

- Các sự thật (facts), quy tắc (rules) và quy trình làm việc (workflows) đã được phê duyệt sẽ sống dưới dạng Markdown.
- Các chỉ mục (indexes) và đồ thị (graphs) giúp tăng tốc độ định tuyến (routing).
- Mọi thao tác ghi bộ nhớ đều yêu cầu sự phê duyệt của con người.
- Các mã băm (hashes) giúp phát hiện những sửa đổi không an toàn.
- Các quy tắc bỏ qua (ignore rules) bảo vệ các ngữ cảnh riêng tư.
- Git cung cấp lịch sử thay đổi, tính di động và khả năng xem xét trong nội bộ nhóm.

## Mô Hình Nhận Thức

Hãy nghĩ về Engram như một trung tâm lưu trữ kiến thức:

| Lớp | Vai trò |
| --- | --- |
| Markdown | Nguồn sự thật bền vững |
| JSON index | Lớp tra cứu nhanh |
| JSON graph | Lớp định tuyến chủ đề và mối quan hệ |
| Approval gate | Ranh giới tin cậy trước khi ghi bộ nhớ |
| Hashes | Kiểm tra tính toàn vẹn trước khi đọc |
| Ignore rules | Kiểm soát quyền riêng tư |
| Git | Lịch sử kiểm toán và đồng bộ hóa |
| Agent adapters | Tiện ích kết nối, không có quyền quyết định |

## Thứ Tự Ưu Tiên Phạm Vi

Engram phân giải bộ nhớ theo thứ tự sau:

1. Bộ nhớ không gian làm việc (workspace): `<project>/.agents/.engram/`
2. Bộ nhớ toàn cục (global): `$ENGRAM_GLOBAL_DIR` hoặc `engram init --global-path <đường_dẫn>`

Bộ nhớ workspace luôn giành chiến thắng. Bộ nhớ global đóng vai trò là phương án dự phòng (fallback) cho các thiết lập có thể tái sử dụng và ngữ cảnh chung của nhóm trên nhiều dự án.

## Trạng Thái Hiện Tại

Engram bao gồm:

- `save` để lưu trữ một bộ nhớ đã phê duyệt.
- `save-session` / `ss` để lưu nhiều bộ nhớ rút ra từ một phiên làm việc, với `--query-level <n>` tùy chọn để khai thác tối đa n phiên chat gần đây mà tác nhân có thể truy cập; `/engram ss -a last 50 sessions` được chuẩn hóa thành `engram save-session --query-level 50 --accept-all`.
- `observe` để ghi lại các ghi chú thô chưa được đưa vào bộ nhớ hoạt động.
- `take-control` để nhập (import) các hướng dẫn và tài liệu hiện có của tác nhân AI.
- `graph` và `quality-check` để cung cấp các tín hiệu xem xét cấu trúc bộ nhớ.
- `archive` để đưa các bộ nhớ sai hoặc đã bị thay thế ra khỏi định tuyến hoạt động.
- `repair` để phát hiện các tệp bộ nhớ bị lỗi cấu trúc bị bỏ qua khi xây dựng lại chỉ mục.
- `benchmark` để kiểm tra độ suy giảm hiệu suất truy xuất (retrieval regression).
- Các bộ kỹ năng tác nhân (skillsets), bộ điều hợp lệnh slash, và các công cụ đề xuất kiểu MCP.

Trước khi sử dụng các lệnh, vui lòng đọc trang khái niệm: [Hiểu Về Engram](understanding.md).

Tiếp theo: [Bắt đầu nhanh với tác nhân AI](quickstart.md).
