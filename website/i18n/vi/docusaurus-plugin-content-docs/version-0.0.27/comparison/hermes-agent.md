---
title: Hermes Agent
sidebar_position: 6
description: Engram so với Hermes Agent — giao thức tệp do con người sở hữu so với bộ nhớ tự trị luôn hoạt động.
---

# Hermes Agent

## Tóm tắt nhanh (TL;DR)

| | Engram | Hermes Agent |
|---|---|---|
| **Triết lý** | Giao thức ưu tiên tệp, do con người sở hữu (tự động hóa là tùy chọn) | Bộ nhớ tự trị, luôn hoạt động |
| **Lưu trữ** | Các tệp Markdown có kiểu cấu trúc trong `.agents/.engram/` | `MEMORY.md` + `USER.md` (giới hạn ký tự cứng) |
| **Mô hình ghi** | Con người phê duyệt theo mặc định (cổng A/B/C; có thể tự động hóa qua quy tắc) | Tác nhân tự ghi chép một cách tự trị |
| **Hồi tưởng** | Theo yêu cầu: `engram load "<task>"` chèn các tệp liên quan | Luôn bật: các tệp cốt lõi được đóng băng vào system prompt mỗi phiên |
| **Tìm kiếm vector** | Sqlite-vec cục bộ tùy chọn (mang tính quyết định, không dựa trên embedding) | Thông qua nhà cung cấp bên ngoài (ví dụ: agentmemory — BM25 + vector) |
| **Đa tác nhân** | Bất kỳ tác nhân đọc tệp nào cũng có thể tiêu thụ bộ nhớ Engram | Hermes cốt lõi là đơn tác nhân; đa tác nhân qua plugin agentmemory |
| **Tính di động** | Git gốc, ưu tiên offline, Markdown thuần túy | Các tệp cục bộ; nhà cung cấp bên ngoài có thể gây khóa đám mây |
| **Chi phí** | Không cần daemon, yêu cầu tính kỷ luật khi lưu (trừ khi tự động hóa) | Tiến trình máy chủ + giao diện xem, REST API, máy chủ MCP |

## Định dạng lưu trữ

**Engram** lưu trữ mỗi bộ nhớ dưới dạng một tệp Markdown có kiểu cấu trúc với frontmatter YAML, kiểm tra tính toàn vẹn mã băm, và đồ thị phụ thuộc tùy chọn (`depends_on`). Chỉ mục JSON, đồ thị và sidecar sqlite-vec đóng vai trò là các lớp tăng tốc — Markdown là nguồn sự thật.

**Hermes** nén tất cả bộ nhớ bền vững vào hai tệp có giới hạn:

- `~/.hermes/memories/MEMORY.md` — ghi chú của tác nhân, giới hạn ở 2.200 ký tự
- `~/.hermes/memories/USER.md` — hồ sơ người dùng, giới hạn ở 1.375 ký tự

Giới hạn ký tự cứng buộc tác nhân phải chọn lọc thay vì tích lũy. Lịch sử phiên có thể tìm kiếm được thông qua SQLite FTS5.

## Mô hình ghi

**Engram** — cổng con người rõ ràng theo mặc định. Tác nhân đề xuất ứng viên; con người phải phê duyệt trước khi bất kỳ thứ gì được ghi vào đĩa. Quét nội dung nhạy cảm và prompt-injection diễn ra tại thời điểm lưu. Người dùng có thể chọn tự động hóa quy trình này bằng cách lưu một quy tắc tự động lưu các bộ nhớ đề xuất mới khi phản hồi hoàn tất.

**Hermes** — tự trị. Tác nhân quyết định ghi cái gì và khi nào, chỉ bị giới hạn bởi các mốc ký tự. Không có sự phê duyệt của con người trong vòng lặp cốt lõi.

## Mô hình hồi tưởng

**Engram** — định tuyến theo yêu cầu. `engram load "<task>"` xếp hạng lại các ứng viên theo thẻ, loại, độ mới, đồ thị và các tín hiệu vector tùy chọn, sau đó chèn một gói thu gọn (mặc định: 8 tệp) vào ngữ cảnh.

**Hermes** — chèn luôn hoạt động. Các tệp cốt lõi được đóng băng vào system prompt khi bắt đầu phiên làm việc. Một nhà cung cấp bên ngoài tùy chọn (ví dụ: agentmemory) chạy một lượt lấy trước (prefetch) trước mỗi lượt LLM và đồng bộ hóa sau đó.

## Khi nào nên sử dụng loại nào

**Sử dụng Engram** khi bạn cần bộ nhớ có thể kiểm toán, do con người đánh giá; chia sẻ trong nhóm qua Git; các đảm bảo về quyền riêng tư; hoặc tính di động không phụ thuộc tác nhân giữa các công cụ (với tùy chọn tự động hóa lưu qua các quy tắc tùy chỉnh).

**Sử dụng Hermes** khi bạn muốn bộ nhớ tự động tích lũy mà không cần tính kỷ luật lưu trữ, chèn ngữ cảnh luôn bật, hoặc một môi trường chạy phong phú hơn với các trình xem, REST API và các backend vector có thể cắm (pluggable).

## Các bước tiếp theo

- [agentmemory](agentmemory.md)
- [Tổng quan so sánh](overview.md)
