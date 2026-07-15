---
title: profiles / workspaces / config
sidebar_position: 5
description: Quản lý hồ sơ, đích lưu, giới hạn tải, chế độ đọc/bằng chứng, vai trò và cấu hình thời gian chạy.
---

# profiles / workspaces / config

Quản lý hồ sơ, đích lưu, giới hạn tải, chế độ đọc/bằng chứng, vai trò và cấu hình thời gian chạy.

## profile

```bash
engram profile status
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

Thứ tự phân giải hồ sơ là `--profile` rõ ràng hoặc `ENGRAM_PROFILE`, sau đó là `default_profile` của không gian làm việc, rồi hồ sơ người dùng đang hoạt động. Nếu không gian làm việc `W` được ghim vào hồ sơ `B` trong khi mặc định của người dùng vẫn là hồ sơ `A`, mọi lượt tải thông thường, tải MCP và chèn hook tác nhân cho `W` sẽ đọc bộ nhớ toàn cục của hồ sơ `B` và không bao giờ đọc hồ sơ `A`. Một hồ sơ rõ ràng khác với mặc định không gian làm việc sẽ sử dụng bộ nhớ toàn cục của hồ sơ đó và tắt bộ nhớ không gian làm việc cho lệnh đó.

## set-save-target

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

## set-load-limit

```bash
engram set-load-limit 1..32
engram set-load-limit status
engram set-load-limit reset
```

## set-read

```bash
engram set-read startup|auto|always|manual|off
engram set-read status
```

## set-proof

```bash
engram set-proof off|compact
engram set-proof status
```

## set-role

```bash
engram set-role frontend
engram set-role backend security
engram set-role
```

Khi `engram set-role ...` hoặc `engram set-rule-variant ...` thành công, CLI sẽ trả về một dòng `Agent action:`. Các bộ chuyển đổi slash và host MCP nhận biết Engram nên chạy lại ngay lập tức `engram load "<current task/request>"`.

## set-rule-variant

```bash
engram set-rule-variant strict|balanced|light|off
```

## config

```bash
engram config view
engram config set <key> <value>
```

### Tham chiếu thiết lập chính

| Khóa | Mô tả | Mặc định | Phạm vi / Tùy chọn |
| --- | --- | --- | --- |
| `memory.rule_line_target` | Mục tiêu số dòng đề xuất cho bộ nhớ quy tắc | `70` | `50` đến `200` |
| `memory.rule_line_hard_limit` | Giới hạn số dòng tối đa cho phép đối với bộ nhớ quy tắc | `100` | `50` đến `200` |
| `load.limit` | Số bộ nhớ tối đa được trả về bởi tải thông thường | `8` | `1` đến `32` |
| `rule_variants.enabled` | Bật hoặc tắt tính năng tạo các biến thể quy tắc | `true` | `true`, `false` |
| `rule_variants.active` | Chế độ biến thể quy tắc đang hoạt động | `balanced` | `light`, `balanced`, `strict` |
| `graph.enabled` | Bật hoặc tắt định tuyến dựa trên đồ thị | `true` | `true`, `false` |
| `graph.max_related` | Số bộ nhớ liên quan tối đa cần lấy từ các cạnh đồ thị | `8` | `1` đến `20` |
| `graph.min_related_score` | Điểm tương đồng tối thiểu để thêm các cạnh đồ thị | `0.3` | `0.0` đến `1.0` |
| `vector.enabled` | Bật hoặc tắt chức năng tìm kiếm vectơ dự phòng | `true` | `true`, `false` |
| `live_sync.enabled` | Đồng bộ hóa các tệp ngữ cảnh tác nhân được tạo khi lưu | `true` | `true`, `false` |
| `global_git.enabled` | Bật tự động hóa đồng bộ hóa kho lưu trữ Git toàn cục | `false` | `true`, `false` |
| `global_git.remote` | Tên remote Git để đồng bộ hóa toàn cục | `origin` | Chuỗi |
| `global_git.branch` | Tên nhánh Git để đồng bộ hóa toàn cục | `main` | Chuỗi |

Các thiết lập này cũng có thể được quản lý trực quan dưới tab **Construct** trong `engram entry`.

## Các bước tiếp theo

- [verify / repair / quality-check](verify-repair-quality.md)
- [Giao diện Web Entry: Tab Construct](../entry/construct.md)
