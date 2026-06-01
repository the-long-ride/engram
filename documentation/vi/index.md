# Engram

Engram la mot giao thuc bo nho do con nguoi so huu cho AI agent. No giu tri thuc ben vung cua project, team va ca nhan trong cac file co the doc, review, dong bo va sua.

Engram khong phai "bo nao an" cua agent. Agent co the de xuat memory, nhung source of truth la Markdown da duoc duyet trong `.agents/.engram/` hoac thu muc global tuy chon.

## Van De Engram Giai Quyet

AI agent quen quyet dinh cua project, hoi lai setup, va tron context cu voi yeu cau moi. Bo nho tich hop san thuong bi khoa trong mot vendor, mot app, hoac mot may.

Engram tao mot hop dong on dinh:

- facts, rules va workflows da duyet nam trong Markdown
- index va graph giup route nhanh
- moi ghi memory can human approval
- hash cho thay sua doi khong an toan
- ignore rules bao ve context rieng tu
- Git cho lich su, portability va team review

## Mo Hinh Nhan Thuc

Hay xem Engram la knowledge memory center:

| Lop | Vai tro |
| --- | --- |
| Markdown | source of truth ben vung |
| JSON index | lop tim kiem nhanh |
| JSON graph | lop route topic va quan he |
| Approval gate | ranh gioi niem tin truoc khi ghi |
| Hashes | kiem tra toan ven truoc khi doc |
| Ignore rules | dieu khien rieng tu |
| Git | audit history va sync |
| Agent adapters | tien ich, khong phai quyen luc |

## Uu Tien Scope

Engram doc memory theo thu tu:

1. Workspace memory: `<project>/.agents/.engram/`
2. Global memory: `$ENGRAM_GLOBAL_DIR` hoac `engram init --global-path <path>`

Workspace thang. Global la fallback cho preference va team context dung lai giua nhieu repo.

## Hien Tai Co Gi

Engram gom:

- `save` de luu mot memory da duyet
- `save-session` / `ss` de luu nhieu memory tu mot session
- `observe` de ghi raw note chua thanh active memory
- `take-control` de import agent guidance va docs co san
- `graph` va `quality-check` de review tin hieu
- `archive` de dua memory sai/cu ra khoi routing
- `repair` de bao file memory loi bi index rebuild bo qua
- `benchmark` de kiem tra regression retrieval
- agent skillsets, slash adapters, va MCP-style proposal tools

Truoc khi dung command, doc trang khai niem: [Hieu Engram](understanding.md).

Tiep theo: [Quickstart voi AI agent](quickstart.md).
