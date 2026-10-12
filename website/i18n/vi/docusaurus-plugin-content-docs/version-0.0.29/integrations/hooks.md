---
title: Hook và dòng bằng chứng
sidebar_position: 12
description: Hook agent Engram tiêm bộ nhớ đã định tuyến khi bắt đầu phiên và các lượt lời nhắc. Các dòng bằng chứng giúp việc tiêm trở nên rõ ràng.
---

# Hook và dòng bằng chứng {#hooks-and-proof-lines}

Hook agent là các hook máy chủ tùy chọn, tiêm ngữ cảnh Engram đã định tuyến khi bắt đầu phiên và trong các lượt chuyển đổi tác vụ sau đó khi máy chủ cung cấp kênh ngữ cảnh an toàn tại thời điểm nhắc lệnh.

## Cài đặt hook {#install-hooks}

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

Sử dụng `--global` cho cấu hình cấp người dùng và `engram unlink` để chỉ xóa các mục hook do Engram quản lý.

## Chế độ đọc {#read-mode}

`engram set-read startup|auto|always|manual|off` điều khiển hành vi thời gian chạy:

- `auto` tải khi bắt đầu phiên và ở các lượt lời nhắc tiếp theo, chỉ tiêm các phần thân bộ nhớ chưa từng được phân phối trong phiên.
- `startup` chỉ tải khi bắt đầu phiên.
- `always` tiêm lại ở mọi lượt hợp lệ.
- `manual` và `off` giảm bớt tính tự động.

Bộ nhớ đệm hook lưu trữ mã băm, ID phiên, máy chủ, thư mục làm việc hiện tại (cwd) và các khóa bộ nhớ đã được phân phối trong mỗi phiên — tuyệt đối không lưu văn bản lời nhắc thô.

## Tiêm vi sai (Delta injection) {#delta-injection}

Đối với mỗi (máy chủ, cwd, phiên), hook ghi lại các khóa mà nó đã phân phối. Một lượt lời nhắc chỉ tiêm các phần thân chưa được phân phối và kết thúc bằng một dòng `already loaded: <ids>` cho các mục còn lại; một lượt không có gì mới chỉ tiêm dòng đó (kèm dòng bằng chứng, khi tính năng bằng chứng được bật), và một lượt không định tuyến mục nào sẽ không tiêm bộ nhớ. `SessionStart` và `PreCompact` đặt lại tập hợp, do đó bộ nhớ được phân phối lại sau một phiên mới hoặc sau khi nén ngữ cảnh. Các bản ghi cũ hơn 7 ngày sẽ bị xóa và giữ lại tối đa 200 bản ghi. OpenCode chỉ duy trì một ô system-prompt duy nhất, do đó plugin của nó sẽ thay thế hoặc giữ lại ô hiện tại thay vì gửi vi sai nghiêm ngặt.

## Giới hạn tải trọng {#payload-caps}

Các máy chủ sẽ cắt bớt đầu ra hook quá lớn, do đó hook sẽ đo lường `additionalContext` được kết xuất theo đơn vị riêng của từng máy chủ: tối đa 2.400 token trên Codex (byte UTF-8 / 4; Codex giới hạn tin nhắn khoảng 2.500 token), tối đa 9.500 ký tự trên Claude (giới hạn 10.000), và `load.max_tokens` ở các nơi khác. Khi văn bản vượt quá giới hạn, hook sẽ lập kế hoạch lại với ngân sách nhỏ hơn, do đó phần thân sẽ hạ cấp thành thẻ một dòng và các thẻ có thứ hạng thấp nhất sẽ bị loại bỏ; một phần thân không bao giờ bị cắt dở giữa chừng. Cùng một mức trần này áp dụng cho `SubagentStart` và đầu ra của trình kích hoạt đường dẫn, và chỉ các phần thân thực sự được gửi mới được ghi nhận là đã phân phối. Các ID `already loaded:` được sắp xếp và `sig` của bằng chứng băm các khóa được định tuyến đã sắp xếp, sao cho cùng một tập hợp định tuyến luôn in ra các byte giống hệt nhau.

## Trình kích hoạt theo phạm vi đường dẫn {#path-scoped-triggers}

Các bản cài đặt hook Claude, Codex và Gemini cũng đăng ký một trình kích hoạt đường dẫn. Codex luôn sử dụng `PreToolUse` và Gemini sử dụng `AfterTool`. Claude sử dụng `InstructionsLoaded` theo `hooks.path_rules native` (mặc định) và `PreToolUse` theo `hooks.path_rules hook`:

- Claude `InstructionsLoaded` (trình khớp `path_glob_match`, bất đồng bộ, bỏ qua đầu ra) kích hoạt khi Claude tải tệp `.claude/rules/engram/<id>.md` được tạo, và ghi lại bộ nhớ đó vào tập đã phân phối và `usage.json`. Bản thân tệp quy tắc mang phần thân, do đó không có gì bị tiêm hai lần.
- Claude `PreToolUse` (chế độ hook) khớp với `Read`, `Edit`, `Write` và `MultiEdit` và sử dụng `tool_input.file_path`.
- Codex không có công cụ đọc hay chỉnh sửa đa điểm và `PreToolUse` không kích hoạt khi đọc, do đó chỉ các tệp được chỉnh sửa qua `apply_patch` mới kích hoạt.
- Gemini `AfterTool` (trình khớp `read_file|write_file|replace`, thời gian chờ tính bằng mili giây) đọc đường dẫn bị chạm tới từ đầu vào công cụ và thêm các bộ nhớ vào kết quả công cụ, do đó chúng đến sau thao tác đọc một bước. Trình khớp của Gemini là regex không neo, do đó hook cũng khởi động cho các công cụ có tên chứa `replace`; nó thoát với `{}` cho các công cụ đó. Nó dùng chung tập hợp đã phân phối với `BeforeAgent`.

Khi đường dẫn bị chạm tới (tương đối với thư mục làm việc) khớp với các glob `applies_to` của một bộ nhớ chưa được phân phối, hook sẽ tiêm tối đa 3 phần thân cho mỗi sự kiện dưới dạng `additionalContext`. Nó không bao giờ trả về quyết định cấp phép, do đó nó không thể chặn lệnh gọi công cụ, và các đường dẫn bên ngoài thư mục làm việc sẽ bị bỏ qua. Văn bản lời nhắc đặt tên một đường dẫn tệp thực tế cũng được tính là mỏ neo cho các bộ nhớ `applies_to`.

Chạy `engram upgrade --latest` (hoặc `engram link <host>` một lần nữa) để thêm trình kích hoạt đường dẫn (`InstructionsLoaded` hoặc `PreToolUse`) và `PreCompact` (Gemini: `PreCompress`) vào bản cài đặt cũ; bản cài đặt Claude hiện có sẽ chuyển từ `PreToolUse` sang `InstructionsLoaded` khi làm mới, vì vậy hãy chạy `engram config set hooks.path_rules hook` trước để giữ `PreToolUse`; lệnh `engram upgrade` thông thường không làm mới cấu hình hook. Claude, Codex và Cursor đọc `timeout` của hook tính bằng giây; các mục được quản lý ghi `10`.

## Subagent {#subagents}

Các bản cài đặt hook Claude và Codex cũng đăng ký `SubagentStart` (trình khớp `*`, mọi loại agent). Nó tiêm ngữ cảnh `current session` đã định tuyến vào subagent dưới dạng ngữ cảnh bổ sung và không bao giờ trả về quyết định. Các hook subagent mang `session_id` của cha, vì vậy tập đã phân phối của subagent được đặt khóa `<session_id>#agent:<agent_id>` và tập hợp của cha không bao giờ bị ảnh hưởng; giữ lại tối đa 100 bản ghi subagent để chúng không đẩy các phiên cha ra ngoài. Đầu ra `SubagentStart` của Codex bỏ qua `suppressOutput`, thuộc tính mà Codex không liệt kê cho sự kiện đó. Mức trần tải trọng tương tự cũng được áp dụng. Khoảng trống đã biết: Codex không tài liệu hóa `agent_id` trên `PreToolUse`, do đó trình kích hoạt đường dẫn bên trong một subagent Codex có thể được ghi vào tập đã phân phối của cha.

## Hàng đợi bản ghi phiên (tùy chọn) {#session-transcript-queue-opt-in}

`engram link claude --session-end` và `engram link codex --session-end` cũng đăng ký một hook lệnh `SessionEnd` (thời gian chờ của Claude là 5 giây, Codex là 3 giây). Đây là hook lệnh thuần túy: nó không tiêm gì cả, phản hồi `{}`, an toàn khi lỗi (fail open), và chỉ thêm `{ transcript_path, host, session, at }` vào tệp được gitignore `session-queue.json` trong thư mục bộ nhớ không gian làm việc. Các mục được ghi dưới khóa tệp, khử trùng lặp theo máy chủ và phiên, và giới hạn ở 50 mục mới nhất. Cờ này bị tắt theo mặc định, `engram upgrade` không bao giờ thêm nó (mục hiện có được giữ nguyên), `engram unlink` xóa nó và Gemini không được đăng ký. Đường dẫn được lưu trữ là tuyệt đối và đặt tên người dùng hệ điều hành của bạn, đó là lý do tệp không bao giờ rời khỏi máy của bạn.

Dọn sạch hàng đợi bằng `engram observe --queue` (`--dry-run` chỉ kiểm tra, `--limit n` giới hạn số mục cho mỗi lần chạy). Mỗi bản ghi phải tồn tại, là tệp thông thường (không phải liên kết mềm hay liên kết cứng) và có kích thước tối đa 5 MiB. Nó được biên tập lại, loại bỏ các dòng giống như chèn mã độc, và lưu trữ dưới dạng dấu vết kèm bộ bao bọc hộp thư đến không bao giờ chứa đường dẫn tuyệt đối. Các mục bị bỏ qua hoặc đã lưu trữ sẽ rời khỏi hàng đợi; các mục đạt hạn ngạch hộp thư đến (`max_files` trong tệp tùy chọn `.agents/engram.transcripts.json`) sẽ ở lại. Không có bộ nhớ nào được ghi trực tiếp: thăng hạng một tệp hộp thư đến bằng `engram save-session --file <inbox file>` và cổng phê duyệt thông thường. Tự chạy `observe --queue` hoặc chạy từ một hook lệnh thuần túy, không chạy từ hook Codex bất đồng bộ.

## Chế độ bằng chứng {#proof-mode}

`engram set-proof off|compact` kiểm soát xem các hook được hỗ trợ có thêm dòng `Engram proof:` thu gọn vào mỗi lượt hợp lệ hay không. Khả năng hiển thị bằng chứng tách biệt với `set-read`: `compact` có thể báo cáo các lượt đã tải, tái sử dụng hoặc bỏ qua mà không làm thay đổi thời điểm bộ nhớ Engram đầy đủ được tiêm.

## Ma trận khả năng của hook {#hook-capability-matrix}

| Máy chủ | Đường dẫn cấu hình | Sự kiện |
| --- | --- | --- |
| `codex` | `.codex/hooks.json`; toàn cục `~/.codex/hooks.json` | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PreCompact`, `SubagentStart` (tùy chọn `SessionEnd`) |
| `claude` | `.claude/settings.json`; toàn cục `~/.claude/settings.json` | `SessionStart`, `UserPromptSubmit`, `InstructionsLoaded` (`PreToolUse` khi `hooks.path_rules hook`), `PreCompact`, `SubagentStart` (tùy chọn `SessionEnd`) |
| `gemini` | `.gemini/settings.json`; toàn cục `~/.gemini/settings.json` | `SessionStart`, `BeforeAgent`, `AfterTool`, `PreCompress` |
| `cursor` | `.cursor/hooks.json`; plugin toàn cục `hooks/hooks.json` | `sessionStart` |
| `windsurf` / `cascade` | `.windsurf/hooks.json`; toàn cục `~/.codeium/windsurf/hooks.json` | `pre_user_prompt` |
| `opencode` | `~/.config/opencode/plugins/engram.js` | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | Không ghi | N/A |
| `cline` | Không ghi | N/A |

## Các bước tiếp theo {#next-steps}

- [Tổng quan về Tích hợp Agent](overview.md)
- [CLI: inject / link / upgrade](../cli/inject-link-upgrade.md)
