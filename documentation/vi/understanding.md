# Hieu Engram

Doc trang nay truoc phan command. Engram huu ich vi ai so huu memory, khong phai vi no co nhieu lenh.

## Mot Cau De Hieu

Engram la giao thuc file giup AI agent dung memory lau dai, trong khi con nguoi quyet dinh cai gi duoc luu ben vung.

## Engram La Gi

Engram la knowledge memory center cho:

- rule cua project
- quyet dinh cua team
- workflow lap lai
- facts ben vung
- preference ca nhan can di theo nhieu project

Memory la Markdown thuong. Index, graph, hash va adapter ton tai de giup Markdown do duoc tim, doc va bao ve tot hon.

## Engram Khong Phai Gi

Engram khong phai:

- bo nao an cua agent
- memory silo bi khoa trong mot vendor
- thay the cho tai lieu project
- vector database dong vai source of truth
- may ghi am tu dong luu moi thu mai mai

Agent co the de xuat memory. Con nguoi duyet, tu choi, sua, archive va so huu memory.

## Loi Hua Cot Loi

Engram co gang lam AI memory:

- review duoc: doc bang editor binh thuong
- portable: sync bang Git va dung voi nhieu agent
- sua duoc: memory sai co the archive kem ly do
- rieng tu mac dinh: ignore rules va approval gate ngan ghi nham
- co y don gian: Markdown de tin hon state an cua platform

## Cac Lop

| Lop | Y nghia |
| --- | --- |
| Markdown | source of truth ben vung |
| JSON index | lop tim nhanh |
| JSON graph | lop route theo topic va quan he |
| Hashes | kiem tra toan ven |
| Approval | ranh gioi niem tin truoc khi ghi |
| Ignore rules | kiem soat rieng tu |
| Git | lich su, portability, review, recovery |
| Agent adapters | lop tien ich cho Codex, Claude, Cursor, Gemini va agent khac |

JSON duoc tao ra giup agent tim memory nhanh hon, nhung khong phai quyen uy. Neu JSON khac Markdown, Markdown thang.

## Vong Doi Memory

1. Session, file hoac note cua human co tri thuc huu ich.
2. Agent de xuat memory candidate ngan gon.
3. Human chap nhan tat ca, chon mot so, them note, hoac tu choi.
4. Engram ghi Markdown da duyet.
5. Engram cap nhat hash, index, graph va changelog.
6. Agent tuong lai chi load memory lien quan task hien tai.
7. Neu memory sai, Engram archive no kem ly do.

Vong doi nay giu memory huu dung ma khong bien no thanh state vo hinh.

## Human, Agent, Engram, Git

| Ben | Vai tro |
| --- | --- |
| Human | quyet dinh cai gi thanh memory ben vung |
| Agent | nhan ra pattern va de xuat candidate |
| Engram | enforce schema, safety, routing, approval va maintenance |
| Git | dua memory giua may va tao lich su review |

Agent huu ich, nhung agent khong phai chu so huu.

## Memory Tot

Memory tot trong Engram:

- on dinh du de dung tuan sau
- cu the du de route lai
- ngan du de load vao agent context
- an toan voi scope du kien
- ro la rule, workflow hoac knowledge

Memory xau la noise tam thoi, secret, credential, suy doan mot lan, hoac fact chua ai duyet.

## Scope

Workspace memory nam tai:

```text
<project>/.agents/.engram/
```

Global memory la tuy chon va nam o noi user cau hinh.

Workspace thang. Global la fallback cho preference dung lai, thoi quen ca nhan, hoac mac dinh cua team.

## Vi Sao Khong Chi Dung Memory Tich Hop

Memory tich hop tien loi, nhung thuong kho doc, diff, export, share hoac sua. No hay thuoc ve mot app hoac mot tai khoan.

Engram lam lop ben vung thanh ro rang. Memory tich hop van co ich, nhung khi tri thuc quan trong, Engram nen la source do human so huu.

## Gioi Han Can Biet

Search mac dinh la lexical deterministic search. `engram search --semantic` dung local similarity deterministic, khong phai embedding-backed semantic search. Graph vector la local hashed word vector, khong phai semantic embedding. Contradiction detection chi mang tinh goi y. Encryption config da co, nhung encrypted storage chua duoc implement.

Nhung gioi han nay duoc noi thang. Engram nen cho user biet cai gi co that hom nay va cai gi la future work.

Tiep theo: [Quickstart voi AI agent](quickstart.md).
