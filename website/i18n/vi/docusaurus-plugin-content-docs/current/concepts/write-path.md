---
title: "Quy trình ghi và phê duyệt"
sidebar_position: 6
description: "Tác nhân đề xuất, con người phê duyệt. Chỉ bộ nhớ được phê duyệt mới được ghi, sau đó các chỉ mục, đồ thị và mã băm sẽ được cập nhật."
---

# Giao Thức Bộ Nhớ Do Con Người Sở Hữu

## Phe duyet trong chat AI

Trong chat voi tac nhan AI, phe duyet Engram la dang hoi dap. Tac nhan truoc tien hien thi cac ung vien da duoc bien tap `TYPE: ... | TEXT: ...`, va voi rule thi kem theo cac bien the Light/Balanced/Strict. Tra loi `yes` de luu dung cac ung vien do, `audit` de sua lai, hoac `cancel` de dung. Sau `yes`, tac nhan dung `engram save-session --accept-all` voi chinh cac ung vien da duoc phe duyet. Cac lan luu truc tiep tren CLI van dung A/B/C tru khi lenh accept-all da duoc goi ro rang.


Engram không chỉ đơn thuần là "bộ nhớ của tác nhân AI". Nó là một giao thức giúp bộ nhớ có thể được kiểm tra, di chuyển và quản lý bởi con người.

## Hợp Đồng Giao Thức

Markdown là bộ nhớ bền vững.

Các tệp chỉ mục (index) và đồ thị (graph) JSON là các lớp tăng tốc.

Phê duyệt (Approval) là ranh giới tin cậy.

Mã băm (Hashes) là các bước kiểm tra tính toàn vẹn.

Các quy tắc bỏ qua (Ignore rules) là các chốt kiểm soát quyền riêng tư.

Git mang lại tính di động và lịch sử kiểm duyệt thay đổi.

Các bộ điều hợp (Agent adapters) mang tính chất tiện ích, không có quyền lực cao nhất.

Các tác nhân AI có thể đề xuất bộ nhớ, nhưng con người mới sở hữu những gì được đưa vào bộ nhớ.

## Các Loại Bộ Nhớ

| Loại | Mục đích sử dụng |
| --- | --- |
| Rule | tùy chọn ưu tiên của người dùng, sửa lỗi, ràng buộc, hướng dẫn "luôn luôn/không bao giờ" |
| Skill | quy trình làm việc có thể lặp lại, danh sách kiểm tra (checklist), thủ tục, sổ tay vận hành (runbook) |
| Knowledge | sự thật khách quan của dự án, quyết định, chi tiết triển khai |

Mỗi tệp bộ nhớ đang hoạt động đều có các phần `Context`, `Content`, và `Example`. Các bộ nhớ thuộc loại Quy tắc (Rule) cũng hướng tới giới hạn dòng ngắn gọn để đảm bảo hướng dẫn được tải luôn hữu ích.

## Quy Trình Ghi Bộ Nhớ

1. Tác nhân AI đề xuất một hoặc nhiều ứng viên.
   Với `save-session --query-level <n>`, tác nhân AI có thể xem xét tối đa n phiên chat người-tác nhân gần đây có thể truy cập, nhưng chỉ làm ngữ cảnh đề xuất.
   Cách nói tự nhiên `/engram ss -a last 50 sessions` dùng cùng phạm vi đó kèm phê duyệt rõ ràng toàn bộ ứng viên: `engram save-session --query-level 50 --accept-all`.
2. Engram phân tích loại ứng viên và phạm vi ghi mục tiêu (scope).
3. Engram kiểm tra cấu trúc (schema), thông tin nhạy cảm (secrets), các mẫu tấn công prompt-injection và tính an toàn của đường dẫn tệp.
4. Con người xem trước bản đề xuất.
5. Con người phản hồi `A`, `A 1,3`, `B <ghi chú>`, hoặc `C`.
6. Chỉ các bộ nhớ được phê duyệt mới được ghi lại.
7. Chỉ mục, đồ thị, mã băm và nhật ký thay đổi (changelog) được làm mới.

## Quy Trình Đọc Bộ Nhớ

1. Engram tải các chỉ mục không gian làm việc và chỉ mục toàn cục tùy chọn.
2. Các mục trong không gian làm việc ghi đè lên các mục trùng lặp toàn cục.
3. Các quy tắc bỏ qua và bộ lọc vai trò (role filters) ẩn các mục không liên quan.
4. Định tuyến dựa trên đồ thị lựa chọn một gói ngữ cảnh nhỏ gọn.
5. Việc kiểm tra mã băm và an toàn bảo mật được chạy trước khi in nội dung.

## Tại Sao Điều Này Quan Trọng

Nếu không có một giao thức rõ ràng, bộ nhớ có thể trở thành một trạng thái ẩn (invisible state). Trạng thái ẩn rất khó xem xét, khó chia sẻ và dễ bị các tác nhân AI làm sai lệch thông tin một cách vô tình.

Engram làm cho bộ nhớ trở nên đơn giản một cách có chủ đích: quản lý bằng tệp tin, các bản so sánh sự khác biệt (diffs), mã băm, cổng phê duyệt và các lệnh mà con người có thể chạy lại bất cứ lúc nào.

Tiếp theo: [Hướng dẫn vận hành](../cli/overview.md).
