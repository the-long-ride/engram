# Giao Thuc Memory Do Con Nguoi So Huu

Engram khong chi la "agent memory." No la giao thuc giup memory co the inspect, portable va do con nguoi quan tri.

## Hop Dong Cot Loi

Markdown la memory ben vung.

JSON index va graph la lop tang toc.

Approval la ranh gioi niem tin.

Hashes la kiem tra toan ven.

Ignore rules la dieu khien rieng tu.

Git la portability va audit history.

Agent adapters la tien ich, khong phai quyen luc.

Agent co the de xuat memory, nhung con nguoi so huu thu se tro thanh memory.

## Loai Memory

| Loai | Dung khi |
| --- | --- |
| Rule | preference, correction, constraint, always/never guidance |
| Skill | workflow lap lai, checklist, procedure, runbook |
| Knowledge | fact khach quan, quyet dinh, chi tiet implementation |

Moi active memory file co cac muc `Context`, `Content`, va `Example`. Rule memory co gioi han dong de loaded guidance van gon va co ich.

## Flow Ghi

1. Agent de xuat mot hoac nhieu candidate.
2. Engram parse loai candidate va scope.
3. Engram kiem tra schema, secrets, prompt-injection va path safety.
4. Con nguoi thay preview.
5. Con nguoi tra loi `A`, `A 1,3`, `B <note>`, hoac `C`.
6. Chi memory duoc duyet moi ghi.
7. Index, graph, hashes va changelog duoc refresh.

## Flow Doc

1. Engram load workspace va global index neu co.
2. Workspace thang global duplicate.
3. Ignore rules va role filters an entry khong lien quan.
4. Graph-aware routing chon context pack gon.
5. Hash va safety checks chay truoc khi in content.

## Vi Sao Quan Trong

Neu khong co protocol, memory de thanh invisible state. Invisible state kho review, kho share, va de bi agent lam sai lech.

Engram co tinh lam memory "binh thuong": files, diffs, hashes, review gates, va command con nguoi chay lai duoc.

Tiep theo: [Operations](operations.md).

