# Bắt Đầu Nhanh Với Tác Nhân AI

Hãy sử dụng Engram thông qua tác nhân AI trước tiên. Mặc dù giao diện dòng lệnh (CLI) có sẵn, nhưng trải nghiệm tốt nhất là: yêu cầu tác nhân AI tải bộ nhớ, thực hiện công việc, sau đó đề xuất ghi nhận bộ nhớ bền vững khi có thông tin hữu ích xuất hiện.

## Tin Nhắn Đầu Tiên Trong Một Phiên Làm Việc Mới

Hãy hỏi tác nhân AI:

```text
Hãy dùng Engram cho tác vụ này. Tải bộ nhớ cho: <chủ đề chúng ta đang thực hiện>.
```

Nếu các bộ điều hợp lệnh slash đã được cài đặt:

```text
/engram load "<tác vụ hiện tại>"
```

Tác nhân AI chỉ nên tóm tắt các mã định danh bộ nhớ (IDs) và các quy tắc liên quan, chứ không dán toàn bộ nội dung của từng tệp tin vào cửa sổ chat.

## Đoạn Hội Thoại Thiết Lập Được Đề Xuất

Yêu cầu tác nhân AI:

```text
Hãy khởi tạo Engram cho không gian làm việc này, cài đặt bộ kỹ năng (skillset) phù hợp cho tác nhân AI này, và cho tôi biết tôi nên dùng lệnh nào tiếp theo.
```

Tác nhân AI có thể chạy:

```bash
engram init
engram help link
engram link <tên-tác-nhân-ai>
```

Để sử dụng trực tiếp trong chat, hãy hỏi:

```text
Hãy cài đặt hỗ trợ lệnh slash để tôi có thể sử dụng lệnh /engram trực tiếp từ tác nhân AI này.
```

## Vòng Lặp Hằng Ngày

Bắt đầu:

```text
/engram load "tác vụ hiện tại"
```

Trong lúc làm việc:

```text
/engram search "chủ đề tôi có thể đang thiếu sót"
```

Khi tác nhân AI học được một sự thật bền vững:

```text
/engram save knowledge
```

Khi phiên làm việc tạo ra nhiều quy tắc, sự thật hoặc quy trình làm việc hữu ích:

```text
/engram save-session
```

Dạng viết tắt:

```text
/engram ss
```

Để bao gồm lịch sử chat gần đây mà tác nhân AI thật sự có thể truy cập:

```text
/engram save-session --query-level 3
```

`--query-level` phải là một số nguyên dương. Tác nhân AI chỉ được dùng tối đa số phiên chat gần đây đó, bao gồm phiên hiện tại, và không được bịa ra lịch sử không thể truy cập.

Lối tắt phê duyệt toàn bộ (accept-all) chỉ khi bạn thực sự muốn sử dụng nó:

```text
/engram ss -a
```

`-a` có nghĩa là con người phê duyệt rõ ràng cho mọi ứng viên được tác nhân AI đề xuất. Các tác nhân AI không được tự ý thêm cờ này vào lệnh.

Để khai thác các chat gần đây có thể truy cập và phê duyệt toàn bộ ứng viên được tạo trong một yêu cầu:

```text
/engram ss -a last 50 sessions
```

Lệnh này được chuẩn hóa thành `engram save-session --query-level 50 --accept-all`.

## Nhập Kiến Thức Hiện Có (Import)

Đối với một kho lưu trữ đã có sẵn các tệp `AGENTS.md`, `CLAUDE.md`, các quy tắc Cursor, ghi chú hoặc tài liệu khác:

```text
/engram take-control --plan
/engram take-control --all
```

Hãy sử dụng `--plan` trước tiên khi bạn muốn xem danh sách các tệp được chọn, tệp bị bỏ qua, ước tính số lượng token và loại bộ nhớ dự kiến.

## Bộ Nhớ Toàn Cục (Global Memory)

Sử dụng bộ nhớ toàn cục cho các tùy chọn ưu tiên đi theo bạn xuyên suốt các kho lưu trữ:

```text
Thiết lập bộ nhớ toàn cục Engram tại <đường_dẫn>, sau đó lưu tùy chọn này trên toàn cục:
Sử dụng pnpm để quản lý gói (package management).
```

Tác nhân AI có thể sử dụng:

```bash
engram init --global-only --global-path <đường_dẫn>
engram save --scope global "Sử dụng pnpm để quản lý gói."
```

## Giữ Cho Bộ Nhớ Luôn Khỏe Mạnh

Hãy hỏi tác nhân AI vào cuối những phiên làm việc có ý nghĩa:

```text
Hãy kiểm tra sức khỏe Engram, báo cáo các bộ nhớ không hợp lệ và đề xuất những nội dung đáng lưu lại từ phiên làm việc này.
```

Các lệnh hữu ích:

```bash
engram verify
engram repair
engram graph "<chủ đề>"
engram quality-check
engram archive --reason "<lý do>" <id-hoặc-tên-tệp>
```

Tiếp theo: [Giao thức bộ nhớ do con người sở hữu](protocol.md).
