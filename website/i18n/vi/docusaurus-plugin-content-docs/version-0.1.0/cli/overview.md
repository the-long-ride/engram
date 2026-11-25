---
title: Tổng quan lệnh
sidebar_position: 1
description: Bản đồ mọi lệnh CLI của Engram và chức năng của từng lệnh.
---

# Tổng quan lệnh

Chạy `engram -h` hoặc `engram help --compact` để xem bề mặt lệnh dạng gọn. Chạy `engram help <topic>` hoặc `engram -h <topic>` để xem ví dụ và các trường hợp sử dụng riêng của từng lệnh.

## Bản đồ lệnh {#command-map}

| Nhu cầu | Lệnh |
| --- | --- |
| Tóm tắt nhanh sức khỏe workspace/bộ nhớ | `engram status` (bí danh `engram stat`) |
| Tóm tắt lệnh dạng gọn | `engram help --compact` |
| Tải bộ nhớ cho tác vụ | `engram load "<task>"` |
| Tải bộ nhớ tác vụ dạng gọn | `engram load "<task>"` |
| Giải thích vì sao một bộ nhớ được hoặc không được định tuyến | `engram why <id> ["<query>"]` |
| In hướng dẫn sử dụng dành cho AI agent | `engram llm` |
| Xem trước các tệp bộ nhớ được định tuyến | `engram load --dry-run "<task>"` |
| Tải với giới hạn token | `engram load --budget-tokens 800 "<task>"` |
| In mọi nội dung đã đóng gói | `engram load --disclosure full "<task>"` |
| Lấy thẻ theo id | `engram load --id <id>,<id>` |
| Tìm kiếm bộ nhớ | `engram search "<topic>"` |
| Lưu một bộ nhớ | `engram save [rule\|workflow\|knowledge] "<text>"` |
| Lưu nhiều bộ nhớ từ phiên | `engram save-session` hoặc `engram ss` |
| Khai thác các cuộc trò chuyện gần đây có thể truy cập | `engram save-session --query-level 3` |
| Buộc lưu các ứng viên của phiên | `engram ss -f` |
| Khai thác và buộc lưu các cuộc trò chuyện gần đây | `engram ss -f last 50 sessions` |
| Ghi lại ghi chú thô | `engram observe --file session.md` |
| Chắt lọc bài học vào bộ nhớ làm việc + biên nhận inbox | `engram observe --learn [--file <path> \| --git [range]]` |
| Xử lý hàng đợi bản ghi SessionEnd (tùy chọn bật) | `engram observe --queue --dry-run` |
| Rà soát các biên nhận học tập chờ duyệt | `engram review inbox\|triage\|apply\|dismiss` |
| Chuyển đổi tài liệu/hướng dẫn hiện có | `engram take-control --all` |
| Xem trước việc tiếp quản nguồn | `engram take-control --plan` |
| Tóm lược mã hoặc cấu hình | `engram take-control --kind code --objective "<text>"` |
| Làm mới bộ nhớ lấy từ mã đã lỗi thời | `engram take-control --refresh` |
| Kiểm tra độ mới của nguồn | `engram verify --sources` |
| Giữ lại một bộ nhớ làm việc | `engram promote <id>` |
| Lưu ghi chú tác vụ | `engram working note "<text>"` |
| Dọn bộ nhớ làm việc đã hết hạn | `engram working prune [--dry-run]` |
| Xem số lần lấy, chèn và kết quả sử dụng | `engram stats --usage` |
| Bổ sung dữ liệu đo lường sử dụng từ lịch sử commit Git | `engram stats --backfill [--git <range>] [--limit <n>]` |
| Tái cấu trúc thư mục bộ nhớ hiện có | `engram metacognize --workspace\|--global\|--all` |
| Giải quyết xung đột và metacognize | `engram resolve-conflicts --metacognize` |
| Kiểm tra định tuyến đồ thị | `engram graph "<topic>"` |
| Liên kết phụ thuộc cha/con trong đồ thị | `engram graph link <parent-id> <child-id...>` |
| Tạo bộ kiểm thử benchmark từ lịch sử Git | `engram benchmark --from-git [--out <path>]` |
| Kiểm tra hash | `engram verify` |
| Tìm các tệp bộ nhớ bị lỗi định dạng | `engram repair` |
| Lưu trữ bộ nhớ sai | `engram archive --reason "<why>" <id-or-file>` |
| Chỉnh độ mạnh của quy tắc | `engram set-rule-variant strict\|balanced\|light\|off` |
| Đặt nơi lưu mặc định | `engram set-save-target workspace\|global\|both\|status` |
| Đặt giới hạn tải dạng gọn | `engram set-load-limit 1..32\|status\|reset` |
| Đặt chế độ đọc tự động của hook | `engram set-read startup\|auto\|always\|manual\|off\|status` |
| Đặt mức hiển thị dòng proof của hook | `engram set-proof off\|compact\|status` |
| Cài hook cho agent | `engram link codex\|claude\|gemini\|opencode\|cursor\|windsurf` |
| Quản lý profile toàn cục | `engram profile status\|list\|create\|use\|merge` |
| Sao chép bộ nhớ workspace/global | `engram clone-memory workspace global [--metacognize]` |

## Khám phá lệnh {#command-discovery}

```bash
engram help save-session
engram help set-role
engram -h set-rule-variant
```

Mọi lệnh được liệt kê trong phần trợ giúp đều có bí danh ngắn. Bí danh dùng cùng hành vi CLI và cùng các cổng phê duyệt như lệnh chính tắc.

## Tự hoàn thành lệnh trong shell {#shell-completion}

```bash
engram completion bash
engram completion zsh
engram completion powershell
```

## Bước tiếp theo {#next-steps}

- [load / search / graph](load-search-graph.md)
- [save / save-session / observe](save-session.md)
- [inject / link / upgrade](inject-link-upgrade.md)


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
