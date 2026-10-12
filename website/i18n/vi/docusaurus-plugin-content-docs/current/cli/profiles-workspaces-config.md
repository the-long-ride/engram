---
title: profiles / workspaces / config
sidebar_position: 5
description: Quản lý profile, nơi lưu, giới hạn tải, chế độ đọc/proof, vai trò và cấu hình runtime.
---

# profiles / workspaces / config

Quản lý profile, nơi lưu, giới hạn tải, chế độ đọc/proof, vai trò và cấu hình runtime.

## profile

```bash
engram profile status
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

Thứ tự phân giải profile là `--profile` tường minh hoặc `ENGRAM_PROFILE`, rồi đến `default_profile` của workspace, rồi đến profile người dùng đang hoạt động. Nếu workspace `W` được ghim vào profile `B` trong khi mặc định của người dùng vẫn là profile `A`, mọi lần load thông thường, load qua MCP và chèn qua hook của agent cho `W` đều đọc bộ nhớ global của profile `B` và không bao giờ đọc profile `A`. Một profile tường minh khác với mặc định của workspace sẽ dùng bộ nhớ global của profile đó và tắt bộ nhớ workspace cho lệnh đó.

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

<a id="load-configuration"></a>
## Cấu hình tải {#load-configuration-heading}

Các khóa này nằm trong khối `load` của `.agents/.engram/engram.config.json`; `engram config set` không chấp nhận chúng.

| Khóa | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `load.disclosure` | `auto` | `auto` mở rộng các kết quả đầu bảng và hiển thị phần còn lại dưới dạng thẻ; `full` giữ nguyên đầu ra không phân tầng |
| `load.expand_top` | `3` | Số nội dung được mở rộng khi dùng disclosure `auto` |
| `load.working_ttl_days` | `14` | Số ngày một bộ nhớ `OBJECTIVE: task` đã duyệt ở lại tầng làm việc (1 đến 365). Cũng có thể sửa trong tab Construct của Entry |

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

Khi `engram set-role ...` hoặc `engram set-rule-variant ...` thành công, CLI trả về một dòng `Agent action:`. Các slash adapter nhận biết Engram và các host MCP nên chạy lại ngay `engram load "<current task/request>"`.

## set-rule-variant

```bash
engram set-rule-variant strict|balanced|light|off|status
```

## config

```bash
engram config view
engram config set <key> <value>
```

### Bảng tham chiếu các cài đặt chính {#key-settings-reference}

| Khóa | Mô tả | Mặc định | Phạm vi / Tùy chọn |
| --- | --- | --- | --- |
| `memory.rule_line_target` | Số dòng mục tiêu được khuyến nghị cho bộ nhớ dạng quy tắc | `70` | `50` đến `200` |
| `memory.rule_line_hard_limit` | Số dòng tối đa cho phép của bộ nhớ dạng quy tắc | `100` | `50` đến `200` |
| `memory.include_author_email` | Ghi `author_email` vào frontmatter của bộ nhớ mới (`author_name` luôn được ghi) | `false` | `true`, `false` |
| `mcp.resource_limit` | Số bộ nhớ mà `resources/list` của MCP trả về ngoài `engram://index`, xếp hạng theo lượt chèn + lượt lấy (chỉ cấu hình JSON; không đặt được bằng `engram config set`) | `20` | `0` đến `200` |
| `load.limit` | Số bộ nhớ tối đa mà lần load thông thường trả về | `8` | `1` đến `32` |
| `hooks.path_rules` | `native` ghi các tệp quy tắc của Claude và Cursor cho các bộ nhớ có `applies_to` và đăng ký `InstructionsLoaded` của Claude; `hook` giữ hook `PreToolUse` của Claude | `native` | `native`, `hook` |
| `rule_variants.enabled` | Bật hoặc tắt việc sinh các biến thể quy tắc | `false` | `true`, `false` |
| `rule_variants.active` | Chế độ biến thể quy tắc đang dùng | `balanced` | `light`, `balanced`, `strict` |
| `graph.enabled` | Bật hoặc tắt định tuyến nhận biết đồ thị | `true` | `true`, `false` |
| `graph.max_related` | Số bộ nhớ liên quan tối đa lấy từ các cạnh đồ thị | `4` | `1` đến `20` |
| `graph.min_related_score` | Điểm tương đồng tối thiểu để thêm cạnh đồ thị | `0.22` | `0.0` đến `1.0` |
| `vector.enabled` | Tìm kiếm vector băm dự phòng ở mức thử nghiệm (không phải embedding ngữ nghĩa) | `false` | `true`, `false` |
| `live_sync.enabled` | Đồng bộ các tệp ngữ cảnh agent được sinh ra khi lưu | `false` | `true`, `false` |
| `global_git.enabled` | Bật tự động đồng bộ repo Git toàn cục | `true` | `true`, `false` |
| `global_git.remote` | Tên remote Git dùng cho đồng bộ global | `origin` | Chuỗi |
| `global_git.branch` | Tên nhánh Git dùng cho đồng bộ global | `main` | Chuỗi |

Các cài đặt này cũng có thể quản lý trực quan trong tab **Construct** của `engram entry`.

## Bước tiếp theo {#next-steps}

- [verify / repair / quality-check](verify-repair-quality.md)
- [Entry Web UI: tab Construct](../entry/construct.md)


## Danh tính tác giả Git {#git-author-identity}

Engram có thể lưu một tác giả toàn cục và một ghi đè tùy chọn theo workspace. Thứ tự phân giải là workspace, rồi global, rồi phương án dự phòng chỉ đọc từ Git. Các cài đặt chỉ ảnh hưởng đến bộ nhớ trong tương lai; ghi đè theo workspace không bao giờ thay đổi cấu hình Git toàn cục. Hãy dùng bước lập kế hoạch và xác nhận tường minh cho việc đồng bộ Git toàn cục hoặc di chuyển bộ nhớ cũ.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Đọc [hướng dẫn cài đặt tác giả Git](../operations/git-author-settings.md) đầy đủ.
