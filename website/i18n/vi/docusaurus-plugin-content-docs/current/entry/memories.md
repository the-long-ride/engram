---
title: Memories tab
sidebar_position: 6
description: Inspect the memory graph, preview memories, edit, and archive.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Memories tab

The Memories tab inspects active memory, explores its graph, and performs maintenance actions.

## Search

Use the search field to match text anywhere in each Markdown memory file. The search is case-insensitive and works together with the scope and type filters.

The search mode menu has two options:

- **Text matches only** shows memories whose file content or metadata directly matches the query.
- **Text matches + related memories** also shows connected dependency, duplicate, and semantic memories.

Clear the field to restore the full graph for the selected filters.

## Bộ mô phỏng định tuyến

Dùng thanh **Simulate route** để kiểm thử cách Engram định tuyến một truy vấn trước khi agent nhìn thấy. Khi gửi truy vấn, giao diện gọi `/api/recall?simulate=true` và phân tích chi tiết:

- **Packed bodies** — các bộ nhớ được đưa đầy đủ nội dung vào payload định tuyến
- **Cards** — các thẻ bộ nhớ rút gọn đi kèm với phần nội dung đầy đủ
- **Omitted candidates** — các bộ nhớ khớp truy vấn nhưng bị loại do thứ hạng hoặc giới hạn ngân sách
- **Token budget** — mức sử dụng ngân sách token trên toàn bộ phản hồi mô phỏng truy xuất

## Scope chips {#scope-chips}

Filter the graph by memory source. Compare workspace vs global memory. Start with the current workspace only when the graph feels noisy.

## Type chips {#type-chips}

Filter the graph by memory type. Inspect rules, skills, or knowledge separately.

## Semantic links toggle {#semantic-links-toggle}

Shows semantic graph edges. Turn off when the graph is visually noisy.

## Refresh / rebuild

Reloads or rebuilds graph data. Use after edits, imports, archive actions, or config changes.

## Memory preview

Reads selected memory content. Useful to audit what the agent will receive.

<RiskCallout level="caution">
Sensitive local content may be visible in the browser. Treat the panel as open while previewing.
</RiskCallout>

## Edit memory

Opens the file in an editor and copies the path. Use for manual correction or review. The source of truth is the Markdown file.

## Huy hiệu Working và Noisy

Thẻ và bảng chi tiết bộ nhớ hiển thị các huy hiệu trạng thái để làm nổi bật những bộ nhớ cần chú ý:

- **Working** — đánh dấu các bộ nhớ đang hoạt động nằm trong tầng `working/` (trong gitignore). Dùng nút **Promote** (gọi ngay `POST /api/memory/promote`) để chuyển bộ nhớ `working/` sang kho lưu trữ bền vững mà không cần chuyển sang CLI.
- **Noisy** — gắn cờ các bộ nhớ thường xuyên khớp nhưng không mang lại giá trị để bạn thu hẹp điều kiện kích hoạt, chỉnh sửa hoặc lưu trữ chúng.

## Lưu trữ bộ nhớ

Loại bộ nhớ khỏi định tuyến đang hoạt động nhưng vẫn giữ lại trong `archive/`. Khi nhấn lưu trữ, hộp thoại xác nhận **Delete memory?** sẽ mở ra (không có ô nhập lý do; thao tác tự động ghi lý do mặc định `'Deleted from Memories graph view'`). Hãy dùng lưu trữ thay vì xóa thủ công để đảm bảo khả năng kiểm toán.

<RiskCallout level="caution">
Archiving changes routing immediately. Use archive, not manual deletion, so history is preserved.
</RiskCallout>

<!-- evidence-foundation:v3:start -->
## Bộ nhớ có bằng chứng

The detail panel mirrors CLI/index metadata. It shows `authority`, `revision`, `evidence_refs`, `derived_from`, `supersedes`, `superseded_by`, `valid_from`, `valid_until`, and `last_confirmed` when present. These fields explain why a memory exists and which immutable trace supports it; the Web UI does not turn evidence into an instruction.
<!-- evidence-foundation:v3:end -->

## CLI equivalent

```bash
engram graph "<topic>"
engram why <id> "<query>"
engram promote <id>
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

## Next steps

- [Core tab](core.md)
- [CLI: verify / repair / quality-check](../cli/verify-repair-quality.md)
