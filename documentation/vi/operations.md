# Hướng Dẫn Vận Hành

Trang này chứa thông tin chi tiết về cách sử dụng để tệp README có thể duy trì dung lượng ngắn gọn.

## Các Lệnh Được Hỗ Trợ

| Nhu cầu | Câu lệnh |
| --- | --- |
| Tải bộ nhớ tác vụ | `engram load "<tác vụ>"` |
| Tìm kiếm bộ nhớ | `engram search "<chủ đề>"` |
| Lưu một bộ nhớ | `engram save [rule\|workflow\|knowledge] "<nội dung>"` |
| Lưu nhiều bộ nhớ phiên làm việc | `engram save-session` hoặc `engram ss` |
| Khai thác các chat gần đây có thể truy cập | `engram save-session --query-level 3` |
| Phê duyệt toàn bộ đề xuất của phiên | `engram ss -a` |
| Khai thác và phê duyệt chat gần đây | `engram ss -a last 50 sessions` |
| Ghi lại ghi chú thô | `engram observe --file session.md` |
| Chuyển đổi tài liệu/hướng dẫn có sẵn | `engram take-control --all` |
| Xem trước kế hoạch tiếp quản tài liệu | `engram take-control --plan` |
| Kiểm tra định tuyến đồ thị | `engram graph "<chủ đề>"` |
| Kiểm tra mã băm bảo mật | `engram verify` |
| Tìm các tệp bộ nhớ bị lỗi cấu trúc | `engram repair` |
| Lưu trữ bộ nhớ sai lệch | `engram archive --reason "<lý do>" <id-hoặc-tên-tệp>` |
| Điều chỉnh độ mạnh quy tắc | `engram set-rule-variant strict\|balanced\|light\|off` |
| Đặt đích lưu mặc định | `engram set-save-target workspace\|global\|both\|status` |
| Đặt giới hạn tải gọn | `engram set-load-limit 1..32\|status\|reset` |
| Quản lý profile global | `engram profile status\|create\|use\|merge` |
| Sao chép bộ nhớ workspace/global | `engram clone-memory workspace global [--restructure]` |

Sử dụng lệnh `save-session` cho các đề xuất bộ nhớ từ các phiên làm việc dài. Dạng viết tắt: `ss`.
Sử dụng `--query-level <n>` khi con người muốn tác nhân AI khai thác tối đa n phiên chat người-tác nhân gần đây có thể truy cập, thay vì chỉ phiên hiện tại. Cách nói tự nhiên `engram ss -a last 50 sessions` được chuẩn hóa thành `engram save-session --query-level 50 --accept-all`.

Khi số bộ nhớ khớp vượt quá giới hạn tải đã cấu hình, `load` sẽ tinh chỉnh nhóm ứng viên rộng hơn thành gói ngữ cảnh gọn. Tải thông thường hiển thị số đã chọn và tổng số liên quan, ví dụ `loaded 8 memory files / 14 total related memories`. `load --dry-run` hiển thị số lượng ứng viên và các tag gợi ý để thu hẹp; `load --all` chủ động trả về mọi bộ nhớ định tuyến đang hiển thị.

## Profile, Đích Lưu Và Sao Chép

Dùng `set-save-target` để chọn nơi các lần lưu thông thường sẽ ghi vào:

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

Dùng `profile` khi bộ nhớ global cá nhân, công ty hoặc đội nhóm cần được tách riêng:

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

Dùng `clone-memory` để sao chép Markdown đang hoạt động trong `rules/`,
`skills/` và `knowledge/` giữa phạm vi workspace và global:

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
```

(`--restructure` routes cloned memories through save-session-style approval
instead of raw copy.)

## Lưu Phiên Làm Việc (Save Session)

Sử dụng `save-session` khi một tương tác dài tạo ra nhiều ứng viên bộ nhớ:

```text
TYPE: rule | TEXT: Always run tests before release.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

Nếu không có cờ `--accept-all`, Engram sẽ hỏi ứng viên nào cần lưu. Với `ss -a`, mọi ứng viên được tạo ra sẽ được lưu lại vì con người đã phê duyệt rõ ràng cho phím tắt đó.
`--query-level` phải là số nguyên dương. Tác nhân AI chỉ nên dùng các phiên chat mà nó thật sự có thể truy cập và không được bịa lịch sử không có sẵn. `engram ss -a last 50 sessions` dùng `50` làm query level và `-a` làm phê duyệt rõ ràng của con người.

## Tiếp Quản Bộ Nhớ (Take Control)

`take-control` giúp bạn triển khai Engram vào các kho lưu trữ hiện có. Nó quét các hướng dẫn của tác nhân AI, ghi chú, tài liệu và các tệp được chọn, sau đó yêu cầu tác nhân AI tạo ra các ứng viên ngắn gọn.

Các bộ lọc hữu ích:

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
```

Các bộ nhớ được lưu bởi take-control ghi lại `source_files` và `source_hashes`, nhờ đó các nguồn không thay đổi sẽ được bỏ qua trong các lần quét sau.

## Ghi Nhận (Observe)

`observe` lưu trữ các ghi chú thô đã được làm sạch thông tin nhạy cảm vào thư mục `inbox/`. Các ghi chú trong hộp thư đến (inbox) này không phải là bộ nhớ hoạt động.

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<tên_ghi_chú>.md
```

Sử dụng tính năng này khi bạn muốn lưu giữ các ghi chú sơ bộ trước khi quyết định những gì sẽ trở thành bộ nhớ bền vững.

## Sửa Chữa Và Đánh Giá

Sử dụng `repair` sau khi chỉnh sửa thủ công hoặc nhập dữ liệu:

```bash
engram repair
engram rebuild-index
engram verify
```

Sử dụng đồ thị và kiểm tra chất lượng trước khi lưu trữ (archive) bộ nhớ:

```bash
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Tiếp theo: [So sánh và lộ trình phát triển](comparison.md).
