---
title: save / save-session / observe
sidebar_position: 3
description: Các lệnh ghi — lưu một bộ nhớ, lưu nhiều bộ nhớ từ một phiên và ghi lại ghi chú thô.
---

# save / save-session / observe

Các lệnh ghi đề xuất bộ nhớ thông qua cổng phê duyệt.

## save

```bash
engram save [rule|workflow|knowledge] "<text>"
engram save --role frontend "<text>"
engram save --scope global "<text>"
```

`engram save` nắm bắt ứng viên bộ nhớ đơn tốt nhất, tự động cập nhật một bộ nhớ khớp hoặc tạo bộ nhớ mới, và luôn hiển thị cổng phê duyệt A/B/C trước khi ghi.

Khi `engram save` tìm thấy các bộ nhớ đang hoạt động có liên quan, bản xem trước phê duyệt sẽ báo cáo chúng kèm gợi ý `depends_on` hoặc cảnh báo có thể trùng lặp.

## save-session

```bash
engram save-session
engram ss
engram save-session --query-level 3
engram ss -f
engram ss -f last 50 sessions
engram save-session --file transcript.md
engram save-session --force
```

Dùng `save-session` khi một cuộc tương tác dài tạo ra nhiều ứng viên:

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` là tùy chọn. Chỉ thêm khi nó giải thích vì sao bộ nhớ tồn tại. Các ứng viên còn có thể thêm các trường `DEPENDS_ON`, `LEVEL` hoặc `UPDATE` khi tái cấu trúc các bộ nhớ liên quan.

- `--query-level <n>` — khai thác tối đa n cuộc trò chuyện gần đây giữa người và agent mà có thể truy cập; phải là số nguyên dương; agent không được bịa ra lịch sử không có
- `--force` / `-f` — mọi ứng viên được sinh ra đều được lưu vì con người đã phê duyệt tường minh lối tắt này
- `--file <path>` — dành cho bản ghi phiên hoặc bản tóm tắt dài đã có sẵn trên đĩa

### Kết luận khi lưu (Save verdicts) {#save-verdicts}

Mỗi bản xem trước ứng viên (CLI, MCP và Entry) in một dòng `Verdict:` ngay sau `File:`: `ADD`, `UPDATE <id>`, `SUPERSEDE <id>` hoặc `NOOP duplicate of <id>`. Kết luận mang tính xác định (dùng điểm chống trùng lặp và điểm bộ nhớ liên quan hiện có; không gọi mô hình). `A` và `B` bỏ qua các ứng viên `NOOP` và liệt kê chúng là đã bỏ qua; `A 1,3` ghi đúng các ứng viên có số đó. Phê duyệt một `SUPERSEDE` sẽ ghi `supersedes: [old]` vào bộ nhớ mới và `lifecycle: superseded` vào bộ nhớ cũ, nên `engram load` loại bỏ nó. `--force` và autosave không bao giờ áp dụng `SUPERSEDE`: nó bị hoãn lại cho đến khi bạn chạy lại không có `--force` và rà soát.

<a id="candidate-fields"></a>
### Các trường của ứng viên {#candidate-fields-heading}

Ngoài `CONTEXT`, `DEPENDS_ON`, `LEVEL` và `UPDATE`, một ứng viên có thể mang thêm:

| Trường | Ý nghĩa |
| --- | --- |
| `OBJECTIVE: task` hoặc `durable` | `task` lưu vào [tầng làm việc](#working-memory-promote-and-prune); mặc định là `durable` |
| `SCOPE: workspace` hoặc `global` | Ghi đè phạm vi của lệnh cho ứng viên này. Bản xem trước phê duyệt nêu đích đến ở dòng `Scope:`. Với `--force`, ứng viên có phạm vi nằm ngoài phạm vi của lệnh sẽ bị hoãn lại, không được ghi |
| `APPLIES_TO: <globs>` | Tối đa 8 glob tương đối; bộ nhớ được chèn khi một tệp khớp được đọc hoặc chỉnh sửa |
| `DIRECTIVE: <line>` | Một dòng tối đa 160 ký tự, hiển thị trên thẻ của bộ nhớ |

```text
TYPE: rule | TEXT: Route commands through MediatR. | DIRECTIVE: Route commands through MediatR | APPLIES_TO: src/Api/**
```

Tên trường không phân biệt hoa thường trong định dạng `|`. Trong định dạng nhiều dòng, chúng chỉ được nhận biết khi viết hoa, nên các dòng văn xuôi thông thường như `Scope: the billing module` vẫn là nội dung.

Đối với `/engram take-control --force` hoặc câu tự nhiên `/engram take control force`, slash adapter chuẩn hóa cách diễn đạt, chỉ sinh các ứng viên `TYPE: ... | TEXT: ...` ngắn gọn và để Engram lưu chúng mà không cần lời nhắc phê duyệt lần hai.

<a id="working-memory-promote-and-prune"></a>
## Bộ nhớ làm việc: promote và prune {#working-memory-promote-and-prune-heading}

```bash
engram promote <id>
engram promote workspace:<id>
engram working note "<text>" [--objective "<text>"] [--type knowledge|rule] [--scope workspace|global]
engram working prune --dry-run
engram working prune
```

Một ứng viên `OBJECTIVE: task` đã duyệt được ghi vào `.agents/.engram/working/` (nằm trong gitignore; hoặc `<global>/working/`) với `tier: working`, nội dung `--objective` và `valid_until` = hôm nay + `load.working_ttl_days` (mặc định 14, phạm vi 1 đến 365). Bản xem trước phê duyệt hiển thị `Tier: working (expires <date>)`. Các bộ nhớ làm việc được load, tìm kiếm và định tuyến giống bộ nhớ bền vững cho đến khi hết hạn; sau đó chúng rơi khỏi `load` với lý do bị loại `lifecycle`. Thẻ và nội dung của agent được gắn nhãn `working`.

- `engram promote <id>` hiển thị bản xem trước A/B/C và, khi được phê duyệt, chuyển bộ nhớ sang kho bền vững: bỏ `tier` và `valid_until`, giữ `objective` và tăng `revision`. Các bộ nhớ làm việc đã hết hạn không thể promote. Dùng `workspace:<id>` hoặc `global:<id>` khi cả hai phạm vi cùng có một id.
- `engram working prune` xóa các bộ nhớ làm việc có `valid_until` đã qua và dựng lại chỉ mục, hash và đồ thị; `--dry-run` liệt kê chúng trước. Bộ nhớ bền vững không bao giờ bị đụng tới.
- `engram working note "<text>"` lưu một ghi chú tác vụ (`source: note`, kiểu mặc định `knowledge`, cho phép `--type rule`) vào tầng làm việc. Văn bản được che thông tin nhạy cảm và các dòng giống chỉ thị bị từ chối. Một lời nhắc Y/C kiểm soát việc ghi và hủy thì không ghi gì. Một ghi chú không bao giờ cập nhật bộ nhớ bền vững có cùng id. Khi bắt đầu phiên, nó bị bỏ qua trừ khi `ENGRAM_SESSION_OBJECTIVE` khớp với `--objective` của ghi chú; nếu không, nó hiển thị dưới dạng thẻ. Promote nó bằng `engram promote <id>`.

Các bộ nhớ làm việc không bao giờ đến Git, và các mục chỉ mục, đồ thị và hash của chúng nằm trong các sidecar cục bộ dưới `working/`.

## observe

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` lưu các ghi chú thô đã được làm sạch vào `inbox/`. Ghi chú trong inbox không phải bộ nhớ đang hoạt động. Dùng cách này khi muốn giữ lại các ghi chú sơ lược trước khi quyết định cái gì nên trở thành bộ nhớ bền vững.

<!-- evidence-foundation:v3:start -->
## Bộ nhớ có bằng chứng {#evidence-backed-memory}

```bash
engram observe --file session.md
# Output includes Trace: tr_... and the inbox wrapper path
engram save-session --file .agents/.engram/inbox/<observation>.md
```

Nguồn bất biến nằm tại `.agents/.engram/traces/<trace-id>.jsonl`; tệp Markdown trong inbox chỉ là lớp bọc để rà soát. Khi promote, Engram mở lại dấu vết và ghi bộ nhớ đã duyệt kèm `evidence_refs` và `derived_from`. `engram observe --propose --file session.md` có thể vào ngay luồng phê duyệt thông thường, nhưng vẫn dùng dấu vết l00m bằng chứng nguồn. `engram observe --queue [--dry-run] [--limit n]` xử lý hàng đợi bản ghi phiên `SessionEnd` (tùy chọn bật) thành các dấu vết đã làm sạch và lớp bọc inbox tương tự, và không ghi bộ nhớ nào.
<!-- evidence-foundation:v3:end -->

## Gợi ý về bộ nhớ liên quan {#related-memory-hints}

Khi một lần chạy accept-all báo cáo các bộ nhớ liên quan trước khi ghi, chưa có tệp nào được lưu. Agent nên chạy lại với các ứng viên có cấu trúc:

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## Bước tiếp theo {#next-steps}

- [inject / link / upgrade](inject-link-upgrade.md)
- [Khái niệm: luồng ghi và phê duyệt](../concepts/write-path.md)


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
