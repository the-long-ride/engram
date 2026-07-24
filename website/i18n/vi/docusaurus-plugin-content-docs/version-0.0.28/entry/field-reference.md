---
title: Tài liệu tham khảo trường đầy đủ
sidebar_position: 10
description: Tài liệu tham khảo có thể tìm kiếm cho mọi đầu vào và điều khiển của Entry Web UI.
---

# Tài liệu tham khảo trường đầy đủ

Trang này là tài liệu tham khảo trường chuẩn dành cho người dùng cuối cho mọi đầu vào và điều khiển của Entry Web UI.

## Cách đọc tài liệu tham khảo này

Mỗi trường liệt kê các thông tin sau:

- **Khóa cấu hình** — khóa được sử dụng trong các tệp cấu hình và CLI
- **Điều khiển** — loại đầu vào
- **Mặc định** — giá trị mặc định an toàn
- **Rủi ro** — `normal` (bình thường), `caution` (cẩn trọng), hoặc `risky` (rủi ro)
- **Ghi chú** — trường này có tác dụng gì và khi nào nên thay đổi nó

## Core (Cốt lõi)

| Khóa cấu hình | Điều khiển | Mặc định | Rủi ro | Ghi chú |
| --- | --- | --- | --- | --- |
| `enabled` | nút bật tắt | `true` | risky | Nút bật tắt chính. Tắt sẽ dừng hoạt động của Engram. |
| `scope` | danh sách chọn | `both` | risky | Mục tiêu lưu: `workspace`, `global`, `both`. |
| `read` | danh sách chọn | `auto` | normal | Thời điểm các hook chèn bộ nhớ: `auto`, `startup`, `always`, `manual`, `off`. |
| `proof` | danh sách chọn | `off` | normal | Dòng chứng minh của hook: `off`, `compact`. |
| `global_path` | văn bản | trống | risky | Đường dẫn hệ thống tệp cho bộ nhớ toàn cục. |
| `default_profile` | danh sách chọn | trống | risky | Hồ sơ được sử dụng khi không có hồ sơ nào được đặt rõ ràng. |
| `roles` | vai trò | trống | normal | Tên vai trò được phân tách bằng dấu phẩy để định tuyến. |
| `theme` | danh sách chọn | `dark` | hidden | Cấu hình nội bộ/ẩn. Không hiển thị cho người dùng. |

## Load Routing (Định tuyến tải)

| Khóa cấu hình | Điều khiển | Mặc định | Rủi ro | Ghi chú |
| --- | --- | --- | --- | --- |
| `load.limit` | số 1–32 | `8` | normal | Số lượng bộ nhớ tối đa được trả về bởi tải bình thường. |

## Memory Limits (Giới hạn bộ nhớ)

| Khóa cấu hình | Điều khiển | Mặc định | Rủi ro | Ghi chú |
| --- | --- | --- | --- | --- |
| `memory.rule_line_target` | số 50–200, bước 10 | `70` | normal | Số dòng khuyến nghị cho các quy tắc. |
| `memory.rule_line_hard_limit` | số 50–200, bước 10 | `100` | risky | Số dòng tối đa cứng cho các quy tắc. |

## Graph (Đồ thị)

| Khóa cấu hình | Điều khiển | Mặc định | Rủi ro | Ghi chú |
| --- | --- | --- | --- | --- |
| `graph.enabled` | nút bật tắt | `true` | normal | Bật định tuyến quan hệ/phụ thuộc. |
| `graph.max_related` | số 1–20 | `4` | normal | Giới hạn bộ nhớ liên quan từ các cạnh đồ thị. |
| `graph.min_related_score` | số 0–1, bước 0.01 | `0.22` | normal | Điểm số tương đồng tối thiểu cho các cạnh liên quan. |

## Vector Search (Tìm kiếm Vector)

| Khóa cấu hình | Điều khiển | Mặc định | Rủi ro | Ghi chú |
| --- | --- | --- | --- | --- |
| `vector.enabled` | nút bật tắt | `true` | normal | Bật định tuyến vector cục bộ tùy chọn. |
| `vector.auto_threshold` | số 10–1000 | `100` | normal | Số lượng bộ nhớ để kích hoạt tìm kiếm vector. |
| `vector.candidate_pool` | số 8–100 | `24` | normal | Số lượng ứng viên được xem xét trước khi xếp hạng lại. |
| `vector.dimensions` | số 16–512 | `64` | normal | Số chiều nhúng; xây dựng lại sau khi thay đổi. |

## Rule Variants (Biến thể quy tắc)

| Khóa cấu hình | Điều khiển | Mặc định | Rủi ro | Ghi chú |
| --- | --- | --- | --- | --- |
| `rule_variants.enabled` | nút bật tắt | `false` | normal | Bật các biến thể vai trò/mức độ nghiêm ngặt. |
| `rule_variants.active` | danh sách chọn | `balanced` | normal | Biến thể hoạt động: `light`, `balanced`, `strict`. |

## Live Sync (Đồng bộ trực tiếp)

| Khóa cấu hình | Điều khiển | Mặc định | Rủi ro | Ghi chú |
| --- | --- | --- | --- | --- |
| `live_sync.enabled` | nút bật tắt | `false` | normal | Đồng bộ các tệp ngữ cảnh tác nhân được tạo ra khi lưu. |

## Global Git (Git toàn cục)

| Khóa cấu hình | Điều khiển | Mặc định | Rủi ro | Ghi chú |
| --- | --- | --- | --- | --- |
| `global_git.enabled` | nút bật tắt | `true` | risky | Bật hành vi Git cho bộ nhớ toàn cục. |
| `global_git.remote` | văn bản | `origin` | risky | Tên Git remote; không có khoảng trắng. |
| `global_git.remote_url` | văn bản | trống | risky | URL remote của bộ nhớ toàn cục chia sẻ. |
| `global_git.branch` | văn bản | `main` | risky | Nhánh đích cho đồng bộ hóa. |
| `global_git.auto_sync` | nút bật tắt | `true` | risky | Tự động pull/push. |
| `global_git.auto_resolve` | nút bật tắt | `true` | risky | Tự động xử lý xung đột; xem xét các khác biệt. |

## Pattern Mining (Khai thác mẫu)

| Khóa cấu hình | Điều khiển | Mặc định | Rủi ro | Ghi chú |
| --- | --- | --- | --- | --- |
| `pattern_mining.enabled` | nút bật tắt | `false` | normal | Thử nghiệm tự động trích xuất mẫu lặp lại. |
| `pattern_mining.threshold` | số 1–20 | `3` | normal | Số lần lặp lại trước khi mẫu có hiệu lực. |
| `pattern_mining.lookback_sessions` | số 1–100 | `20` | normal | Số phiên gần đây cần kiểm tra. |

## PR Workflow (Quy trình PR)

| Khóa cấu hình | Điều khiển | Mặc định | Rủi ro | Ghi chú |
| --- | --- | --- | --- | --- |
| `pr_workflow.enabled` | nút bật tắt | `false` | risky | Thử nghiệm quy trình PR của nhóm. |
| `pr_workflow.target_branch` | văn bản | `main` | risky | Nhánh nhận các PR bộ nhớ. |

## Encryption (Mã hóa)

| Khóa cấu hình | Điều khiển | Mặc định | Rủi ro | Ghi chú |
| --- | --- | --- | --- | --- |
| `encryption.enabled` | nút bật tắt | `false` | risky | Chế độ mã hóa nâng cao/tương lai. |
| `encryption.scope` | danh sách chọn | `global` | risky | Phạm vi: `workspace`, `global`. |
| `encryption.key_source` | danh sách chọn | `portable-file` | risky | Chiến lược nguồn khóa; rủi ro mất bản sao lưu. |

## Các điều khiển không phải cấu hình

Xem các trang theo tab cho các điều khiển không phải cấu hình:

- [Tab Connections](connections.md)
- [Tab Profiles](profiles.md)
- [Tab Workspaces](workspaces.md)
- [Tab Core](core.md)
- [Tab Memories](memories.md)
- [Tab Runtime](runtime.md)

## Các bước tiếp theo

- [Tab Construct](construct.md)
- [Hướng dẫn biên soạn trường](field-authoring-guidelines.md)
