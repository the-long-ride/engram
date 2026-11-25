---
title: Nhật ký thay đổi
sidebar_position: 5
description: Lịch sử phát hành của Engram.
---

# Nhật ký thay đổi (Changelog)

Lịch sử phát hành Engram nằm trong kho lưu trữ [`CHANGELOG.md`](https://github.com/the-long-ride/engram/blob/main/CHANGELOG.md).

Đối với phiên bản gói hiện tại, xem tại [`package.json`](https://github.com/the-long-ride/engram/blob/main/package.json).

## Phiên bản hiện tại

Phiên bản Engram đã được phát hành hiện tại là `0.1.0`.

## Điểm nổi bật của 0.1.0

- **Truy xuất và tách từ**: BM25F 3 luồng (`title`, `tags`, `body`), 24 cụm khái niệm kết hợp cầu nối đồng xuất hiện trong kho ngữ liệu khi thiếu mỏ neo chính xác, và tách từ Unicode/Tiếng Việt/CJK.
- **Độ mới, sắp xếp và nén khởi động**: tính điểm độ mới/tầng làm việc `knowledgeFreshnessBoost`, sắp xếp tôpô nhận biết chú ý `orderForAgentConsumption`, và nén thẻ khởi động `hookStartupAuto` trong chế độ `read: auto`.
- **Đo lường sử dụng vòng kín**: theo dõi kết quả trong `usage.json` cục bộ (nằm trong gitignore) (`applied`, `corrected` và suy giảm nhiễu sau các lần chèn lặp lại không mang lại giá trị) cùng `engram stats --backfill`.
- **Học phiên Phương án A và ghi chú làm việc**: học xác định tại thời điểm prompt và từ bản ghi phiên vào các bộ nhớ `working/` có thời hạn nằm trong gitignore cùng biên nhận `inbox/r-*.json` chờ duyệt (`engram review inbox|triage|apply|dismiss`), `engram working note` / công cụ MCP `engram_note`, và xếp hàng bản ghi `SessionEnd` tùy chọn (`engram link claude|codex --session-end`).
- **Tiện ích CLI**: `engram status` (`engram stat`), `engram why <id> ["<query>"]`, `engram help --compact`, `engram graph link <parent-id> <child-id...>`, `engram review triage` và `engram benchmark --from-git`.
- **UX Entry Web và bảo mật**: nâng cấp các luồng làm việc trên Entry Web UI và không còn lỗ hổng trong các gói phụ thuộc.

## Nâng cấp

```bash
npm install -g @the-long-ride/engram@latest
engram upgrade
```

Xem chi tiết tại phần [Quy trình phát hành và nâng cấp](release-upgrade.md).
