---
title: Loại bộ nhớ
sidebar_position: 2
description: Bộ nhớ Engram có kiểu — Rule, Skill và Knowledge — để việc định tuyến và rà soát luôn tập trung.
---

# Loại bộ nhớ

Mọi bộ nhớ Engram đang hoạt động đều có một loại. Loại này quyết định cách định tuyến, rà soát và cách bộ nhớ được hiển thị cho agent.

| Loại | Dùng cho |
| --- | --- |
| Rule | sở thích của người dùng, chỉnh sửa, ràng buộc, hướng dẫn luôn/không bao giờ |
| Skill | quy trình lặp lại được, danh sách kiểm tra, thủ tục, runbook |
| Knowledge | sự thức khách quan của dự án, quyết định, chi tiết triển khai |

Các tệp mới dùng `schema_version: 3`. Bộ nhớ dạng rule và skill mặc định có `authority: instruction`; knowledge mặc định có `authority: reference`. `revision` bắt đầu từ 1 và tăng mỗi lần cập nhật. ID của dấu vết thuộc về `evidence_refs`, còn định danh phiên hoặc nguồn thuộc về `derived_from`.

## Bộ nhớ tốt {#good-memory}

Bộ nhớ Engram tốt thì:

- đủ ổn định để còn quan trọng vào tuần sau
- đủ cụ thể để định tuyến về sau
- đủ ngắn để nạp vào ngữ cảnh của agent
- đủ an toàn để chia sẻ trong phạm vi dự kiến
- được viết dưới dạng quy tắc, quy trình hoặc mục kiến thức

Bộ nhớ xấu là nhiễu trò chuyện tạm thời, bí mật, thông tin xác thực, suy đoán một lần, hoặc những điều chưa ai phê duyệt.

## Biến thể quy tắc {#rule-variants}

Engram suy ra cách diễn đạt quy tắc light, balanced và strict tại thời điểm hiển thị từ `## Content` của quy tắc (balanced là nguyên văn Content), nên các tệp quy tắc mới và được viết lại chỉ lưu Content. Phần `## Rule Variants` chỉ được giữ cho cách diễn đạt tùy chỉnh do ứng viên cung cấp bằng `LIGHT:`/`BALANCED:`/`STRICT:`. Chế độ biến thể quy tắc là một "thấu kính" hiển thị cho bộ nhớ hướng tới agent:

- **Strict** giúp các mô hình ở phân khúc thấp hơn giữ được sự kiểm soát.
- Cách diễn đạt **light** hoặc **balanced** thường giúp các mô hình mạnh hơn, để quy tắc không giới hạn khả năng suy luận của chúng.

Khi tắt biến thể, Engram mặc định hiển thị cách diễn đạt quy tắc balanced. Chỉnh bằng:

```bash
engram set-rule-variant strict|balanced|light|off
```

## Đầu ra gọn theo mặc định {#compact-output-by-default}

Khi `engram load "<task>"` chạy, đầu ra mặc định được phân tầng và tinh gọn cho AI agent:

| Khía cạnh | Mặc định (`engram load`) | Đầy đủ (`engram load --full`) |
| --- | --- | --- |
| Frontmatter | Không hiển thị; tiêu đề của phần thân là `### <id> [<type>, <authority>]` cùng `requires: <ids>` | Đầy đủ các trường schema v3 và các trường cũ, gồm nguồn gốc, revision, thay thế và hiệu lực |
| Disclosure | Các kết quả `load.expand_top` đầu tiên dưới dạng nội dung, các kết quả khác là thẻ một dòng (`- <id> [<type>] <directive-or-summary>`), rồi một gợi ý `fetch:` | Mọi nội dung đã đóng gói |
| Nội dung rule | Một biến thể được chọn | Content, cộng phần `## Rule Variants` đã lưu chỉ khi tệp có biến thể tùy chỉnh |
| Các phần khác | `## Context`, `## Example` và `## Origin` không được hiển thị | Cùng nội dung, giữ nguyên tiêu đề |

`engram_load` của MCP và các hook mặc định dùng đầu ra phân tầng. Truyền `full: true` trên công cụ MCP hoặc `engram load --full "<task>"` khi cần đầu ra cũ rộng hơn.

## Các trường định tuyến tùy chọn {#optional-routing-fields}

Các trường frontmatter này là tùy chọn; một bộ nhớ không có chúng vẫn hoạt động như trước và `schema_version` vẫn là 3.

| Trường | Ý nghĩa |
| --- | --- |
| `directive` | Một dòng tối đa 160 ký tự; hiển thị trên thẻ và được tính trọng số khi xếp hạng |
| `applies_to` | Danh sách glob; chèn bộ nhớ khi một tệp khớp được đọc hoặc chỉnh sửa và tính là một neo mạnh |
| `tier` | `durable` (mặc định) hoặc `working` (theo tác vụ, nằm trong gitignore, có hạn) |
| `objective` | Tối đa 200 ký tự; mục tiêu mà bộ nhớ làm việc được viết cho |
| `valid_until` | Ngày hết hạn; bộ nhớ làm việc nhận hôm nay + `load.working_ttl_days` |

<!-- evidence-foundation:v3:start -->
## Bộ nhớ có bằng chứng {#evidence-backed-memory}

Các tệp mới dùng `schema_version: 3`. Bộ nhớ dạng rule và skill mặc định có `authority: instruction`; knowledge mặc định có `authority: reference`. `revision` bắt đầu từ 1 và tăng mỗi lần cập nhật. ID của dấu vết thuộc về `evidence_refs`, còn định danh phiên hoặc nguồn thuộc về `derived_from`. v1 cũ (`Context` + `Content` + `Example`) và v2 (`Content`, `Origin` tùy chọn) vẫn đọc được.
<!-- evidence-foundation:v3:end -->

## Bước tiếp theo {#next-steps}

- [Bộ nhớ workspace so với global](scopes.md)
- [Đường đọc và định tuyến](read-path.md)


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


<!-- configuration-upgrade-inventory -->
## Kiểm kê nâng cấp cấu hình {#configuration-upgrade-inventory}

Sau khi cập nhật gói, hãy chạy `engram upgrade --latest --plan` trước `engram upgrade --latest`. Bản kiểm kê dùng chung quét các bộ nhớ, hướng dẫn, skillset, cấu hình, hook và plugin do Engram quản lý ở cả workspace lẫn global. Các byte do người dùng viết được giữ nguyên; các tệp hỗn hợp không rõ ràng được báo cáo là xung đột. Xem [Nâng cấp cấu hình](../operations/configuration-upgrades.md).
