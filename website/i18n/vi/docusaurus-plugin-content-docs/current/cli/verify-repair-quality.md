---
title: verify / repair / quality-check
sidebar_position: 6
description: Các lệnh bảo trì — xác minh hash, sửa tệp không hợp lệ, kiểm tra chất lượng và giải quyết xung đột.
---

# verify / repair / quality-check

Các lệnh bảo trì giúp bộ nhớ luôn khỏe mạnh.

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
```

`--usage` đọc `.agents/.engram/usage.json` (cục bộ, nằm trong gitignore) và cho biết agent thực sự lấy những bộ nhớ nào bằng `engram load --id`, cũng như những bộ nhớ đã được chèn nhưng không bao giờ được lấy trong 30 ngày.

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
```

Kiểm tra định tuyến đồ thị trước khi lưu trữ. Chạy `engram graph --rebuild` sau khi chỉnh sửa thủ công.

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
engram benchmark
```

Kiểm tra hồi quy truy xuất.

## Bước tiếp theo {#next-steps}

- [sync / archive](sync-archive.md)
- [Xử lý sự cố vận hành](../operations/troubleshooting.md)
