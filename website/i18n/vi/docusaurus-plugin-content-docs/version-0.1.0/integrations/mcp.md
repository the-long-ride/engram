---
title: Công cụ MCP
sidebar_position: 11
description: Máy chủ MCP của Engram hiển thị các công cụ tải, tìm kiếm và chỉ-đề-xuất cho các máy chủ có khả năng MCP.
---

# Công cụ MCP {#mcp-tools}

Engram đi kèm với một tệp nhị phân máy chủ MCP `engram-mcp` để hiển thị các công cụ cho các máy chủ có khả năng MCP.

## Đăng ký {#registration}

Theo mặc định, `engram link <target>` cũng cài đặt cấu hình đăng ký MCP đã biết cho mục tiêu đó.

| Phạm vi | Đường dẫn |
| --- | --- |
| Claude Code không gian làm việc và các máy chủ khác đọc `.mcp.json` (không bao gồm Codex, vốn chỉ đọc `~/.codex/config.toml`; xem Codex toàn cục) | `.mcp.json` |
| Gemini không gian làm việc | `mcpServers.engram` trong `.gemini/settings.json` |
| Cursor không gian làm việc | `.cursor/mcp.json` |
| OpenCode không gian làm việc | trường `mcp` trong `opencode.json` / `opencode.jsonc` |
| Claude toàn cục | Không phải tệp: Engram in ra lệnh `claude mcp add --scope user engram -- engram-mcp` (Claude Code lưu giữ máy chủ MCP người dùng trong `~/.claude.json`) |
| Gemini toàn cục | `mcpServers.engram` được hợp nhất vào `~/.gemini/settings.json` |
| Codex toàn cục | Khối `[mcp_servers.engram]` được quản lý trong `~/.codex/config.toml` |
| Antigravity toàn cục | Tệp cấu hình MCP của Gemini |
| OpenCode toàn cục | trường `mcp` trong `~/.config/opencode/opencode.jsonc` / `opencode.json` |
| Cursor toàn cục | Được đóng gói trong plugin cục bộ |
| Windsurf toàn cục | `~/.codeium/windsurf/mcp_config.json` |

MCP không gian làm việc cho Windsurf bị bỏ qua vì hợp đồng chính thức chỉ ghi chép cấu hình MCP cấp người dùng.

Lệnh máy chủ là `engram-mcp` khi nó có sẵn trên `PATH`, nếu không sẽ là dạng `npx` được ghim theo bản phát hành đã cài đặt (`npx -y --package @the-long-ride/engram@<version> engram-mcp`); `engram upgrade` và `engram link <host>` sẽ ghim lại các mục hiện có. Unlink chỉ xóa mục nhập hoặc khối được quản lý của Engram và giữ nguyên các máy chủ và khóa khác.

## Các phiên bản giao thức {#protocol-versions}

Một tiến trình `engram-mcp` duy nhất phục vụ hai kỷ nguyên giao thức:

- **Kỷ nguyên cũ (Legacy)**: `initialize` trả về `protocolVersion` của máy khách khi nó là `2024-11-05`, `2025-03-26`, `2025-06-18` hoặc `2025-11-25`, và trả về `2025-11-25` trong các trường hợp khác. Chuỗi phiên bản không xác định sẽ không bao giờ được lặp lại nguyên trạng.
- **MCP 2026-07-28**: yêu cầu có `params._meta` mang `io.modelcontextprotocol/protocolVersion` sẽ được phục vụ phi trạng thái (`server/discover`, `tools/list`, `tools/call`, `resources/*`, `prompts/*`). Yêu cầu cũng phải mang `io.modelcontextprotocol/clientCapabilities` (trả về `-32602` nếu thiếu). Kết quả trả về mang `resultType: "complete"`, và các phương thức danh sách sẽ thêm `ttlMs` và `cacheScope`. Phiên bản hiện đại không được hỗ trợ sẽ trả về `-32022` kèm `data.supported` và `data.requested`; `ping`, `initialize`, và các phương thức công cụ thuần túy sẽ trả về `-32601` trong kỷ nguyên này.

Đầu ra tiêu chuẩn (stdout) chỉ chứa JSON-RPC, mỗi thông điệp trên một dòng.

## Hướng dẫn máy chủ và tìm kiếm công cụ {#server-instructions-and-tool-search}

Cả kết quả `initialize` cũ và kết quả `server/discover` của MCP 2026-07-28 đều mang cùng một chuỗi `instructions` (tối đa 512 ký tự, độc lập). Chuỗi này cho máy chủ biết khi nào nên sử dụng các công cụ Engram (thu hồi các quy tắc và quyết định dự án, lưu kiến thức dự án) và rằng `engram_commit` cần sự chấp thuận của con người. Codex đọc 512 ký tự đầu tiên; Claude Code chỉ tải trước tên công cụ kèm `instructions` và hoãn định nghĩa công cụ phía sau tìm kiếm công cụ.

`engram-mcp --always-load` đánh dấu `engram_load` với `_meta["anthropic/alwaysLoad"]: true`, để Claude Code tải trước công cụ đó. Các hook Claude của Engram đã tiêm ngữ cảnh sẵn, vì vậy `engram link` chỉ thêm cờ này khi không có hook Claude Engram nào được cài đặt hoặc đang cài đặt, và chỉ thêm vào các cấu hình mà Claude Code đọc: `.mcp.json` và lệnh in ra `claude mcp add --scope user`. Cấu hình Codex, Cursor, Gemini và Windsurf không bao giờ nhận cờ này. Mục `engram` hiện có trong `.mcp.json` chỉ thay đổi khi dùng `--force`, `engram upgrade`, hoặc làm mới. `engram-mcp --no-elicitation` giữ nguyên luồng trò chuyện `approval_token` ngay cả đối với các máy khách hỗ trợ hộp thoại phê duyệt (xem bên dưới). Tùy chọn `engram-mcp` không xác định sẽ bị bỏ qua kèm ghi chú trên stderr.

## Công cụ {#tools}

| Công cụ | Mục đích | Ghi dữ liệu |
| --- | --- | --- |
| `engram_load` | Định tuyến và trả về bộ nhớ cho một tác vụ (`query`, `id`, `budget_tokens`, `disclosure`, `full`, `explain`) | Không |
| `engram_route` | Phân loại một tác vụ và liệt kê các bộ nhớ mà nó định tuyến tới | Không |
| `engram_search` | Tìm kiếm bộ nhớ theo truy vấn | Không |
| `engram_verify`, `engram_status` | Kiểm tra mã băm; báo cáo tình trạng và số lượng | Không |
| `engram_save`, `engram_save_session` | Trả về đề xuất được đánh số và một `approval_token` | Không |
| `engram_commit` | Ghi đề xuất đã được phê duyệt | Có, sau khi con người phê duyệt |
| `engram_set_role`, `engram_set_rule_variant` | Cập nhật vai trò hoặc chế độ biến thể quy tắc | Có |
| `engram_note` | Lưu ghi chú tác vụ đã biên tập vào tầng làm việc (`text`, `objective`, `type`, `scope`); trả về `{id, file, valid_until}` | Có, sau một phê duyệt có/hủy |

`engram_load` mặc định tạo đầu ra theo phân tầng được mô tả trong [Đường dẫn đọc và định tuyến](../concepts/read-path.md); truyền `full: true` để có đầu ra kế thừa rộng hơn. `budget_tokens` không có hiệu lực khi dùng cùng với `id`.

## Kết quả có cấu trúc {#structured-results}

Văn bản cho con người nằm trong `content[0].text`. `structuredContent` là phong bì `{contract_version, ok, data, diagnostics}`, trong đó `data` mang:

- `engram_load`: `selected_keys`, `body_keys`, `card_ids`, `omitted_ids` (các ID bị cắt bỏ do ngân sách token, có thể lấy qua `id`), và `tokens`.
- `engram_search` và `engram_route`: `entries` kèm `id`, `type`, `scope`, và `score`. Các mục định tuyến theo thứ tự tải, không sắp xếp theo điểm số.

## Phê duyệt và cam kết (Commit) {#approval-and-commit}

`engram_save` và `engram_save_session` là **chỉ-đề-xuất**: chúng trả về bản xem trước và một `approval_token`. Sau khi con người phê duyệt các ứng viên chính xác trong cuộc trò chuyện, hãy gọi `engram_commit` với `approval_token` và `approve: "all"` hoặc một danh sách số thứ tự ứng viên bắt đầu từ 1. Nó ghi qua cùng đường dẫn với `save-session --force`, vì vậy các ứng viên liên quan hoặc trùng lặp sẽ được hoãn lại như bình thường.

- Token là ngẫu nhiên, gắn với không gian làm việc, sử dụng một lần và hết hạn sau 30 phút.
- Chỉ lưu trữ mã băm của token trong `pending-approvals.json` được gitignore; chỉnh sửa ứng viên đang chờ xử lý sẽ làm thất bại kiểm tra tính toàn vẹn.
- Tuyệt đối không gọi `engram_commit` trước khi con người đã phê duyệt các ứng viên được hiển thị.
- `engram_commit` mang `_meta["anthropic/requiresUserInteraction"]: true` trong `tools/list`, điều này khiến Claude Code đưa ra lời nhắc trên mỗi lệnh gọi, ngay cả trong chế độ bỏ qua (bypass). Khối Codex được quản lý thêm `[mcp_servers.engram.tools.engram_commit]` với `approval_mode = "approve"`, và `engram doctor` cảnh báo (`host.gemini_trust`) khi mục Gemini `mcpServers.engram` đặt `trust: true`, điều này sẽ bỏ qua bước xác nhận.
- Mỗi ứng viên mang một dòng `Verdict:` tất định (`ADD`, `UPDATE <id>`, `SUPERSEDE <id>`, `NOOP duplicate of <id>`). Token ghim các phán quyết và `engram_commit` chỉ áp dụng `SUPERSEDE` khi phán quyết được tính toán lại vẫn khớp.
- `approval_token` được trả về cho agent. Nó chứng minh đề xuất tồn tại, không chứng minh con người đã phê duyệt. Cổng kiểm soát của con người là lời nhắc cấp quyền theo công cụ của máy chủ cho `engram_commit`, vì vậy không thêm vào danh sách cho phép (allowlist) hoặc tự động phê duyệt `mcp__engram__engram_commit` (hoặc tương đương của máy chủ của bạn).

### Hộp thoại phê duyệt (Elicitation) {#approval-dialog-elicitation}

Khi máy khách khai báo khả năng thu thập biểu mẫu (elicitation), `engram_save` và `engram_save_session` sẽ hỏi con người trong hộp thoại riêng của máy chủ thay vì trả về token:

- Biểu mẫu liệt kê các số ứng viên kèm `ADD`/`UPDATE` và tiêu đề ID (không bao giờ hiển thị văn bản bộ nhớ) cùng phạm vi lưu; `both` có thể thu hẹp thành một phạm vi, không bao giờ mở rộng.
- `accept` ghi chính xác các ứng viên đã chọn thông qua cùng đường dẫn với `engram_commit`. Không trả về `approval_token`.
- `decline` thu hồi đề xuất: lệnh `engram_commit` sau đó với token của nó sẽ thất bại với `approval was declined in the approval dialog`. Câu trả lời không hợp lệ cũng sẽ thu hồi đề xuất.
- `cancel`, thời gian chờ 60 giây, hoặc lỗi máy khách sẽ chuyển về văn bản token ở trên, bắt đầu bằng `nothing was saved`, để các máy chủ khai báo elicitation nhưng đóng hộp thoại vẫn tiếp tục hoạt động. Máy chủ tự động từ chối cần `engram-mcp --no-elicitation`.
- Máy khách cũ nhận yêu cầu `elicitation/create` từ máy chủ đến máy khách. Máy khách MCP 2026-07-28 nhận kết quả `input_required` với `requestState` là một phong bì niêm phong HMAC có hạn sử dụng, gắn với công cụ, không gian làm việc và đối số; chúng thử lại `tools/call` với `inputResponses` và `requestState` đó. Trạng thái giả mạo, hết hạn hoặc không khớp sẽ trả về `-32602` và không ghi gì cả. Khởi động lại máy chủ sẽ làm mất hiệu lực các trạng thái đang mở, vì vậy agent sẽ đề xuất lại.
- Các lệnh gọi không có khả năng này và `--no-elicitation` sử dụng luồng token không đổi.

### Ghi chú tầng làm việc {#working-tier-notes}

`engram_note` lưu một ghi chú tác vụ ngắn vào tầng `working/` được gitignore (`source: note`, `tier: working`, `valid_until` = hôm nay + `load.working_ttl_days`). Văn bản được biên tập và các dòng giống hướng dẫn bị từ chối trước khi xem trước. Con người trả lời một lời nhắc có/hủy thông qua cùng hộp thoại, thử lại `input_required`, hoặc luồng `approval_token` được mô tả ở trên; `decline`, `cancel`, và thời gian chờ sẽ không ghi gì cả. Ghi chú không bao giờ cập nhật bộ nhớ bền vững có cùng ID, và `engram promote` là cách duy nhất để nó trở nên bền vững. SessionStart loại bỏ ghi chú trừ khi `ENGRAM_SESSION_OBJECTIVE` khớp với mục tiêu của ghi chú; nếu không nó sẽ xuất hiện dưới dạng thẻ một dòng. Công cụ mang `readOnlyHint: false` và không có `destructiveHint`.

## Quy tắc ép buộc (Force rule) {#force-rule}

Các yêu cầu `/engram save-session --force` rõ ràng, bao gồm phím tắt `/engram ss -f`, phải sử dụng đường dẫn ghi của CLI. Phím tắt có đếm `/engram ss -f last 50 sessions` nên sử dụng `engram save-session --query-level 50 --force`. Các máy chủ chỉ có MCP sẽ commit qua `engram_commit`.

## Mục MCP của OpenCode {#opencode-mcp-entry}

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

Máy chủ MCP triển khai bắt tay JSON-RPC chuẩn (`initialize`, `notifications/initialized`, `tools/list`, và `tools/call`) và phản hồi `ping`. Bộ nhớ cũng được hiển thị dưới dạng tài nguyên MCP (`engram://index` liệt kê thẻ một dòng, `engram://memory/{id}` đọc cùng phần thân với `engram load --id` và tính là một lần lấy), và một lời nhắc, `propose`, trả về giao thức đề xuất bộ nhớ. `resources/list` trả về chỉ mục cộng với `mcp.resource_limit` bộ nhớ hàng đầu theo mức độ sử dụng (cấu hình JSON, mặc định 20, 0 đến 200). Các công cụ đọc mang `annotations.readOnlyHint: true`. Một dòng JSON dị dạng nhận phản hồi lỗi `-32700` và máy chủ vẫn tiếp tục chạy. Các yêu cầu không có `id` là thông báo và không nhận phản hồi, và lệnh gọi phương thức thuần túy không phải là `tools/call` sẽ trả về văn bản thô.

## Các bước tiếp theo {#next-steps}

- [Tổng quan về Tích hợp Agent](overview.md)
- [Hook và dòng bằng chứng](hooks.md)
