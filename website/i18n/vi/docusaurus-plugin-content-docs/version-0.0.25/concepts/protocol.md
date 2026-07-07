---
title: "Giao thức bộ nhớ do con người sở hữu"
sidebar_position: 1
description: "Engram là một giao thức giúp bộ nhớ của tác nhân AI có thể kiểm tra, di động và được quản lý bởi con người."
---

# Hiểu Về Engram

Hãy đọc tài liệu này trước khi xem hướng dẫn sử dụng lệnh. Engram thực sự hữu ích vì lý do ai là người sở hữu bộ nhớ, chứ không phải vì nó có nhiều câu lệnh.

## Mô Hình Trong Một Câu

Engram là một giao thức tệp tin cho phép các tác nhân AI sử dụng bộ nhớ bền vững trong khi con người quyết định những gì sẽ trở nên bền vững.

## Engram Là Gì

Engram là một trung tâm lưu trữ bộ nhớ kiến thức dành cho:

- các quy tắc dự án (project rules)
- các quyết định của nhóm (team decisions)
- các quy trình làm việc có thể lặp lại (repeatable workflows)
- các sự thật bền vững (durable facts)
- các tùy chọn cá nhân đi kèm xuyên suốt các dự án

Bộ nhớ được lưu trữ dưới dạng Markdown thông thường. Chỉ mục, đồ thị, mã băm và các tệp bộ điều hợp (adapter) tồn tại nhằm giúp cho việc sử dụng Markdown đó trở nên dễ dàng và an toàn hơn.

## Engram Không Phải Là Gì

Engram không phải là:

- bộ não ẩn của tác nhân AI
- kho lưu trữ bộ nhớ độc quyền của bên thứ ba
- tài liệu thay thế hoàn toàn cho tài liệu dự án
- cơ sở dữ liệu vector tự xưng là nguồn chân lý duy nhất
- máy ghi âm tự động lưu lại mọi thứ mãi mãi

Tác nhân AI có thể đề xuất bộ nhớ. Nhưng con người mới là bên phê duyệt, từ chối, chỉnh sửa, lưu trữ (archive) và sở hữu bộ nhớ đó.

## Lời Hứa Cốt Lõi

Engram cố gắng làm cho bộ nhớ AI trở nên:

- có thể xem xét: bạn có thể đọc bộ nhớ bằng bất kỳ trình soạn thảo thông thường nào
- có tính di động: bạn có thể đồng bộ hóa qua Git và sử dụng trên nhiều tác nhân AI khác nhau
- có thể sửa đổi: bộ nhớ sai lệch có thể được lưu trữ (archive) kèm lý do rõ ràng thay vì âm thầm gây ảnh hưởng tiêu cực đến công việc trong tương lai
- riêng tư theo mặc định: các quy tắc bỏ qua (ignore rules) và cổng phê duyệt ngăn chặn việc ghi nhận thông tin ngoài ý muốn
- đơn giản một cách có chủ đích: định dạng Markdown dễ tin cậy hơn so với trạng thái ẩn kín của nền tảng

## Các Lớp Hệ Thống

| Lớp | Ý nghĩa |
| --- | --- |
| Markdown | Nguồn sự thật bền vững duy nhất |
| JSON index | Lớp tra cứu nhanh chóng |
| JSON graph | Lớp định tuyến chủ đề và các mối quan hệ |
| Hashes | Kiểm tra tính toàn vẹn của tệp |
| Approval | Ranh giới tin cậy trước khi ghi bộ nhớ |
| Ignore rules | Kiểm soát quyền riêng tư |
| Git | Lịch sử thay đổi, tính di động, xem xét và phục hồi |
| Agent adapters | Lớp tiện ích cho Codex, Claude, Cursor, Gemini và các tác nhân AI khác |

Các tệp JSON được tạo ra nhằm giúp tác nhân AI tìm kiếm bộ nhớ nhanh hơn, nhưng chúng không có quyền lực cao nhất. Nếu có sự không nhất quán giữa tệp JSON và Markdown, Markdown luôn luôn thắng.

## Vòng Đời Của Bộ Nhớ

1. Một phiên làm việc, tệp tin hoặc ghi chú của con người chứa đựng kiến thức hữu ích.
2. Tác nhân AI đề xuất các ứng viên bộ nhớ ngắn gọn.
3. Con người duyệt tất cả, chọn một vài mục, thêm ghi chú hoặc từ chối chúng.
4. Engram ghi bộ nhớ Markdown đã được phê duyệt.
5. Engram cập nhật mã băm, chỉ mục, đồ thị và nhật ký thay đổi (changelog).
6. Các tác nhân AI tương lai chỉ tải các bộ nhớ liên quan đến tác vụ hiện tại.
7. Nếu bộ nhớ không còn chính xác, Engram sẽ lưu trữ (archive) nó kèm theo lý do cụ thể.

Vòng đời này giữ cho bộ nhớ luôn hoạt động hiệu quả mà không bị ẩn giấu khỏi tầm mắt con người.

## Con Người, Tác Nhân AI, Engram, Git

| Bên tham gia | Vai trò |
| --- | --- |
| Con người | Lựa chọn những gì sẽ trở thành bộ nhớ bền vững |
| Tác nhân AI | Nhận biết các mẫu thông tin và đề xuất ứng viên |
| Engram | Thực thi cấu trúc dữ liệu, bảo mật, định tuyến, phê duyệt và bảo trì |
| Git | Truyền tải bộ nhớ giữa các máy tính và cung cấp lịch sử kiểm duyệt |

Tác nhân AI rất hữu ích, nhưng không phải là chủ sở hữu bộ nhớ.

## Bộ Nhớ Tốt

Bộ nhớ Engram tốt phải:

- đủ ổn định để vẫn còn giá trị vào tuần tới
- đủ cụ thể để có thể định tuyến sau này
- đủ ngắn để tải vào ngữ cảnh của tác nhân AI
- đủ an toàn để chia sẻ trong phạm vi dự kiến
- được viết dưới dạng một quy tắc (rule), quy trình (skill) hoặc kiến thức (knowledge)

Bộ nhớ xấu là những tạp âm trò chuyện tạm thời, thông tin nhạy cảm, mật khẩu hoặc khóa API, các suy đoán nhất thời hoặc các sự thật chưa được ai phê duyệt.

## Phạm Vi (Scope)

Bộ nhớ không gian làm việc (workspace) nằm tại:

```text
<project>/.agents/.engram/
```

Bộ nhớ toàn cục (global) là tùy chọn và nằm ở bất kỳ đâu người dùng thiết lập.

Bộ nhớ workspace giành chiến thắng. Bộ nhớ global là phương án dự phòng cho các tùy chọn có thể tái sử dụng, thói quen cá nhân hoặc các giá trị mặc định của toàn nhóm.

## Tại Sao Không Chỉ Dùng Bộ Nhớ Tích Hợp Sẵn Của Tác Nhân AI

Bộ nhớ tích hợp sẵn rất tiện lợi, nhưng có thể khó kiểm tra, so sánh (diff), xuất dữ liệu, chia sẻ hoặc sửa đổi. Nó thường bị ràng buộc chặt chẽ vào một ứng dụng hoặc tài khoản duy nhất.

Engram làm cho lớp bộ nhớ bền vững hiển thị rõ ràng trước mắt bạn. Bộ nhớ tích hợp sẵn vẫn có thể hỗ trợ, nhưng Engram nên là nguồn sở hữu chính khi kiến thức đó thực sự quan trọng.

## Các Giới Hạn Cần Biết

Tìm kiếm mặc định của Engram là tìm kiếm từ vựng mang tính quyết định (lexical search). `engram search --semantic` bổ sung so khớp độ tương đồng cục bộ, chứ không phải tìm kiếm ngữ nghĩa được hỗ trợ bởi các mô hình embedding đầy đủ. Các vector trong đồ thị là các vector từ băm cục bộ (local hashed word vectors). Việc phát hiện mâu thuẫn chỉ mang tính chất tham khảo. Cấu hình mã hóa có tồn tại, nhưng lưu trữ mã hóa chưa được hiện thực hóa.

Các giới hạn này được tuyên bố rõ ràng một cách có chủ đích. Engram luôn muốn người dùng biết rõ những gì đang hoạt động hiện tại và những gì thuộc về tương lai phát triển.

Tiếp theo: [Bắt đầu nhanh với tác nhân AI](../quickstart.md).
