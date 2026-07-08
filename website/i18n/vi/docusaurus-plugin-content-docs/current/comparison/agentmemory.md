---
title: agentmemory
sidebar_position: 3
description: Engram so với rohitg00/agentmemory — giao thức tệp so với công cụ bộ nhớ tự động.
---

# agentmemory

[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) là một công cụ bộ nhớ tự động mạnh mẽ dành cho các tác nhân lập trình. Tài liệu giới thiệu (README) của nó trình bày bộ nhớ dựa trên máy chủ, tích hợp MCP/hooks/REST, nhiều bộ chuyển đổi tác nhân, các công bố về benchmark, giao diện xem, phát lại (replay), truy xuất hỗn hợp và tích hợp Hermes.

Sử dụng agentmemory khi bạn muốn thu thập tự động, giao diện xem/phát lại trực tiếp, truy xuất vector, nhiều công cụ MCP và bộ nhớ chia sẻ dạng máy chủ.

Sử dụng Engram khi bạn muốn bộ nhớ là một giao thức mà kho lưu trữ có thể đọc được: Markdown trước tiên, con người phê duyệt, Git đánh giá, và có thể mang đi giữa các tác nhân ngay cả khi không có máy chủ đang chạy.

| Chiều hướng | Engram | agentmemory |
| --- | --- | --- |
| Nguồn sự thật | Các tệp Markdown được phê duyệt | Máy chủ/kho lưu trữ bộ nhớ |
| Ranh giới tin cậy | Cổng phê duyệt A/B/C của con người | Thu thập tự động cộng với quản trị công cụ |
| Chế độ mặc định | Giao thức tệp, không yêu cầu daemon | Khuyến nghị dịch vụ đang chạy |
| Đánh giá | Git diff và đánh giá Markdown | Trình xem/API và các phiên được lưu trữ |
| Phù hợp nhất | Các nhóm cần quyền sở hữu và tính kiểm toán | Người dùng muốn tự động hồi tưởng và phát lại |
| Rủi ro | Đòi hỏi tính kỷ luật thủ công nhiều hơn | Trạng thái vô hình nhiều hơn trừ khi được quản lý cẩn thiện |

## Các bước tiếp theo

- [Hermes Agent](hermes-agent.md)
- [Tổng quan so sánh](overview.md)
