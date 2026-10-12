---
title: "Tổng quan so sánh"
sidebar_position: 1
description: "Cách Engram so sánh với bộ nhớ tích hợp của tác nhân, agentmemory, Obsidian, Tolaria và Hermes Agent."
---

# So Sánh, Ưu Điểm, Nhược Điểm Và Lộ Trình Phát Triển

Engram nằm ở một phân khúc khác trong không gian lưu trữ bộ nhớ so với các công cụ ghi nhớ tự động. Nó tối ưu hóa cho quyền sở hữu của con người, khả năng dễ dàng xem xét kiểm duyệt và tính di động.

## Các Điểm Mạnh Của Engram

- Nguồn sự thật duy nhất dựa trên định dạng Markdown văn bản thuần túy.
- Yêu cầu sự phê duyệt của con người trước khi thực hiện ghi bộ nhớ bền vững.
- Lịch sử kiểm toán và đồng bộ hóa tích hợp tự nhiên trong Git.
- Cấu trúc ưu tiên không gian làm việc (workspace-first) và dự phòng toàn cục (global-fallback).
- Không phụ thuộc vào tác nhân AI: bất kỳ tác nhân AI nào cũng có thể đọc tài liệu Markdown.
- Lớp bảo mật mạnh mẽ: xác thực cấu trúc (schema), quét thông tin nhạy cảm, quét chèn câu lệnh (prompt injection), mã băm bảo mật và quy tắc bỏ qua.
- Không yêu cầu dịch vụ chạy ẩn (daemon), cơ sở dữ liệu riêng hay tài khoản đám mây.
- Các quy trình nhập (import), ghi nhận (observe), lưu trữ (archive), đồ thị (graph), đánh giá hiệu năng (benchmark) và sửa chữa (repair) hỗ trợ đắc lực cho việc duy trì hệ thống dài hạn.

## Các Điểm Đánh Đổi (Tradeoffs) Của Engram

- Ít tính tự động hơn so với các hệ thống bộ nhớ chạy ẩn dựa trên daemon.
- Tìm kiếm mặc định là tìm kiếm từ vựng mang tính quyết định (lexical search); `search --semantic` chỉ bổ sung so khớp độ tương đồng cục bộ chứ không phải tìm kiếm ngữ nghĩa dựa trên các mô hình embedding đầy đủ.
- Các vector trong đồ thị là các vector từ băm cục bộ, không phải là embedding ngữ nghĩa.
- Tính năng phát hiện mâu thuẫn (contradiction detection) hoạt động theo thuật toán phỏng đoán và chỉ mang tính chất tham khảo, tư vấn.
- Tính năng `deduplicate --semantic` sử dụng độ tương đồng cục bộ, không gọi tới các mô hình embedding bên ngoài.
- Các tài nguyên thiết kế cho khai thác mẫu (pattern mining), mã hóa cấu hình và quy trình PR có tồn tại, nhưng các quy trình vận hành đầy đủ lúc chạy chưa được kết nối hoàn chỉnh.
- Đồ thị phụ thuộc hoàn toàn vào các thẻ (tags) và tóm tắt được tạo ra.

## So Với Agentmemory

[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) là một công cụ quản lý bộ nhớ tự động mạnh mẽ cho các tác nhân lập trình. Tài liệu README của nó giới thiệu bộ nhớ dựa trên máy chủ, tích hợp MCP/hooks/REST, nhiều bộ điều hợp tác nhân, các tuyên bố về hiệu năng kiểm thử, giao diện xem trực quan, phát lại phiên làm việc (replay), truy xuất hỗn hợp và tích hợp với mô hình Hermes.

Hãy sử dụng `agentmemory` khi bạn muốn thu thập dữ liệu tự động, xem trực quan/phát lại trực tiếp, truy xuất vector, nhiều công cụ MCP và bộ nhớ chia sẻ kiểu máy chủ.

Hãy sử dụng `Engram` khi bạn muốn bộ nhớ là một giao thức có thể đọc được ngay trong kho lưu trữ của mình: ưu tiên Markdown, con người phê duyệt, Git kiểm duyệt, có thể di chuyển giữa các tác nhân AI ngay cả khi không có máy chủ nào đang chạy.

| Tiêu chí | Engram | agentmemory |
| --- | --- | --- |
| Nguồn sự thật duy nhất | Các tệp Markdown đã phê duyệt | Bộ nhớ lưu trữ trên máy chủ |
| Ranh giới tin cậy | Phê duyệt A/B/C của con người | Thu thập tự động + kiểm soát bằng công cụ |
| Chế độ mặc định | Giao thức tệp tin, không cần daemon | Đề xuất chạy dịch vụ ẩn liên tục |
| Đánh giá thay đổi | So sánh Git diff và xem xét Markdown | Giao diện xem/API và các phiên lưu trữ |
| Phù hợp nhất cho | Các nhóm cần quyền sở hữu và khả năng kiểm toán | Người dùng muốn tự động nhớ lại và phát lại |
| Rủi ro | Đòi hỏi kỷ luật quản lý thủ công cao hơn | Nhiều trạng thái ẩn khó kiểm soát nếu thiếu quản lý |

## So Với Hermes Agent

### Tóm tắt (TL;DR)

| | Engram | Hermes Agent |
|---|---|---|
| **Triết lý** | Giao thức ưu tiên tệp tin, do con người sở hữu (tự động hóa tùy chọn) | Bộ nhớ tự động, luôn hoạt động |
| **Lưu trữ** | Các tệp Markdown phân loại trong `.agents/.engram/` | `MEMORY.md` + `USER.md` (giới hạn ký tự cứng) |
| **Mô hình ghi** | Phê duyệt mặc định từ con người (cổng A/B/C; có thể tự động hóa qua quy tắc) | Tác nhân ghi tự động |
| **Recall** | Theo nhu cầu: `engram load "<tác vụ>"` chèn các tệp liên quan | Luôn bật: các tệp cốt lõi được cố định vào system prompt của mỗi phiên |
| **Tìm kiếm vector** | sqlite-vec cục bộ tùy chọn (mang tính quyết định, không dựa trên embedding) | Qua nhà cung cấp bên ngoài (ví dụ: agentmemory — BM25 + vector) |
| **Đa tác nhân** | Bất kỳ tác nhân đọc tệp nào cũng có thể sử dụng bộ nhớ Engram | Lõi Hermes là đơn tác nhân; đa tác nhân qua plugin agentmemory |
| **Tính di động** | Tích hợp Git tự nhiên, ngoại tuyến trước, Markdown thuần túy | Các tệp cục bộ; nhà cung cấp bên ngoài có thể gây khóa chặt đám mây |
| **Chi phí vận hành** | Không cần daemon, đòi hỏi kỷ luật lưu trữ (trừ khi tự động hóa) | Tiến trình máy chủ + giao diện xem, REST API, máy chủ MCP |

---

### Định dạng lưu trữ

**Engram** lưu trữ mỗi bộ nhớ dưới dạng một tệp Markdown phân loại có kèm YAML frontmatter, kiểm tra tính toàn vẹn bằng mã băm và đồ thị phụ thuộc tùy chọn (`depends_on`). Chỉ mục JSON, đồ thị và sidecar sqlite-vec đóng vai trò là các lớp tăng tốc — Markdown là nguồn sự thật duy nhất.

**Hermes** nén tất cả bộ nhớ bền vững vào hai tệp giới hạn:
- `~/.hermes/memories/MEMORY.md` — ghi chú tác nhân, giới hạn ở 2.200 ký tự
- `~/.hermes/memories/USER.md` — hồ sơ người dùng, giới hạn ở 1.375 ký tự

Giới hạn ký tự cứng buộc tác nhân phải tinh lọc thay vì tích tụ. Lịch sử phiên làm việc có thể tìm kiếm qua SQLite FTS5.

---

### Mô hình ghi

**Engram** — cổng phê duyệt rõ ràng từ con người mặc định. Tác nhân đề xuất ứng viên; con người phải phê duyệt trước khi bất kỳ thứ gì được lưu vào đĩa. Quét thông tin nhạy cảm và chèn prompt diễn ra tại thời điểm lưu. *(Lưu ý: Người dùng có thể tự động hóa quy trình này bằng cách thiết lập một quy tắc tự động lưu các đề xuất bộ nhớ mới khi phiên phản hồi hoàn thành, tạo nên một luồng lưu tự động).*

**Hermes** — tự động. Tác nhân quyết định viết gì và khi nào, chỉ bị giới hạn bởi các giới hạn ký tự. Không có sự phê duyệt của con người trong vòng lặp cốt lõi.

---

### Mô hình thu hồi (Recall)

**Engram** — định tuyến theo nhu cầu. `engram load "<tác vụ>"` xếp hạng lại các ứng viên theo tag, loại, độ mới, đồ thị và tín hiệu vector tùy chọn, sau đó chèn một gói nhỏ gọn (mặc định: 8 tệp) vào ngữ cảnh.

**Hermes** — chèn luôn hoạt động. Các tệp cốt lõi được cố định vào system prompt khi bắt đầu phiên. Một nhà cung cấp bên ngoài tùy chọn (ví dụ: agentmemory) chạy tìm nạp trước mỗi lượt LLM và đồng bộ sau đó.

---

### Khi nào nên sử dụng loại nào

**Sử dụng Engram** khi bạn cần bộ nhớ có thể kiểm toán và được con người xem xét; chia sẻ nhóm qua Git; các đảm bảo quyền riêng tư; hoặc khả năng di động không phụ thuộc tác nhân trên các công cụ (với tùy chọn tự động hóa lưu qua các quy tắc tùy chỉnh).

**Sử dụng Hermes** khi bạn muốn bộ nhớ tự động tích lũy mà không cần kỷ luật lưu trữ, chèn ngữ cảnh luôn bật hoặc môi trường chạy phong phú hơn với giao diện xem, REST API và các backend vector cắm thêm.

---

## So Với Bộ Nhớ Tích Hợp Sẵn Của Tác Nhân AI

Bộ nhớ tích hợp sẵn của tác nhân AI tuy tiện lợi nhưng thường bị khóa trong một máy chủ cụ thể. Rất khó để so sánh sự khác biệt (diff), xuất dữ liệu, kiểm duyệt hoặc chia sẻ nó với một tác nhân AI khác.

Engram coi bộ nhớ tích hợp sẵn chỉ là một lớp tiện ích bổ trợ, không phải là cơ quan có thẩm quyền cao nhất. Quyền lực tối cao vẫn thuộc về các tệp tin mà con người sở hữu.

## Ý Tưởng Lộ Trình Phát Triển (Roadmap)

- Hỗ trợ nhà cung cấp mô hình embedding cục bộ tùy chọn cho vector đồ thị và tìm kiếm.
- Cải thiện công cụ chẩn đoán đồ thị giúp giải thích rõ lý do tại sao một bộ nhớ được định tuyến.
- Lưu trữ sẵn các dữ liệu kiểm thử (fixtures) hiệu năng trong kho lưu trữ để theo dõi sự suy giảm hiệu quả tìm kiếm.
- Quy trình đánh giá mâu thuẫn mạnh mẽ hơn kết hợp đồ thị, kiểm tra chất lượng và lưu trữ.
- Thêm nhiều bài kiểm thử nhập dữ liệu cho các biến thể xuất của `agentmemory`.
- Hỗ trợ nhà cung cấp mô hình embedding bên ngoài tùy chọn để phát hiện trùng lặp ngữ nghĩa.
- Quy trình sửa chữa (repair) có khả năng đề xuất các bản vá lỗi sau khi báo cáo các tệp bộ nhớ không hợp lệ.

Tiếp theo: quay lại [Trang chủ](../intro.md).
