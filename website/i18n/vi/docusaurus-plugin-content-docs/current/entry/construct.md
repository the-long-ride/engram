---
title: Tab Construct (Cấu trúc)
sidebar_position: 4
description: Cấu hình mọi trường thời gian chạy (runtime field) của Engram từ tab Construct. Mỗi trường đều có trường hợp sử dụng, mặc định an toàn, xác thực và cảnh báo rủi ro.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Tab Construct

Tab Construct hiển thị mọi trường cấu hình thời gian chạy của Engram, được nhóm chính xác giống như trên giao diện người dùng. Mỗi trường đều có phần mô tả, trường hợp sử dụng, mặc định an toàn, xác thực và cảnh báo rủi ro.

<RiskCallout level="caution">
Các trường được đánh dấu **risky** (rủi ro) có thể vô hiệu hóa Engram, thay đổi mục tiêu lưu, thay đổi hành vi Git hoặc ảnh hưởng đến bảo mật bộ nhớ. Hãy đọc cảnh báo trước khi thay đổi chúng.
</RiskCallout>

## Nhóm Core (Cốt lõi)

### Enabled (Đã bật)

**Khóa cấu hình:** `enabled`  
**Điều khiển:** nút bật tắt  
**Mặc định:** `true`  
**Rủi ro:** risky

Nút bật tắt chính. Tắt tùy chọn này sẽ dừng hoàn toàn hoạt động của Engram. Chỉ sử dụng để tạm thời tắt hoặc thử nghiệm.

### Save Target (Mục tiêu lưu)

**Khóa cấu hình:** `scope`  
**Điều khiển:** chọn — `workspace`, `global`, `both`  
**Mặc định:** `both`  
**Rủi ro:** risky

Kiểm soát nơi lưu các bộ nhớ mới được phê duyệt. Sử dụng `workspace` cho bộ nhớ riêng của kho lưu trữ, `global` cho bộ nhớ cá nhân/nhóm, và `both` cho các cài đặt mới muốn sử dụng cả hai.

### Read Mode (Chế độ đọc)

**Khóa cấu hình:** `read`  
**Điều khiển:** chọn — `auto`, `startup`, `always`, `manual`, `off`  
**Mặc định:** `auto`  
**Rủi ro:** normal

Kiểm soát thời điểm các hook tác nhân chèn ngữ cảnh bộ nhớ. `auto` tải khi bắt đầu phiên và chỉ chèn lại khi ngữ cảnh định tuyến thay đổi. `manual` và `off` làm giảm mức độ tự động hóa nhưng tránh việc phình to ngữ cảnh.

### Proof Mode (Chế độ chứng minh)

**Khóa cấu hình:** `proof`  
**Điều khiển:** chọn — `off`, `compact`  
**Mặc định:** `off`  
**Rủi ro:** normal

Liệu các hook có nối thêm dòng ngắn gọn `Engram proof:` trên mỗi lượt đủ điều kiện hay không. Hữu ích cho việc gỡ lỗi và kiểm tra trực quan.

### Global Memory Path (Đường dẫn bộ nhớ toàn cục)

**Khóa cấu hình:** `global_path`  
**Điều khiển:** văn bản/đường dẫn  
**Mặc định:** trống cho đến khi cấu hình  
**Rủi ro:** risky

Đường dẫn hệ thống tệp cho bộ nhớ toàn cục. Sử dụng một thư mục ổn định thuộc sở hữu của người dùng như `~/Documents/engram`. Tránh các thư mục tạm thời, thư mục công cộng được đồng bộ hóa và các thư mục bạn không có quyền ghi.

<RiskCallout level="risky">
Sử dụng một thư mục công cộng đồng bộ hóa đám mây cho bộ nhớ riêng tư có thể rò rỉ bí mật. Hãy sử dụng một đường dẫn riêng tư hoặc một kho lưu trữ Git riêng tư.
</RiskCallout>

**Tương đương CLI:**

```bash
engram update-global-folder ~/Documents/engram
engram ugf ~/Documents/engram
```

### Default Profile (Hồ sơ mặc định)

**Khóa cấu hình:** `default_profile`  
**Điều khiển:** chọn  
**Mặc định:** trống  
**Rủi ro:** risky

Hồ sơ được sử dụng khi không có hồ sơ nào được cấu hình rõ ràng. Xem thêm [Hồ sơ và giải quyết phạm vi](../concepts/profiles.md).

### Active Roles (Vai trò hoạt động)

**Khóa cấu hình:** `roles`  
**Điều khiển:** nhập vai trò/dấu phẩy  
**Mặc định:** danh sách trống  
**Rủi ro:** normal

Giới hạn và xếp hạng lại bộ nhớ theo vai trò. Sử dụng các tên an sau khớp với định dạng `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$`.

## Nhóm Load Routing (Định tuyến tải)

### Load Limit (Giới hạn tải)

**Khóa cấu hình:** `load.limit`  
**Điều khiển:** số từ 1–32  
**Mặc định:** `8`  
**Rủi ro:** normal

Số bộ nhớ tối đa được trả về bởi một lần tải bình thường. Giá trị thấp hơn làm giảm phình to ngữ cảnh đối với các mô hình ngữ cảnh thấp; giá trị cao hơn giúp ích cho các tác vụ kiến trúc sâu sắc.

## Nhóm Memory Limits (Giới hạn bộ nhớ)

### Rule Line Target (Mục tiêu dòng quy tắc)

**Khóa cấu hình:** `memory.rule_line_target`  
**Điều khiển:** số từ 50–200, bước nhảy 10  
**Mặc định:** `70`  
**Rủi ro:** normal

Kích thước khuyến nghị cho bộ nhớ quy tắc. Các quy tắc ngắn gọn định tuyến tốt hơn các chính sách quá dài.

### Rule Line Hard Limit (Giới hạn cứng dòng quy tắc)

**Khóa cấu hình:** `memory.rule_line_hard_limit`  
**Điều khiển:** số từ 50–200, bước nhảy 10  
**Mặc định:** `100`  
**Rủi ro:** risky

Giới hạn tối đa nghiêm ngặt đối với bộ nhớ quy tắc.

<RiskCallout level="risky">
Việc nâng giới hạn này có thể làm tăng sự phình to của ngữ cảnh và làm giảm chất lượng định tuyến. Hãy giữ cho các quy tắc ngắn gọn.
</RiskCallout>

## Nhóm Graph (Đồ thị)

### graph.enabled

**Điều khiển:** nút bật tắt  
**Mặc định:** `true`  
**Rủi ro:** normal

Bật định tuyến phụ thuộc/quan hệ thông qua `depends_on`, bộ nhớ liên quan và chế độ xem đồ thị.

### graph.max_related

**Điều khiển:** số từ 1–20  
**Mặc định:** `4`  
**Rủi ro:** normal

Giới hạn số lượng bộ nhớ liên quan được kéo qua các tín hiệu đồ thị.

### graph.min_related_score

**Điều khiển:** số từ 0–1, bước nhảy 0.01  
**Mặc định:** `0.22`  
**Rủi ro:** normal

Điểm số tương đồng tối thiểu cho các cạnh liên quan. Tăng lên để có độ chính xác cao hơn, giảm xuống để tăng khả năng truy xuất.

## Nhóm Vector Search (Tìm kiếm Vector)

### vector.enabled

**Điều khiển:** nút bật tắt  
**Mặc định:** `true`  
**Rủi ro:** normal

Bật tùy chọn định tuyến vector cục bộ. Không có sự phụ thuộc vào đám mây.

### vector.auto_threshold

**Điều khiển:** số từ 10–1000  
**Mặc định:** `100`  
**Rủi ro:** normal

Số lượng bộ nhớ tối thiểu để kích hoạt tìm kiếm vector. Các kho lưu trữ bộ nhớ nhỏ có thể không cần tìm kiếm vector.

### vector.candidate_pool

**Điều khiển:** số từ 8–100  
**Mặc định:** `24`  
**Rủi ro:** normal

Số lượng ứng viên mà tìm kiếm vector xem xét trước khi xếp hạng lại. Giá trị cao hơn cải thiện khả năng truy xuất nhưng làm tăng độ trễ.

### vector.dimensions

**Điều khiển:** số từ 16–512  
**Mặc định:** `64`  
**Rủi ro:** normal

Số chiều nhúng cho vector sidecar cục bộ. Thay đổi cấu hình này yêu cầu phải xây dựng lại.

## Nhóm Rule Variants (Các biến thể quy tắc)

### rule_variants.enabled

**Điều khiển:** nút bật tắt  
**Mặc định:** `false`  
**Rủi ro:** normal

Bật các biến thể vai trò/mức độ nghiêm ngặt. Sử dụng khi nhóm cần định tuyến nhẹ nhàng/cân bằng/nghiêm ngặt.

### rule_variants.active

**Điều khiển:** chọn — `light`, `balanced`, `strict`  
**Mặc định:** `balanced`  
**Rủi ro:** normal

Kiểm soát mức độ nghiêm ngặt của các quy tắc tải. `strict` giúp ích cho các mô hình phân khúc thấp hơn; `light`/`balanced` thường phù hợp hơn với các mô hình mạnh hơn.

## Nhóm Live Sync (Đồng bộ trực tiếp)

### live_sync.enabled

**Điều khiển:** nút bật tắt  
**Mặc định:** `false`  
**Rủi ro:** normal

Đồng bộ các tệp ngữ cảnh tác nhân được tạo ra ngay khi lưu.

## Nhóm Global Git (Git toàn cục)

<RiskCallout level="risky">
Tất cả các trường Git toàn cục đều có rủi ro (risky). Chúng kiểm soát lịch sử kiểm tra và hành vi đồng bộ hóa nhóm cho bộ nhớ toàn cục. Hãy xem xét kỹ từng trường trước khi bật.
</RiskCallout>

| Trường | Điều khiển | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| `global_git.enabled` | nút bật tắt | `true` | Bật hành vi Git cho bộ nhớ toàn cục |
| `global_git.remote` | văn bản | `origin` | Tên của Git remote; không chứa khoảng trắng |
| `global_git.remote_url` | văn bản | trống | URL remote của bộ nhớ toàn cục chia sẻ; chấp nhận HTTPS/SSH |
| `global_git.branch` | văn bản | `main` | Nhánh đích cho đồng bộ hóa |
| `global_git.auto_sync` | nút bật tắt | `true` | Hành vi tự động pull/push |
| `global_git.auto_resolve` | nút bật tắt | `true` | Xử lý xung đột tự động — xem xét các khác biệt bộ nhớ |

## Nhóm Pattern Mining (Khai thác mẫu)

| Trường | Điều khiển | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| `pattern_mining.enabled` | nút bật tắt | `false` | Thử nghiệm trích xuất các mẫu lặp đi lặp lại |
| `pattern_mining.threshold` | số từ 1–20 | `3` | Số lần lặp lại tối thiểu trước khi xem xét một ứng viên mẫu |
| `pattern_mining.lookback_sessions` | số từ 1–100 | `20` | Số phiên làm việc gần đây cần kiểm tra |

## Nhóm PR Workflow (Quy trình PR)

| Trường | Điều khiển | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| `pr_workflow.enabled` | nút bật tắt | `false` | Thử nghiệm quy trình PR nhóm cho các thay đổi bộ nhớ |
| `pr_workflow.target_branch` | văn bản | `main` | Nhánh nhận các PR bộ nhớ |

## Nhóm Encryption (Mã hóa)

<RiskCallout level="risky">
Cấu hình mã hóa tồn tại, nhưng tính năng lưu trữ mã hóa chưa được triển khai. Hãy ghi chú rõ ràng các hạn chế hiện tại cho người dùng.
</RiskCallout>

| Trường | Điều khiển | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| `encryption.enabled` | nút bật tắt | `false` | Chế độ mã hóa nâng cao/tương lai |
| `encryption.scope` | chọn — `workspace`, `global` | `global` | Phạm vi áp dụng mã hóa |
| `encryption.key_source` | chọn — `portable-file` | `portable-file` | Chiến lược nguồn khóa; có rủi ro mất bản sao lưu |

## Các bước tiếp theo

- [Tài liệu tham khảo trường đầy đủ](field-reference.md)
- [Tab Profiles](profiles.md)
- [Tab Runtime](runtime.md)
