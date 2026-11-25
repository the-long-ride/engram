---
title: verify / repair / quality-check
sidebar_position: 6
description: Các lệnh bảo trì — xác minh hash, sửa tệp không hợp lệ, kiểm tra chất lượng và giải quyết xung đột.
---

# verify / repair / quality-check

Các lệnh bảo trì giúp bộ nhớ luôn khỏe mạnh.

## status

```bash
engram status
engram stat
engram status --json
```

In ra màn hình tổng quan duy nhất về thư mục gốc bộ nhớ workspace và global, profile đang hoạt động, các host đã liên kết, các biên nhận chờ duyệt, số lượng tầng làm việc và tình trạng toàn vẹn/độ mới. `engram stat` là bí danh ngắn, còn `--json` xuất bản chụp có cấu trúc cho script.

## verify

```bash
engram verify
engram verify --sources
engram verify --sources --json
```

Kiểm tra hash để đảm bảo tính toàn vẹn. Hãy chạy sau khi chỉnh sửa thủ công hoặc nhập dữ liệu.

`--sources` còn băm lại `source_files` của các bộ nhớ take-control và so với `source_hashes` của chúng, rồi ghi các nguồn đã thay đổi hoặc bị mất vào `.agents/.engram/stale.json` (cục bộ, nằm trong gitignore). Nguồn lỗi thời không bao giờ làm `verify` thất bại: `load` xếp hạng các bộ nhớ lỗi thời thấp hơn và kết thúc thẻ của chúng bằng ` (stale)`, còn `engram take-control --refresh` đề xuất cập nhật cho chúng. Đường dẫn nguồn phải nằm trong workspace; đường dẫn tuyệt đối, `..`, symlink và hard link, tệp bí mật, `.git` và dữ liệu của Engram được báo cáo là chưa kiểm tra và không bao giờ bị đọc. Trong `--json`, `skipped` liệt kê các đối tượng `{key, reason}`. Một bộ nhớ take-control ở phạm vi global ghi lại workspace mà nó đến từ đó và chỉ được kiểm tra tại đó.

## stats

```bash
engram stats
engram stats --usage
engram stats --backfill [--git <range>] [--limit <n>]
```

`--usage` đọc `.agents/.engram/usage.json` (cục bộ, nằm trong gitignore) và hiển thị số lần lấy (`engram load --id`), các bộ đếm kết quả vòng kín (`applied`, `corrected` và `noisy` / các lần chèn không mang lại giá trị), cũng như những bộ nhớ đã được chèn nhưng không bao giờ được lấy trong 30 ngày. `--backfill` bổ sung dữ liệu đo lường sử dụng lịch sử từ lịch sử commit Git (các commit không phải merge gần đây, qua `backfillUsageFromGit`, có thể giới hạn bằng `[--git <range>] [--limit <n>]`) vào `usage.json`.

## repair

```bash
engram repair
engram rebuild-index
```

Dùng `repair` sau khi chỉnh sửa thủ công hoặc nhập dữ liệu để tìm các tệp bộ nhớ bị lỗi định dạng mà bước dựng lại chỉ mục đã bỏ qua.

```bash
engram repair --move-backups
engram repair workspace --move-backups --confirm
```

`--move-backups` lập kế hoạch di chuyển các bản sao lưu migration `*.bak` nằm rải rác trong `rules`, `skills` và `knowledge` vào thư mục `backups/<kind>-<label>/` (nằm trong gitignore), ví dụ `backups/schema-v3/rules/x.md.pre-v3.bak`. Thêm `--confirm` để thực sự di chuyển; nếu đã có một tệp khác tại đích, nó được báo cáo là xung đột và để nguyên tại chỗ. `engram doctor` báo cáo các tệp này là `memory.stray_backups`.

## quality-check

```bash
engram quality-check
```

Báo cáo gọn các ứng viên mâu thuẫn. Việc phát hiện mâu thuẫn mang tính heuristic và chỉ để tham khảo.

## graph

```bash
engram graph "package manager"
engram graph --rebuild
engram graph link <parent-id> <child-id...>
```

Kiểm tra định tuyến đồ thị trước khi lưu trữ, liên kết các điều kiện tiên quyết `depends_on` tường minh bằng `engram graph link <parent-id> <child-id...>`, hoặc chạy `engram graph --rebuild` sau khi chỉnh sửa thủ công.

## archive

```bash
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Lưu trữ bộ nhớ sai hoặc đã bị thay thế. Hãy dùng archive thay vì xóa để có thể kiểm toán. Tệp chỉ rời khỏi định tuyến đang hoạt động sau khi được phê duyệt và vẫn được giữ trong `archive/`.

## resolve-conflicts

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
```

Xem trước hoặc giải quyết chỉ các xung đột bộ nhớ workspace do Engram sở hữu. Thêm `--metacognize` khi muốn một agent rà soát thư mục bộ nhớ sau khi xử lý xung đột. Lệnh giữ việc xử lý xung đột mang tính xác định trong phạm vi `.agents/.engram/`, rồi nối thêm gói nguồn metacognize của workspace để có các ứng viên `TYPE/TEXT` ngắn gọn.

## benchmark

```bash
engram benchmark <cases.json> --json
engram benchmark <cases.json> --baseline <baseline.json> --fail-on forbidden,recall
engram benchmark <cases.json> --write-report <report.json>
engram benchmark --from-git [--out <path>]
```

Chạy các bộ kiểm tra hồi quy truy xuất có quản lý phiên bản, bao gồm `freshness-ordering` (tăng điểm độ mới và sắp xếp phần thân nhận biết chú ý), `multi-turn-session` (tiết kiệm token của hook qua nhiều lượt) và `telemetry-loop` (đo lường kết quả vòng kín `real-stacks-v1` và suy giảm nhiễu). Dùng `--from-git [--out <path>]` để tổng hợp các trường hợp benchmark cục bộ cho repo từ lịch sử Git gần đây, `--baseline` để so sánh với các chỉ số đã lưu, `--write-report` để ghi báo cáo JSON chỉ chứa ID, và `--fail-on` để làm thất bại CI khi gặp các hồi quy cụ thể.

## Bước tiếp theo {#next-steps}

- [sync / archive](sync-archive.md)
- [Xử lý sự cố vận hành](../operations/troubleshooting.md)
