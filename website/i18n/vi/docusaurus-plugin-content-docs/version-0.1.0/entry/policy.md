---
title: Chính sách tự động lưu
sidebar_position: 5
description: Cấu hình từ chối theo mặc định đối với các thao tác ghi tự động, định mức, thời gian lưu giữ bản hoàn tác, cổng rà soát và metadata bắt buộc.
---

# Chính sách tự động lưu

Tab Construct chỉnh sửa tệp `.agents/engram.policy.json`. Các luồng `engram save` và `engram save-session` thông thường vẫn cần con người phê duyệt; chính sách này chỉ áp dụng cho các ứng viên tự động được kiểm soát rõ ràng theo chính sách.

## Thao tác ghi tự động

### Cho phép tự động lưu {#autonomous-writes-enabled}

Ánh xạ tới `autonomous_writes.enabled`. Mặc định: `false`. Khi bị vô hiệu hóa, không ứng viên nào có thể ghi tự động.

### Chế độ ghi {#autonomous-writes-mode}

Ánh xạ tới `autonomous_writes.mode`. `review_only` hoãn các ứng viên lại để rà soát; `autonomous` cho phép các ứng viên vượt qua tất cả các cổng còn lại được ghi.

### Các loại được phép {#autonomous-writes-allowed-types}

Ánh xạ tới `autonomous_writes.allowed_types`. Các giá trị hợp lệ là `rule`, `skill`, `workflow` và `knowledge`. Bắt buộc phải có ít nhất một loại.

### Các phạm vi được phép {#autonomous-writes-allowed-scopes}

Ánh xạ tới `autonomous_writes.allowed_scopes`. Các giá trị hợp lệ là `workspace` và `global`.

### Các nguồn được phép {#autonomous-writes-allowed-sources}

Ánh xạ tới `autonomous_writes.allowed_sources`. Entry hỗ trợ `autosave`, `agent-hook`, `cli` và `mcp`; các chuỗi nguồn tùy chỉnh không rỗng vẫn hợp lệ trong JSON chính sách.

### Ngưỡng độ tin cậy {#autonomous-writes-confidence-threshold}

Ánh xạ tới `autonomous_writes.confidence_threshold`. Các giá trị hợp lệ là `low`, `medium` và `high`.

### Giới hạn ghi hàng ngày {#autonomous-writes-daily-limit}

Ánh xạ tới `autonomous_writes.daily_limit`. Sử dụng một số nguyên không âm. `0` ngăn chặn mọi thao tác ghi tự động.

### Số ngày lưu giữ bản hoàn tác {#autonomous-writes-rollback-retention-days}

Ánh xạ tới `autonomous_writes.rollback_retention_days`. Sử dụng một số nguyên không âm tương ứng với khoảng thời gian mà các bản ghi kiểm tra chính sách vẫn đủ điều kiện để hoàn tác.

## Cổng rà soát

### Giới hạn số dòng của quy tắc {#review-max-rule-lines}

Ánh xạ tới `review.max_rule_lines`. Các ứng viên quy tắc vượt quá số nguyên dương này sẽ không qua được bước rà soát.

### Điểm chuẩn recall tối thiểu {#review-benchmark-min-recall-at-k}

Ánh xạ tới `review.benchmark_min_recall_at_k`. Sử dụng một số từ `0` đến `1`.

### Bắt buộc có metadata context {#review-mandatory-metadata-context}

Ánh xạ tới `review.mandatory_metadata.context`. Khi được bật, các ứng viên thiếu metadata `context` sẽ không qua được bước rà soát.

### Bắt buộc có metadata triggers {#review-mandatory-metadata-triggers}

Ánh xạ tới `review.mandatory_metadata.triggers`. Khi được bật, các ứng viên thiếu metadata `triggers` sẽ không qua được bước rà soát.

### Bắt buộc có metadata role {#review-mandatory-metadata-role}

Ánh xạ tới `review.mandatory_metadata.role`. Khi được bật, các ứng viên thiếu metadata `role` sẽ không qua được bước rà soát.

## Quy trình CLI

```bash
engram policy init
engram policy validate --json
engram autosave --policy --dry-run
engram policy audit --json
engram policy rollback <audit-id>
```

Hãy dùng dry-run trước khi bật chế độ tự động. Biên nhận kiểm tra chứa mã định danh thay vì phần thân bộ nhớ, và thao tác hoàn tác sẽ lưu trữ bộ nhớ do chính sách ghi lại.

## Các trang liên quan

- [Tab Construct](construct.md)
- [Đường dẫn ghi và phê duyệt](../concepts/write-path.md)
- [Quyền riêng tư, quy tắc bỏ qua và an toàn](../concepts/safety.md)
