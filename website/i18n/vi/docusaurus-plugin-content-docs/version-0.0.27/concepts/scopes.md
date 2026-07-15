---
title: Bộ nhớ Workspace so với bộ nhớ Global
sidebar_position: 3
description: Bộ nhớ Workspace luôn thắng thế. Bộ nhớ Global là phương án dự phòng cho các tùy chọn có thể tái sử dụng và ngữ cảnh nhóm trên các dự án.
---

# Bộ nhớ Workspace so với bộ nhớ Global

Engram phân giải bộ nhớ trong hai phạm vi (scopes).

## Bộ nhớ Workspace (Workspace memory)

Bộ nhớ Workspace nằm ở:

```text
<project>/.agents/.engram/
```

Nó chứa các quy tắc, quyết định và quy trình làm việc dành riêng cho dự án. Bộ nhớ Workspace sẽ thắng thế các mục trùng lặp toàn cục.

## Bộ nhớ Global (Global memory)

Bộ nhớ Global là tùy chọn và nằm ở bất kỳ đâu người dùng định cấu hình cho nó. Nó chứa các tùy chọn và ngữ cảnh nhóm đồng hành cùng bạn trên nhiều kho lưu trữ (repos).

```bash
engram inject --global-only --global-path ~/Documents/engram
```

Bộ nhớ Global là dự phòng cho các tùy chọn có thể tái sử dụng, thói quen cá nhân hoặc các giá trị mặc định của toàn nhóm.

## Ưu tiên phạm vi

1. Bộ nhớ Workspace: `<project>/.agents/.engram/`
2. Bộ nhớ Global: `$ENGRAM_GLOBAL_DIR` hoặc `engram inject --global-path <path>`

Bộ nhớ Workspace luôn thắng thế. Bộ nhớ Global là phương án dự phòng cho các tùy chọn có thể tái sử dụng và ngữ cảnh nhóm trên các dự án.

## Chọn mục tiêu lưu

Sử dụng `set-save-target` để chọn nơi lưu trữ thông thường hướng tới:

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

Các lượt cài đặt workspace mới mặc định lưu thông thường vào cả workspace và global khi bộ nhớ global được định cấu hình. Các agent có thể ghi đè một thao tác ghi bằng `--scope workspace|global|both`.

Nếu phạm vi cấu hình đang hoạt động được đặt thành `global` (`scope: "global"`), việc liên kết skillset ở cấp độ workspace sẽ bị vô hiệu hóa và bỏ qua để ngăn việc ghi các tệp vào thư mục đang chạy. Để liên kết các agent trong thiết lập phạm vi toàn cục, hãy sử dụng `engram link --global`.

## Bước tiếp theo

- [Hồ sơ và phân giải phạm vi](profiles.md)
- [Đường dẫn đọc và định tuyến](read-path.md)
