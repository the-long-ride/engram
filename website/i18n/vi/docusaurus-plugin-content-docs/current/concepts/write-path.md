---
title: Luồng ghi và phê duyệt
sidebar_position: 6
description: Agent đề xuất, con người phê duyệt. Chỉ bộ nhớ đã duyệt mới được ghi, sau đó chỉ mục, đồ thị, hash và changelog được làm mới.
---

# Luồng ghi và phê duyệt

Luồng ghi là ranh giới tin cậy. Agent đề xuất, con người phê duyệt.

## Luồng ghi {#write-flow}

1. Agent đề xuất một hoặc nhiều ứng viên.
   Với `save-session --query-level <n>`, agent có thể xem xét tối đa n cuộc trò chuyện gần đây giữa người và agent mà có thể truy cập, nhưng chỉ dùng làm ngữ cảnh đề xuất.
   Câu tự nhiên `/engram ss -f last 50 sessions` có cùng phạm vi đó cộng với sự phê duyệt buộc lưu tường minh: `engram save-session --query-level 50 --force`.
2. Engram phân tích loại ứng viên và phạm vi đích.
3. Engram kiểm tra schema, bí mật, các mẫu prompt-injection và an toàn đường dẫn.
4. Con người thấy bản xem trước. Mỗi ứng viên mang một dòng `Verdict:` xác định: `ADD`, `UPDATE <id>`, `SUPERSEDE <id>` hoặc `NOOP duplicate of <id>` (không gọi mô hình).
5. Phản hồi trên CLI trực tiếp dùng `A`, `A 1,3`, `B <note>` hoặc `C`.
6. Phản hồi trong chat với AI agent dùng `yes`, `audit` hoặc `cancel` sau các ứng viên đã được hiển thị chính xác.
7. Chỉ bộ nhớ đã duyệt mới được ghi. `A` và `B` bỏ qua các ứng viên `NOOP`, và việc phê duyệt một `SUPERSEDE` đánh dấu bộ nhớ cũ là đã bị thay thế; `--force` và autosave không bao giờ áp dụng `SUPERSEDE`, mà hoãn lại để rà soát.
8. Chỉ mục, đồ thị, hash và changelog được làm mới.

## Từ phê duyệt {#approval-words}

Các từ phê duyệt là `yes`, `approve`, `confirm` hoặc `save`. Các từ audit là `audit`, `revise`, `correct` hoặc văn bản thay thế đã chỉnh sửa. Các từ hủy là `cancel`, `stop` hoặc lời từ chối. Chỉ sự phê duyệt sau khi đã hiển thị chính xác các ứng viên mới ủy quyền `engram save-session --force` cho những ứng viên đó.

CLI terminal trực tiếp vẫn là A/B/C. Các công cụ đề xuất MCP vẫn không ghi.

## Gợi ý về bộ nhớ liên quan {#related-memory-hints}

Khi `engram save` tìm thấy các bộ nhớ đang hoạt động có liên quan, bản xem trước phê duyệt báo cáo chúng kèm gợi ý `depends_on` hoặc cảnh báo có thể trùng lặp. Chấp nhận sẽ lưu bản xem trước nguyên trạng; hãy từ chối trước nếu bạn muốn tái cấu trúc phụ thuộc hoặc lưu trữ các bản trùng lặp trước khi lưu.

Với `save-session --force`, Engram tạm dừng trước khi ghi nếu xuất hiện các gợi ý bộ nhớ liên quan đó. Agent nên dùng phản hồi để brainstorm một lần chạy lại có cấu trúc: thêm `DEPENDS_ON: memory-id` cho các phụ thuộc, `LEVEL: advanced` khi một bộ nhớ sâu hơn tiền đề của nó, hoặc `UPDATE: memory-id` khi một ứng viên nên hợp nhất vào một bản có thể trùng lặp.

<!-- evidence-foundation:v3:start -->
## Bộ nhớ có bằng chứng {#evidence-backed-memory}

Với tài liệu nguồn cần được rà soát trước khi trở thành bộ nhớ đang hoạt động:

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<observation>.md
```

Lệnh đầu tiên làm sạch nguồn và ghi một dấu vết bất biến được định danh bằng `trace_id` cùng một lớp bọc inbox có thể chỉnh sửa. Lệnh thứ hai đối chiếu lớp bọc về dấu vết của nó, xác minh hash và phạm vi, rồi chỉ ghi bộ nhớ schema v3 đã được con người phê duyệt kèm `evidence_refs`. Chỉnh sửa `## Raw Note` không thể thay thế bằng chứng là dấu vết.
<!-- evidence-foundation:v3:end -->

## Các kiểm tra an toàn khi lưu {#safety-checks-at-save-time}

- Kiểm tra schema
- Quét bí mật
- Quét prompt-injection
- An toàn đường dẫn
- Toàn vẹn hash

## Vì sao điều này quan trọng {#why-this-matters}

Nếu không có giao thức, bộ nhớ có thể trở thành trạng thái vô hình. Trạng thái vô hình khó rà soát, khó chia sẻ và dễ bị agent làm nhiễm một cách vô tình.

Engram cố ý làm cho bộ nhớ trở nên nhàm chán: tệp, diff, hash, các cổng rà soát và các lệnh mà con người có thể chạy lại.

## Bước tiếp theo {#next-steps}

- [Quyền riêng tư, quy tắc bỏ qua và an toàn](safety.md)
- [CLI: save / save-session / observe](../cli/save-session.md)
