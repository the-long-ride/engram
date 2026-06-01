# Quickstart Voi AI Agent

Hay dung Engram qua agent truoc. CLI van co, nhung trai nghiem tot nhat la: bao agent load memory, lam viec, roi de xuat memory ben vung khi co dieu dang luu.

## Tin Nhan Dau Session

Hoi agent:

```text
Dung Engram cho task nay. Load memory cho: <viec chung ta dang lam>.
```

Neu da cai slash adapter:

```text
/engram load "<current task>"
```

Agent nen tom tat memory ID/rule lien quan, khong paste tat ca file.

## Setup Duoc Khuyen Nghi

Hoi agent:

```text
Khoi tao Engram cho workspace nay, cai skillset dung cho agent nay,
va cho toi biet lenh tiep theo nen dung.
```

Agent co the chay:

```bash
engram init
engram help install-skillset
engram install-skillset <agent-name>
```

Muon dung ngay trong chat:

```text
Cai slash support de toi dung /engram truc tiep trong agent nay.
```

## Vong Lap Hang Ngay

Bat dau:

```text
/engram load "current task"
```

Khi can tim:

```text
/engram search "topic can nho"
```

Khi hoc duoc mot fact ben vung:

```text
/engram save knowledge
```

Khi ca session tao ra nhieu rule, fact hoac workflow:

```text
/engram save-session
```

Dang ngan:

```text
/engram ss
```

Chi dung accept-all khi ban thuc su muon:

```text
/engram ss -a
```

`-a` nghia la con nguoi chap nhan tat ca candidate do agent de xuat. Agent khong duoc tu them flag nay.

## Import Tri Thuc Co San

Neu repo da co `AGENTS.md`, `CLAUDE.md`, Cursor rules, notes, hoac docs:

```text
/engram take-control --plan
/engram take-control --all
```

Dung `--plan` truoc neu muon xem file duoc chon, file bi bo qua, uoc luong token va loai memory du kien.

## Global Memory

Dung global memory cho preference can theo ban qua nhieu repo:

```text
Thiet lap Engram global memory tai <path>, roi luu preference nay vao global:
Use pnpm for package management.
```

Agent co the dung:

```bash
engram init --global-only --global-path <path>
engram save --scope global "Use pnpm for package management."
```

## Giu Memory Khoe

Cuoi phien lam viec quan trong, hoi agent:

```text
Kiem tra Engram health, bao memory loi, va de xuat dieu nen save tu session nay.
```

Lenh huu ich:

```bash
engram verify
engram repair
engram graph "<topic>"
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

Tiep theo: [Giao thuc do con nguoi so huu](protocol.md).

