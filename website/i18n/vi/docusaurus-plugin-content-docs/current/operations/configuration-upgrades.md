---
title: Nâng cấp cấu hình
sidebar_position: 3
description: Xem trước, rà soát và nâng cấp an toàn các bộ nhớ do Engram quản lý cùng cấu hình của các agent đã kết nối.
---

# Nâng cấp cấu hình

Engram dùng một engine kiểm kê nâng cấp duy nhất cho CLI và Entry Web UI. Engine quét các phạm vi **workspace** và **global** đã cấu hình, phân loại các hiện vật do Engram quản lý, xây dựng một kế hoạch mang tính xác định, và dùng hash/fingerprint để ngăn việc ghi trên dữ liệu đã lỗi thời.

```bash
engram upgrade --latest --plan
engram upgrade --latest --review
engram upgrade --latest
engram upgrade --latest --yes
engram upgrade --help
```

`--plan` chỉ đọc. Đầu ra dành cho người đọc được nhóm theo loại hiện vật theo thứ tự: Config, Instructions, Memories, Skillsets, Hooks, Plugins. `--plan --json` trả về cùng kế hoạch đã nhóm, fingerprint của nó, các trạng thái rà soát và `pendingReviewCount`. Các tab loại trong UI dùng đúng các nhãn `All`, `Config`, `Instructions`, `Memories`, `Skillsets`, `Hooks`, `Plugins`.

## Engram phát hiện những gì

Bản kiểm kê bao gồm các hiện vật `memory`, `instruction`, `skillset`, `config`, `hook` và `plugin` tại các vị trí Engram đã biết hoặc trong các bản cài đặt agent đã kết nối và được đăng ký. Thư mục gốc workspace và global được quét riêng biệt; Engram không quét đệ quy các cây thư mục tùy ý trong thư mục home.

Trước hết Engram tin vào metadata schema/phiên bản tường minh và metadata cài đặt đã đăng ký. Các tệp cũ không có dấu hiệu nhận biết sẽ dùng cấu trúc được quản lý đã biết và nội dung kỳ vọng để đối chiếu. Mỗi mục được phân loại là `current`, `outdated`, `conflict` hoặc `invalid`.

## Thay thế và hợp nhất theo từng loại

Xung đột nghĩa là **cần rà soát**, không phải bị chặn vĩnh viễn. Engram giữ nguyên các chỉnh sửa của người dùng cho đến khi người dùng xác nhận quyết định thay thế/hợp nhất.

- **Instructions:** Engram đề xuất khối được quản lý mới nhất và giữ nguyên văn bản của người dùng nằm ngoài các marker của Engram. Một tệp instruction hoàn toàn thuộc sở hữu của Engram có thể bị thay thế toàn bộ.
- **Skillsets:** Engram đề xuất nội dung mới nhất do Engram quản lý. Các phần được nêu rõ là của người dùng sẽ được giữ nguyên khi định dạng hỗ trợ.
- **Config:** Engram phân tích cấu hình và đề xuất một bản migration đã hợp nhất: các khóa Engram đã biết được nâng cấp, các giá trị mặc định mới được thêm khi cần, và các khóa/giá trị không liên quan của người dùng được giữ nguyên.
- **Memories:** Engram thực hiện migration schema thay vì thay thế theo mẫu.
- **Hooks/plugins:** các hiện vật được tạo tự động chỉ bị thay thế khi chứng minh được quyền sở hữu. Mã người dùng không rõ ràng chỉ dành cho rà soát và có thể được xác nhận là **Keep current**.

## Rà soát xung đột trên Entry Web UI

Trang Updates nay dùng một dashboard gọn: **biểu ngữ trạng thái** cho biết cấu hình đã mới nhất, cần cập nhật hay cần rà soát xung đột; các thẻ tóm tắt **Workspace**, **Global** và **Conflicts** hiển thị nhanh các số liệu quan trọng. Sau khi xem trước, mọi mục có thể xử lý đều xuất hiện trong một **bảng hiện vật có thể xử lý** với các cột Artifact, Scope, Agent(s), Status, Review và Actions. Bảng giữ nguyên cấu trúc trên màn hình hẹp và dùng một vùng **cuộn ngang** dùng chung thay vì thanh cuộn riêng cho từng hàng.

Mở `engram entry`, sau đó chọn **Settings → Updates**. Hành động **copy command** ở thanh bên sao chép `engram upgrade --latest --plan` mà không cần chuyển trang. Phần xem trước có `All` cùng các tab loại chỉ gồm những loại có mục cần xử lý: `Config`, `Instructions`, `Memories`, `Skillsets`, `Hooks` và `Plugins`.

Mọi xung đột đều có hành động **Review**. Hộp thoại cung cấp các chế độ xem **Current**, **Proposed** và **Diff**. **Current** chỉ đọc. **Proposed** có thể chỉnh sửa đối với các mục Config/Instruction/Skillset có thể thay thế và bắt đầu từ kết quả hợp nhất/thay thế theo từng loại của Engram. **Diff** mặc định là **Inline** và có thể chuyển sang **Parallel**. Inline đánh dấu các dòng bị xóa bằng `-` trên nền đỏ và các dòng được thêm bằng `+` trên nền xanh lá; Parallel căn các dòng **Current** và **Proposed** song song với cùng cách tô màu đỏ/xanh. Dùng **Use latest**, **Reset proposed**, **Keep current**, hoặc—khi Engram chứng minh được quyền sở hữu—**Force upgrade**, rồi chọn **Confirm change**.

**Open in editor** mở đúng hiện vật hiện tại do server xác định, dùng `$VISUAL`, rồi đến `$EDITOR`, rồi đến phương án dự phòng của nền tảng. Trình duyệt không bao giờ cung cấp đường dẫn hệ thống tệp. Với **Instructions**, **Proposed** chỉ chứa khối được quản lý `<!-- engram:start -->`; toàn bộ skillset global vẫn nằm trong hướng dẫn đi kèm `.agents/engram.md`. Nếu chỉnh sửa bên ngoài làm thay đổi tệp, hash xem trước/nguồn trở nên lỗi thời và phải làm mới bản rà soát trước khi xác nhận.

Các xung đột có thể thay thế và đang chờ xử lý đủ điều kiện sẽ có ô chọn. **Select all visible** chọn các hàng đủ điều kiện trong tab loại đang mở; lựa chọn được giữ lại khi chuyển tab. **Confirm selected changes** chấp nhận **Use latest** cho các hàng đã chọn, còn **Confirm all changes** chấp nhận **Use latest** cho mọi xung đột đang chờ đủ điều kiện trong toàn bộ bản xem trước. Các hàng không thể thay thế, đã lỗi thời hoặc đã được rà soát thì không thể chọn. Server kiểm tra toàn bộ lô dựa trên fingerprint của bản xem trước, hash nguồn (source hash) hiện tại, trạng thái rà soát và các đề xuất đã tạo, trước khi thực hiện một lần ghi nguyên tử vào kho rà soát. Nếu bất kỳ mục nào được chọn không qua kiểm tra, sẽ không có quyết định nào của lô được lưu.

Entry dùng cùng kiểu ô chọn tùy biến trong toàn bộ phần rà soát nâng cấp: các trạng thái đã chọn, đang focus bàn phím và bị vô hiệu hóa đều phân biệt rõ ràng. Thông báo (toast) phản hồi kết quả dùng viền/ánh sáng xanh lá cho thành công và đỏ cho lỗi.

Trang hiển thị tiến độ rà soát. Nút Upgrade cuối cùng vẫn bị vô hiệu hóa cho đến khi mọi xung đột được giải quyết rõ ràng bằng một trong các cách: chấp nhận bản mới nhất, đề xuất đã chỉnh sửa, **Force upgrade** hoặc **Keep current**. Bước xác nhận cuối cùng tóm tắt các cập nhật tự động, đề xuất đã chấp nhận, đề xuất đã chỉnh sửa, các lần thay thế cưỡng bức, các tệp giữ nguyên hiện tại và các bản sao lưu.

## Force upgrade theo quyền sở hữu

Engram chuẩn hóa bản kiểm kê nâng cấp của agent đã kết nối theo **tệp vật lý**, vì vậy một hướng dẫn dùng chung như `.agents/engram.md` chỉ được biểu diễn một lần, ngay cả khi Codex, Claude, Gemini hoặc một host đã đăng ký khác cùng trỏ tới nó. Danh sách host vẫn hiển thị như metadata, nhưng mỗi tệp vật lý chỉ nhận một đầu ra renderer chuẩn và một giao dịch ghi.

**Force upgrade** được cố ý giới hạn hẹp hơn **Use latest**. Hành động này chỉ xuất hiện khi Engram chứng minh được ranh giới quyền sở hữu:

- **Managed region:** Engram chỉ thay thế khối Engram được đánh dấu và giữ nguyên mọi byte do người dùng viết nằm ngoài khối, bao gồm cả kiểu xuống dòng CRLF/LF của tệp.
- **Generated file:** Engram có thể thay thế toàn bộ tệp Engram đã đăng ký/được tạo, kể cả các chỉnh sửa thủ công bên trong tệp thuộc sở hữu Engram đó.
- **Unknown ownership:** không có hành động Force upgrade; hãy dùng **Keep current** hoặc giải quyết sự mơ hồ về quyền sở hữu trước.

Các điều khiển hàng loạt không bao giờ ép buộc. **Confirm selected changes** và **Confirm all changes** chỉ giới hạn ở các quyết định **Use latest** an toàn. Các quyết định force được rà soát từng mục một và bị từ chối nếu hash nguồn, bằng chứng quyền sở hữu hoặc chế độ force thay đổi sau khi xem trước.

Sau khi ghi xong, Engram quét lại các hiện vật vật lý đã nâng cấp. Các mục được kỳ vọng đã cập nhật phải hội tụ về `current`; một giao dịch thất bại hoặc bị rollback, hay một mục vẫn ở trạng thái `outdated`/`conflict`, sẽ khiến toàn bộ lần áp dụng báo lỗi thay vì hiển thị toast thành công. Các mục **Keep current** tường minh được loại khỏi yêu cầu hội tụ này.

## Rà soát xung đột bằng CLI

Chạy:

```bash
engram upgrade --latest --review
```

Trình rà soát tương tác xử lý từng xung đột chưa giải quyết một:

```text
[V] View diff
[E] Edit proposed content
[L] Accept latest proposal
[K] Keep current
[Q] Save and quit
```

`E` mở một tệp đề xuất tạm thời bằng `$VISUAL`, rồi đến `$EDITOR`, rồi đến phương án dự phòng của nền tảng. Engram kiểm tra đề xuất đã chỉnh sửa trước khi chấp nhận. Các quyết định được lưu trong state của Engram theo fingerprint của kế hoạch, vì vậy `Q` có thể dừng phiên và lần `--review` sau sẽ tiếp tục với các quyết định đã lưu.

Dành cho tự động hóa:

```bash
engram upgrade --latest --yes
```

`--yes` không bao giờ tự đưa ra quyết định cho xung đột. Nếu còn bất kỳ xung đột nào đang chờ hoặc đã lỗi thời, Engram thoát với mã khác 0 và yêu cầu bạn chạy `engram upgrade --latest --review`.

## Bảo vệ chống rà soát lỗi thời

Mỗi mục đã rà soát đều ghi lại hash nguồn của nó. Trước khi áp dụng, Engram so sánh hash nguồn hiện tại với hash nguồn lúc rà soát. Nếu tệp thay đổi sau khi rà soát, quyết định đó trở thành lỗi thời/đang chờ và phải được rà soát lại. Fingerprint của kế hoạch cũng ngăn việc áp dụng một bản kiểm kê khác với bản đã được rà soát.

## Nhóm giao dịch, sao lưu và rollback

Các thay thế và hợp nhất đã chấp nhận dùng cùng đường giao dịch với các nâng cấp tự động an toàn. Engram lưu lại byte gốc và quyền truy cập, tạo bản sao lưu khi cần, kiểm tra nội dung đề xuất, ghi qua một tệp tạm rồi đổi tên nguyên tử vào đúng vị trí. Một biến đổi bền vững thất bại sẽ rollback nhóm giao dịch của nó. **Keep current** không thực hiện ghi.

## Vector index theo kiểu fail-open

Tìm kiếm vector là một lớp tăng tốc tùy chọn. Engram gán các khóa chính `memory_vectors` của `sqlite-vec` bằng các giá trị `BigInt` tương thích số nguyên. Nếu việc dựng lại vector thất bại, Engram xóa sidecar/WAL/SHM vector chưa hoàn chỉnh, báo cảnh báo suy giảm, và tiếp tục nâng cấp lexical/graph bền vững. Một lỗi chỉ riêng ở vector không thể làm hủy một lần nâng cấp cấu hình vốn hợp lệ.

## Phiên bản package so với trạng thái cấu hình

Một package npm mới và cấu hình cục bộ lỗi thời là hai tín hiệu riêng biệt. Quy trình phát hành được khuyến nghị:

```bash
npm install -g @the-long-ride/engram@latest
engram upgrade --latest --plan
engram upgrade --latest --review
engram upgrade --latest
```

Chạy lại nâng cấp là idempotent đối với các hiện vật đã mới nhất. Các tệp `Keep current` đã rà soát vẫn không bị động tới trừ khi trạng thái của chúng thay đổi và cần một lần rà soát mới.
