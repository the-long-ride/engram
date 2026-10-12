---
title: inject / link / upgrade
sidebar_position: 4
description: Các lệnh thiết lập và adapter — khởi tạo workspace, liên kết agent và đối soát sau khi cập nhật gói.
---

# inject / link / upgrade

Các lệnh thiết lập và adapter khởi tạo workspace, liên kết agent và đối soát sau khi cập nhật gói.

## inject

```bash
engram inject
engram inject --scope workspace|global|both
engram inject --global-only --global-path <path>
engram inject --submodule
engram inject --submodule-remote <git-url>
engram inject --global-remote <git-url>
engram inject --global-branch <branch>
engram inject --no-skillset
engram inject --skillset all
engram inject --no-global
```

`engram inject` tạo `.agents/.engram/` và mặc định cài đặt đích Codex dạng gọn. Các tệp do con người viết đã tồn tại sẽ bị bỏ qua.

Inject tương tác hỏi theo thứ tự: có thêm `./.agents/.engram` làm submodule hay không, có dùng đường dẫn Engram global hay không, và có thêm một origin Git global dùng chung hay không.

Dùng `engram update-global-folder <new-path>` hoặc `engram ugf <new-path>` để chỉ cập nhật đường dẫn global đã cấu hình. Các dạng theo kiểu trò chuyện như `engram set global memory path to <new-path>` và `engram move global folder from <old-path> to <new-path>` được chuẩn hóa về cùng một lệnh. Thêm `--move-from-path <old-path>` khi cũng muốn Engram di chuyển toàn bộ thư mục gốc global cũ.

## link

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram link all
engram link list
engram link --all-supported
engram unlink
```

`engram link all` cài đặt tập đích công khai và báo cáo các lý do `SKIPPED` mang tính xác định cho các host chỉ được hỗ trợ một phần, trên các tệp hướng dẫn skillset, cấu hình MCP, slash adapter và hook của agent trong một lần cài đặt thống nhất. `engram unlink` gỡ tất cả những thứ này cùng lúc. `engram unlink --global <target>` chỉ gỡ plugin global do Engram sinh ra; tệp do con người viết được giữ nguyên trừ khi dùng `--force` tường minh.

`engram link claude --session-end` (hoặc `codex`) còn đăng ký thêm một hook lệnh `SessionEnd` tùy chọn, xếp đường dẫn bản ghi phiên vào `session-queue.json` (nằm trong gitignore); mặc định tắt và `engram upgrade` không bao giờ thêm nó. Xử lý hàng đợi bằng `engram observe --queue`; xem [Hooks](../integrations/hooks.md).

## upgrade

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
engram upgrade --self
engram upgrade --memory-only
engram upgrade --global-skillsets-only
engram upgrade --target codex
```

Dùng `engram upgrade` sau khi cài gói Engram mới hơn. Lệnh so sánh các thư mục gốc bộ nhớ đã khởi tạo từ v0.0.8 trở đi với schema của bản phát hành hiện tại và làm mới `HELP.md` được sinh ra, các chỉ mục bộ nhớ, tệp đồ thị, sidecar vector đủ điều kiện, các skillset workspace được sinh ra, khung bộ nhớ global và các skillset agent global đã đăng ký, đồng thời giữ nguyên các tệp do con người viết.

Các lệnh thông thường cũng chạy âm thầm cùng bước đối soát thư mục gốc này một lần cho mỗi phiên bản gói, trừ khi đặt `--no-auto-upgrade` hoặc `ENGRAM_NO_AUTO_UPGRADE=1`.

Dùng `engram upgrade --latest` khi đầu ra của gói mới phải ghi đè các hiện vật agent đã liên kết do Engram quản lý. Đường này áp dụng lại các tệp hướng dẫn workspace đã liên kết, các quy tắc, cấu hình MCP/plugin và các hook được quản lý, đồng thời làm mới các bản cài đặt agent global đã đăng ký bằng các tệp được sinh ra mới nhất.

Chỉ dùng `--force` khi chủ ý thay thế các tệp adapter do Engram sinh ra.

## take-control

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --force
engram take-control --plan --json --kind code
engram take-control --kind code --objective "add billing export"
engram take-control --refresh
engram take-control --from claude-auto-memory --plan
engram take-control --from codex-memories --plan
```

`take-control` là luồng tiếp quản có agent hỗ trợ cho hướng dẫn hiện có của workspace. Nó dựng một gói nguồn gọn từ các tệp như `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, quy tắc Cursor, ghi chú memory-bank và các thư mục cấp cao nhất như `rules/`, `skills/`, `workflows/`, `knowledge/` hoặc `notes/`, kể cả các ghi chú `.txt`.

Các bộ nhớ take-control đã lưu ghi lại `source_files` và `source_hashes`, nên các nguồn không đổi sẽ được bỏ qua ở lần sau.

### Tóm tắt mã và cấu hình {#code-and-config-digests}

`--kind docs|code|config|all` (cho phép danh sách phân tách bằng dấu phẩy; mặc định `docs`, giữ nguyên hành vi ở trên) thêm các bộ trích xuất phát ra một bản tóm tắt ngắn cho mỗi nguồn thay vì văn bản thô:

- **code**: chữ ký được export, dòng đầu của chú thích tài liệu và các import, không bao giờ lấy phần thân. Hướng dẫn hiển thị chúng dưới dạng bản đồ repo theo từng thư mục gồm tên ký hiệu và một dòng import. Quét mã mặc định dùng `--max-sources 40`.
- **config** và các manifest build: các khóa, cùng giá trị chỉ cho các khóa nằm trong danh sách cho phép (`scripts`, tên dependency, `TargetFramework`, `engines`, `name`) và các thông tin về stack.

Mọi bản tóm tắt đều được che dữ liệu nhạy cảm. `.env*` và các tệp thông tin xác thực luôn bị bỏ qua với lý do `secret file`; các tệp được phát hiện lớn hơn 256 KB hoặc trông như nhị phân bị bỏ qua kèm lý do; còn quét mã và cấu hình bỏ qua các thư mục đầu ra build (`bin`, `obj`, `build`, `out`, `target`, `venv` và tương tự) ở mọi độ sâu. `--budget-tokens` (mặc định 6000 cho quét mã và cấu hình; quét tài liệu không có giới hạn trừ khi yêu cầu), `--max-sources` và `--max-chars` giới hạn gói. `--plan --json` in kế hoạch, gồm cả các tệp bị bỏ qua kèm lý do, dưới dạng JSON; `budgetTokens` của nó là `null` với lần quét tài liệu mặc định.

### Ứng viên theo mục tiêu {#objective-aware-candidates}

`--objective "<text>"` đặt tên cho mục tiêu hiện tại. Khi đó hướng dẫn yêu cầu hai loại ứng viên: loại `OBJECTIVE: task` hữu ích cho mục tiêu, và loại `OBJECTIVE: durable` đáng giữ lại về sau. Ngữ pháp ứng viên cũng chấp nhận `SCOPE: workspace|global`, `APPLIES_TO: <globs>` (tối đa 8 glob tương đối) và `DIRECTIVE: <line>` (tối đa 160 ký tự); xem [save-session](save-session.md#candidate-fields). Các ứng viên `OBJECTIVE: task` đã duyệt đi vào [tầng làm việc](save-session.md#working-memory-promote-and-prune).

### Độ mới {#freshness}

Các bộ nhớ mã, cấu hình và manifest ghi lại hash của bản tóm tắt (`source_hash_mode: digest`), nên các chỉnh sửa chỉ về khoảng trắng hoặc chỉ về phần thân không làm chúng lỗi thời; các bộ nhớ tài liệu ghi lại hash của tệp thô. `engram verify --sources` ghi các nguồn đã đổi hoặc bị mất vào `stale.json` (nằm trong gitignore), còn `engram take-control --refresh` chỉ tóm tắt lại các nguồn đó và đề xuất một ứng viên `UPDATE: <id>` cho mỗi bộ nhớ lỗi thời thông qua cổng phê duyệt thông thường. Xem [verify](verify-repair-quality.md#verify).

### Bộ nhớ của host {#host-memories}

`--from claude-auto-memory|codex-memories` nhập kho bộ nhớ cục bộ của host để rà soát thay vì quét workspace. Bộ nhớ tự động của Claude được đọc từ `~/.claude/projects/<project>/memory/` (hoặc `autoMemoryDirectory` từ cài đặt Claude của người dùng hoặc cục bộ; `CLAUDE_CONFIG_DIR` thay thế `~/.claude`), bộ nhớ Codex từ `~/.codex/memories/`; `--dir <path>` ghi đè kho khi không thể tìm thấy một cách rõ ràng. `type: feedback` đề xuất một quy tắc, `project` và `reference` đề xuất kiến thức, còn `type: user`, các tệp không có kiểu và chỉ mục `MEMORY.md` bị bỏ qua. `--from` không thể kết hợp với `--file`, `--include`, `--exclude`, `--kind`, `--all`, `--budget-tokens` hoặc `--refresh`.

Engram không bao giờ ghi vào kho của host. Dữ liệu nhập được che thông tin nhạy cảm và lọc chèn lệnh, đi qua cổng phê duyệt thông thường và ghi `source: host-memory` cùng `source_files` tương đối theo preset (ví dụ `claude-auto-memory/feedback_testing.md`, không bao giờ là đường dẫn trong thư mục home). `engram verify --sources` chỉ kiểm tra độ lệch trên máy giữ kho đó (ở nơi khác nó báo `host memory store not on this machine`). Không có preset cho Gemini.

## metacognize

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --force
```

Dùng `metacognize` khi muốn một AI agent rà soát thư mục bộ nhớ Engram hiện có và đề xuất cấu trúc an toàn hơn thông qua cùng luồng phê duyệt save-session. Agent nên dùng `UPDATE: memory-id` để hợp nhất hoặc dọn lời văn, và `DEPENDS_ON: memory-id` cho các bộ nhớ phân lớp.


## Di chuyển bộ nhớ cũ sang schema v3 {#legacy-memory-migration-to-schema-v3}

`engram upgrade --latest` cũng di chuyển các tệp bộ nhớ v1/v2 đang hoạt động trong workspace và các thư mục gốc global đã cấu hình sang schema v3. Engram giữ nguyên chính xác từng phần thân Markdown, ghi `backups/schema-v3/<memory-file>.pre-v3.bak` (thư mục nằm trong gitignore; `engram repair --move-backups` chuyển các bản sao lưu cũ nằm cạnh bộ nhớ), chỉ điền các metadata mang tính xác định, làm mới các hash toàn vẹn và dựng lại chỉ mục, đồ thị cùng các sidecar vector đủ điều kiện. Engram không bao giờ bịa ra `evidence_refs`; một bộ nhớ không có liên kết dấu vết đã xác minh được đánh dấu `evidence_status: unverified`. Các bộ nhớ không hợp lệ được báo cáo và bỏ qua, các bộ nhớ đã lưu trữ không bị ghi lại, và lần chạy thứ hai là idempotent.

Xem trước mọi thay đổi mà không ghi:

```bash
engram upgrade --latest --plan
```

Chỉ chạy việc di chuyển bộ nhớ, không ghi đè các hiện vật agent đã liên kết:

```bash
engram upgrade --migrate-memories
```

Bỏ qua việc di chuyển bộ nhớ trong một lần nâng cấp latest:

```bash
engram upgrade --latest --no-migrate-memories
```

## Bước tiếp theo {#next-steps}

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [Tổng quan tích hợp agent](../integrations/overview.md)


<!-- configuration-upgrade-inventory -->
## Kiểm kê nâng cấp cấu hình {#configuration-upgrade-inventory}

Sau khi cập nhật gói, hãy chạy `engram upgrade --latest --plan` trước `engram upgrade --latest`. Bản kiểm kê dùng chung quét các bộ nhớ, hướng dẫn, skillset, cấu hình, hook và plugin do Engram quản lý ở cả workspace lẫn global. Các byte do người dùng viết được giữ nguyên; các tệp hỗn hợp không rõ ràng được báo cáo là xung đột. Xem [Nâng cấp cấu hình](../operations/configuration-upgrades.md).
