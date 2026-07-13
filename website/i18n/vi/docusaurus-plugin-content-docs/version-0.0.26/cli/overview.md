---
title: "Tổng quan về lệnh"
sidebar_position: 1
description: "Bản đồ của mọi lệnh Engram CLI và chức năng của chúng."
---

# Hướng Dẫn Vận Hành

## Phe duyet trong chat AI

Trong chat voi tac nhan AI, phe duyet Engram la dang hoi dap. Tac nhan truoc tien hien thi cac ung vien da duoc bien tap `TYPE: ... | TEXT: ...`, va voi rule thi kem theo cac bien the Light/Balanced/Strict. Tra loi `yes` de luu dung cac ung vien do, `audit` de sua lai, hoac `cancel` de dung. Sau `yes`, tac nhan dung `engram save-session --force` voi chinh cac ung vien da duoc phe duyet. Cac lan luu truc tiep tren CLI van dung A/B/C tru khi lenh accept-all da duoc goi ro rang.


Trang này chứa thông tin chi tiết về cách sử dụng để tệp README có thể duy trì dung lượng ngắn gọn.

## Các Lệnh Được Hỗ Trợ

| Nhu cầu | Câu lệnh |
| --- | --- |
| Tải bộ nhớ tác vụ | `engram load "<tác vụ>"` |
| Hiển thị hướng dẫn tác nhân | `engram llm` |
| Xem trước các tệp bộ nhớ được định tuyến | `engram load --dry-run "<tác vụ>"` |
| Tìm kiếm bộ nhớ | `engram search "<chủ đề>"` |
| Lưu một bộ nhớ | `engram save [rule\|workflow\|knowledge] "<nội dung>"` |
| Lưu nhiều bộ nhớ phiên làm việc | `engram save-session` hoặc `engram ss` |
| Khai thác các chat gần đây có thể truy cập | `engram save-session --query-level 3` |
| Phê duyệt toàn bộ đề xuất của phiên | `engram ss -f` |
| Khai thác và phê duyệt chat gần đây | `engram ss -f last 50 sessions` |
| Ghi lại ghi chú thô | `engram observe --file session.md` |
| Chuyển đổi tài liệu/hướng dẫn có sẵn | `engram take-control --all` |
| Xem trước kế hoạch tiếp quản tài liệu | `engram take-control --plan` |
| Nhập và tự đánh giá tài liệu | `engram take-control --all --metacognize --force` |
| Tái cấu trúc thư mục bộ nhớ hiện tại | `engram metacognize --workspace\|--global\|--all` |
| Giải quyết xung đột và tự đánh giá | `engram resolve-conflicts --metacognize` |
| Kiểm tra định tuyến đồ thị | `engram graph "<chủ đề>"` |
| Kiểm tra mã băm bảo mật | `engram verify` |
| Tìm các tệp bộ nhớ bị lỗi cấu trúc | `engram repair` |
| Lưu trữ bộ nhớ sai lệch | `engram archive --reason "<lý do>" <id-hoặc-tên-tệp>` |
| Điều chỉnh độ mạnh quy tắc | `engram set-rule-variant strict\|balanced\|light\|off` |
| Đặt đích lưu mặc định | `engram set-save-target workspace\|global\|both\|status` |
| Đặt giới hạn tải gọn | `engram set-load-limit 1..32\|status\|reset` |
| Cấu hình tự động đọc qua hook | `engram set-read startup\|auto\|always\|manual\|off\|status` |
| Cấu hình hiển thị bằng chứng | `engram set-proof off\|compact\|status` |
| Cài hook tác nhân | `engram link codex\|claude\|gemini\|opencode\|cursor\|windsurf` |
| Quản lý profile global | `engram profile status\|create\|use\|merge` |
| Sao chép bộ nhớ workspace/global | `engram clone-memory workspace global [--metacognize]` |

Sử dụng lệnh `save-session` cho các đề xuất bộ nhớ từ các phiên làm việc dài. Dạng viết tắt: `ss`.
Sử dụng `--query-level <n>` khi con người muốn tác nhân AI khai thác tối đa n phiên chat người-tác nhân gần đây có thể truy cập, thay vì chỉ phiên hiện tại. Cách nói tự nhiên `engram ss -f last 50 sessions` được chuẩn hóa thành `engram save-session --query-level 50 --force`.

Sử dụng `load --dry-run` khi bạn muốn kiểm tra xem những tệp bộ nhớ nào sẽ được định tuyến mà không cần in nội dung của chúng.
`load` trước tiên neo định tuyến vào các từ khóa truy vấn có ý nghĩa, bỏ qua các từ nhớ chung chung như `rule`, `knowledge` và các từ dừng (stopwords) phổ biến. Sau đó, nó tinh chỉnh nhóm ứng viên rộng hơn thành gói ngữ cảnh gọn. Tải thông thường hiển thị số đã chọn và tổng số liên quan, ví dụ `loaded 8 memory files / 14 total related memories`. `load --dry-run` hiển thị số lượng ứng viên, các tag gợi ý để thu hẹp và lý do khớp; `load --all` trả về mọi kết quả khớp định tuyến thay vì áp dụng giới hạn gói gọn.
`workflow` và `workflows` vẫn định tuyến đến các bộ nhớ kỹ năng, nhưng các từ loại chung chung tự bản thân chúng không tạo nên một kết quả khớp rộng.

## Đồ Thị Phụ Thuộc (Dependency Layers)

Sử dụng frontmatter `depends_on` khi một bộ nhớ cần được xây dựng dựa trên một bộ nhớ khác thay vì lặp lại nó:

```yaml
depends_on: [release-foundation]
level: advanced
```

Chạy `engram graph --rebuild` sau khi chỉnh sửa thủ công. Đồ thị sẽ báo cáo các lớp phụ thuộc, và `engram load` sẽ kéo các điều kiện tiên quyết được định tuyến vào cùng một gói ngữ cảnh gọn trước các bộ nhớ sâu hơn. Các cạnh liên quan trong đồ thị và kết quả khớp vector không tự động tải các bộ nhớ không liên quan; chúng chỉ giúp xếp hạng lại hoặc mở rộng các bộ nhớ đã trùng khớp với các từ khóa truy vấn có ý nghĩa. Các điều kiện tiên quyết `depends_on` rõ ràng vẫn có thể tải mà không cần từ khóa trùng khớp riêng của chúng.

## Đối Soát Nâng Cấp (Upgrade Reconciliation)

Sử dụng `engram upgrade` sau khi cài đặt gói Engram mới hơn. Lệnh này so sánh các thư mục gốc bộ nhớ đã khởi tạo từ v0.0.8 trở đi với lược đồ phát hành hiện tại và làm mới các tệp HELP.md được tạo, chỉ mục bộ nhớ, tệp đồ thị, sidecar vector đủ điều kiện, bộ kỹ năng workspace được tạo, khung bộ nhớ toàn cục và bộ kỹ năng tác nhân toàn cục đã đăng ký trong khi vẫn bảo tồn các tệp do con người viết. Các lệnh thông thường cũng chạy đối soát thư mục gốc một cách âm thầm mỗi phiên bản gói trừ khi `--no-auto-upgrade` hoặc `ENGRAM_NO_AUTO_UPGRADE=1` được đặt.
Sử dụng `engram upgrade --latest` khi kết quả của gói mới cần ghi đè lên các tệp cấu phần tác nhân (agent artifacts) được liên kết và quản lý bởi Engram. Đường dẫn đó sẽ áp dụng lại các tệp hướng dẫn không gian làm việc (workspace), quy tắc, cấu hình MCP/plugin và các hook được quản lý, đồng thời cập nhật các cài đặt tác nhân toàn cục (global agent) đã đăng ký với các tệp mới nhất được tạo.

### Hồ sơ kết xuất bộ kỹ năng (Skillset Render Profiles)

Đối với các máy chủ hỗ trợ môi trường chạy (runtime-capable), Engram hiện cài đặt các hướng dẫn khởi động (bootstrap) nhỏ thay vì giao thức đầy đủ. Các hook cung cấp ngữ cảnh tác vụ được định tuyến, các công cụ MCP cung cấp hành vi tải/tìm kiếm/đề xuất, và các bộ chuyển đổi lệnh gạch chéo (slash) hoặc Kỹ năng Tác nhân (Agent Skills) mang theo các luồng công việc lệnh chi tiết. Các mục tiêu dự phòng (fallback) không có tính năng chèn ngữ cảnh thời gian chạy đáng tin cậy vẫn sẽ nhận được các hướng dẫn thủ công thu gọn.

### Dự phòng DB cấu hình SQLite (SQLite Config DB Fallback)

DB cấu hình SQLite của Engram là một tối ưu hóa cho việc quản lý không gian làm việc/hồ sơ (profile). Nếu DB không thể mở hoặc khởi tạo, các lệnh đọc/ghi bình thường sẽ tự động chuyển sang cấu hình JSON. Các lệnh cụ thể của DB sẽ báo cáo SQLite không khả dụng thay vì chặn việc sử dụng bộ nhớ thông thường.
Khi `engram save` tìm thấy các bộ nhớ đang hoạt động có liên quan, bản xem trước phê duyệt sẽ báo cáo chúng kèm theo gợi ý `depends_on` hoặc cảnh báo trùng lặp tiềm ẩn. Việc chấp nhận sẽ lưu bản xem trước nguyên trạng; hãy từ chối trước nếu bạn muốn cấu trúc lại các phụ thuộc hoặc lưu trữ các bộ nhớ trùng lặp trước khi lưu.
Đối với `save-session --force`, Engram sẽ tạm dừng trước khi ghi khi các gợi ý bộ nhớ liên quan đó xuất hiện. Tác nhân nên sử dụng phản hồi để brainstorm một lượt chạy lại có cấu trúc: thêm `DEPENDS_ON: memory-id` cho các phụ thuộc, `LEVEL: advanced` khi một bộ nhớ sâu hơn điều kiện tiên quyết của nó, hoặc `UPDATE: memory-id` khi một ứng viên nên được hợp nhất vào một bộ nhớ trùng lặp tiềm ẩn.

## Profile, Đích Lưu Và Sao Chép

Dùng `set-save-target` để chọn nơi các lần lưu thông thường sẽ ghi vào:

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

Dùng `profile` khi bộ nhớ global cá nhân, công ty hoặc đội nhóm cần được tách riêng:

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

Thứ tự phân giải hồ sơ là `--profile` rõ ràng hoặc `ENGRAM_PROFILE`, sau đó là
`default_profile` của không gian làm việc, rồi hồ sơ người dùng đang hoạt động.
Nếu không gian làm việc `W` được ghim vào hồ sơ `B` trong khi mặc định người
dùng vẫn là hồ sơ `A`, mọi lượt tải thông thường, tải MCP và chèn hook tác nhân
cho `W` đều đọc bộ nhớ toàn cục của hồ sơ `B` và không bao giờ đọc hồ sơ `A`.
Một hồ sơ rõ ràng khác mặc định không gian làm việc sẽ dùng bộ nhớ toàn cục của
hồ sơ đó và tắt bộ nhớ không gian làm việc cho lệnh đó.

Dùng `clone-memory` để sao chép Markdown đang hoạt động trong `rules/`, `skills/` và `knowledge/` giữa phạm vi workspace và global:

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
```

Thêm `--metacognize` khi bạn muốn các bộ nhớ được sao chép đề xuất thông qua luồng phê duyệt save-session thay vì được sao chép nguyên văn.

## Tự Đánh Giá Bộ Nhớ (Metacognize Memory)

Sử dụng `metacognize` khi bạn muốn một tác nhân AI xem xét một thư mục bộ nhớ Engram hiện có và đề xuất cấu trúc an sau khi phê duyệt luồng save-session:

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --force
```

Lệnh xác minh các bộ nhớ `rules/`, `skills/` và `knowledge/` đang hoạt động trong phạm vi đã chọn, trả về một gói nguồn gọn khi các ứng viên không được cung cấp, sau đó chỉ ghi các dòng `TYPE: ... | TEXT: ...` được tạo sau khi phê duyệt. Các tác nhân nên sử dụng `UPDATE: memory-id` để hợp nhất hoặc dọn dẹp cách diễn đạt và `DEPENDS_ON: memory-id` cho các bộ nhớ phân lớp. Cách diễn đạt tự nhiên như `engram restructure workspace memory accept all` sẽ được chuẩn hóa thành `engram metacognize --workspace --force`.

## Lưu Phiên Làm Việc (Save Session)

Sử dụng `save-session` khi một tương tác dài tạo ra nhiều ứng viên bộ nhớ:

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` là tùy chọn. Chỉ thêm nó khi nó giải thích lý do tại sao bộ nhớ tồn tại, tình huống nguồn, mục đích sử dụng hoặc ranh giới. Các bộ nhớ sự thật đơn giản có thể bỏ qua nó và sử dụng ngữ cảnh phê duyệt mặc định của Engram.

Nếu không có cờ `--force`, Engram sẽ hỏi ứng viên nào cần lưu. Với `ss -f`, mọi ứng viên được tạo ra sẽ được lưu lại vì con người đã phê duyệt rõ ràng cho phím tắt đó.
Khi một lượt chạy accept-all báo cáo các bộ nhớ liên quan trước khi ghi, không có tệp nào được lưu. Tác nhân nên chạy lại với các ứng viên có cấu trúc như:

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

`--query-level` phải là số nguyên dương. Tác nhân AI chỉ nên dùng các phiên chat mà nó thật sự có thể truy cập và không được bịa lịch sử không có sẵn. `engram ss -f last 50 sessions` dùng `50` làm query level và `-f` làm phê duyệt rõ ràng của con người.

## Tiếp Quản Bộ Nhớ (Take Control)

`take-control` giúp bạn triển khai Engram vào các kho lưu trữ hiện có. Nó quét các hướng dẫn của tác nhân AI, ghi chú, tài liệu và các tệp được chọn, sau đó yêu cầu tác nhân AI tạo ra các ứng viên ngắn gọn.

Các bộ lọc hữu ích:

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --force
```

Các bộ nhớ được lưu bởi take-control ghi lại `source_files` và `source_hashes`, nhờ đó các nguồn không thay đổi sẽ được bỏ qua trong các lần quét sau.
Sử dụng `--metacognize` với yêu cầu accept-all của con người khi các gợi ý bộ nhớ liên quan sẽ tạm dừng ghi và cho phép tác nhân chạy lại với `UPDATE` or `DEPENDS_ON`.

## Giải Quyết Xung Đột Bằng Tự Đánh Giá (Resolve Conflicts With Metacognition)

Sử dụng `resolve-conflicts` để xem trước hoặc chỉ giải quyết các xung đột bộ nhớ workspace do Engram sở hữu. Thêm `--metacognize` khi tác nhân nên xem xét thư mục bộ nhớ sau khi xử lý xung đột:

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
engram resolve conflicts and metacognize
```

Lệnh này giữ việc xử lý xung đột mang tính quyết định trong phạm vi `.agents/.engram/`, sau đó nối thêm gói nguồn tự đánh giá workspace cho các ứng viên `TYPE/TEXT` ngắn gọn.

## Ghi Nhận (Observe)

`observe` lưu trữ các ghi chú thô đã được làm sạch thông tin nhạy cảm vào thư mục `inbox/`. Các ghi chú trong hộp thư đến (inbox) này không phải là bộ nhớ hoạt động.

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<ghi-chú>.md
```

Sử dụng tính năng này khi bạn muốn lưu giữ các ghi chú sơ bộ trước khi quyết định những gì sẽ trở thành bộ nhớ bền vững.

## Cấu hình (Configuration)

Để xem và quản lý các thiết lập thời gian chạy, hãy sử dụng các lệnh `config`:

- **Xem cấu hình đang hoạt động**:
  ```bash
  engram config view
  ```
- **Đặt giá trị cấu hình**:
  ```bash
  engram config set <key> <value>
  ```

### Tham chiếu thiết lập chính (Key Settings Reference)

| Khóa | Mô tả | Mặc định | Phạm vi / Tùy chọn |
| --- | --- | --- | --- |
| `memory.rule_line_target` | Mục tiêu số dòng được đề xuất cho bộ nhớ quy tắc | `70` | `50` đến `200` |
| `memory.rule_line_hard_limit` | Giới hạn số dòng tối đa cho phép đối với bộ nhớ quy tắc | `100` | `50` đến `200` |
| `load.limit` | Số lượng bộ nhớ tối đa được trả về bởi tải thông thường | `8` | `1` đến `32` |
| `rule_variants.enabled` | Bật hoặc tắt tính năng tạo các biến thể quy tắc | `true` | `true`, `false` |
| `rule_variants.active` | Chế độ biến thể quy tắc đang hoạt động | `balanced` | `light`, `balanced`, `strict` |
| `graph.enabled` | Bật hoặc tắt định tuyến dựa trên đồ thị | `true` | `true`, `false` |
| `graph.max_related` | Số bộ nhớ liên quan tối đa cần lấy từ các cạnh đồ thị | `8` | `1` đến `20` |
| `graph.min_related_score` | Điểm tương đồng tối thiểu để thêm các cạnh đồ thị | `0.3` | `0.0` đến `1.0` |
| `vector.enabled` | Bật hoặc tắt chức năng tìm kiếm vectơ dự phòng | `true` | `true`, `false` |
| `live_sync.enabled` | Đồng bộ hóa các tệp ngữ cảnh tác nhân được tạo khi lưu | `true` | `true`, `false` |
| `global_git.enabled` | Bật tự động hóa đồng bộ hóa kho lưu trữ Git toàn cục | `false` | `true`, `false` |
| `global_git.remote` | Tên remote Git để đồng bộ hóa toàn cục | `origin` | Chuỗi |
| `global_git.branch` | Tên nhánh Git để đồng bộ hóa toàn cục | `main` | Chuỗi |

Các thiết lập này cũng có thể được quản lý trực quan trong tab **Construct** của `engram entry`.

## Sửa Chữa Và Đánh Giá

Sử dụng `repair` sau khi chỉnh sửa thủ công hoặc nhập dữ liệu:

```bash
engram repair
engram rebuild-index
engram verify
```

Sử dụng đồ thị và kiểm tra chất lượng trước khi lưu trữ (archive) bộ nhớ:

```bash
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Tiếp theo: [So sánh và lộ trình phát triển](../comparison/overview.md).

