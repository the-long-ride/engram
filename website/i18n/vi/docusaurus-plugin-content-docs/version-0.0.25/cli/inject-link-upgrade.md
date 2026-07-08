---
title: inject / link / upgrade
sidebar_position: 4
description: Các lệnh thiết lập và adapter — khởi tạo không gian làm việc, liên kết tác nhân và đối soát sau khi cập nhật gói.
---

# inject / link / upgrade

Các lệnh thiết lập và adapter khởi tạo không gian làm việc, liên kết tác nhân và đối soát sau khi cập nhật gói.

## inject

```bash
engram inject
engram inject --global-only --global-path <path>
engram inject --submodule
engram inject --submodule-remote <git-url>
engram inject --global-remote <git-url>
engram inject --no-skillset
engram inject --skillset all
```

`engram inject` tạo ra `.agents/.engram/` và cài đặt mục tiêu Codex thu gọn theo mặc định. Các tệp hiện tại do con người viết sẽ được bỏ qua.

Lệnh inject tương tác sẽ hỏi theo thứ tự này: có muốn thêm `./.agents/.engram` dưới dạng submodule hay không, có sử dụng đường dẫn Engram toàn cục hay không, và có muốn thêm nguồn Git toàn cục dùng chung hay không.

Sử dụng `engram update-global-folder <new-path>` hoặc `engram ugf <new-path>` để chỉ cập nhật đường dẫn toàn cục đã được cấu hình. Các dạng chat như `engram set global memory path to <new-path>` và `engram move global folder from <old-path> to <new-path>` được chuẩn hóa về cùng một lệnh. Thêm `--move-from-path <old-path>` khi họ cũng muốn Engram di chuyển toàn bộ thư mục gốc toàn cục cũ.

## link

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram link all
engram unlink
```

`engram link all` cài đặt tập hợp mục tiêu công khai và báo cáo lý do `SKIPPED` mang tính quyết định cho các host chưa hoàn thiện trên các tệp hướng dẫn bộ kỹ năng, cấu hình MCP, bộ chuyển đổi slash và hook tác nhân trong một lần cài đặt thống nhất. `engram unlink` gỡ bỏ toàn bộ chúng cùng nhau. `engram unlink --global <target>` chỉ gỡ bỏ plugin toàn cục do Engram tạo ra; tệp do con người viết sẽ được bảo tồn trừ khi có cờ `--force` rõ ràng.

## upgrade

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

Sử dụng `engram upgrade` sau khi cài đặt gói Engram mới hơn. Lệnh này so sánh các thư mục gốc bộ nhớ đã khởi tạo từ phiên bản v0.0.8 trở đi với lược đồ phát hành hiện tại và làm mới các tệp `HELP.md` được tạo, chỉ mục bộ nhớ, tệp đồ thị, sidecar vector đủ điều kiện, bộ kỹ năng không gian làm việc được tạo, khung bộ nhớ toàn cục và bộ kỹ năng tác nhân toàn cục đã đăng ký trong khi bảo tồn các tệp do con người viết.

Các lệnh thông thường cũng chạy đối soát thư mục gốc một cách âm thầm một lần cho mỗi phiên bản gói trừ khi `--no-auto-upgrade` hoặc `ENGRAM_NO_AUTO_UPGRADE=1` được thiết lập.

Sử dụng `engram upgrade --latest` khi kết quả đầu ra của gói mới phải ghi đè lên các cấu phần tác nhân liên kết hiện tại do Engram quản lý. Đường dẫn đó sẽ áp dụng lại các tệp hướng dẫn không gian làm việc, quy tắc, cấu hình MCP/plugin và các hook được quản lý, đồng thời làm mới các cài đặt tác nhân toàn cục đã đăng ký với các tệp mới nhất được tạo.

Chỉ sử dụng `--force` khi cố tình thay thế các tệp adapter do Engram tạo ra.

## take-control

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --accept-all
```

`take-control` là quy trình tiếp quản có hỗ trợ của tác nhân dành cho các hướng dẫn không gian làm việc hiện có. Nó xây dựng một gói nguồn nhỏ gọn từ các tệp như `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, quy tắc Cursor, ghi chú ngân hàng bộ nhớ và các thư mục cấp cao nhất như `rules/`, `skills/`, `workflows/`, `knowledge/` hoặc `notes/`, bao gồm cả các ghi chú `.txt`.

Các bộ nhớ được lưu bởi take-control ghi lại `source_files` và `source_hashes` để các nguồn không thay đổi sẽ được bỏ qua sau đó.

## metacognize

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --accept-all
```

Sử dụng `metacognize` khi bạn muốn tác nhân AI xem xét một thư mục bộ nhớ Engram hiện có và đề xuất cấu trúc an toàn hơn thông qua cùng một luồng phê duyệt của save-session. Tác nhân nên sử dụng `UPDATE: memory-id` để hợp nhất hoặc dọn dẹp cách diễn đạt và `DEPENDS_ON: memory-id` cho các bộ nhớ phân lớp.

## Các bước tiếp theo

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [Tổng quan về tích hợp tác nhân](../integrations/overview.md)
