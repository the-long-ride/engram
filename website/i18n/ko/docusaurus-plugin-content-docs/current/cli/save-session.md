---
title: save / save-session / observe
sidebar_position: 3
description: 쓰기 명령 — 단일 메모리 저장, 세션에서 여러 메모리 저장 및 원시 메모 캡처.
---

# save / save-session / observe

쓰기 명령은 승인 게이트를 통해 메모리를 제안합니다.

## save

```bash
engram save [rule|workflow|knowledge] "<text>"
engram save --role frontend "<text>"
engram save --scope global "<text>"
```

`engram save`는 가장 적합한 단일 메모리 후보를 캡처하고, 일치하는 메모리를 자동으로 업데이트하거나 새 메모리를 생성하며, 쓰기 전에 항상 A/B/C 승인 게이트를 표시합니다.

`engram save`가 관련 활성 메모리를 찾는 경우 승인 미리보기에서 제안된 `depends_on` 또는 중복 경고 가능성을 보고합니다.

## save-session

```bash
engram save-session
engram ss
engram save-session --query-level 3
engram ss -a
engram ss -a last 50 sessions
engram save-session --file transcript.md
engram save-session --accept-all
```

긴 상호 작용으로 여러 후보가 생성된 경우 `save-session`을 사용합니다:

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...`는 선택 사항입니다. 메모리가 존재하는 이유를 설명하는 경우에만 추가합니다. 관련 메모리를 재구성할 때 후보가 `DEPENDS_ON`, `LEVEL` 또는 `UPDATE` 필드를 추가할 수도 있습니다.

- `--query-level <n>` — 액세스 가능한 최근 인간-에이전트 대화를 최대 n개까지 마이닝합니다. 양의 정수여야 하며 에이전트는 사용할 수 없는 기록을 꾸며내서는 안 됩니다.
- `--accept-all` / `-a` — 인간이 바로 가기를 명시적으로 승인했으므로 생성된 모든 후보가 저장됩니다.
- `--file <path>` — 이미 디스크에 있는 전사본 또는 긴 요약의 경우

`/engram take-control --accept-all` 또는 일반적인 `/engram take control accept all` 요청의 경우, 슬래시 어댑터는 어구를 표준화하고 간결한 `TYPE: ... | TEXT: ...` 후보만 생성하며 두 번째 승인 프롬프트 없이 Engram이 저장하도록 합니다.

## observe

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe`는 민감한 정보를 지운 원시 메모를 `inbox/`에 저장합니다. 보관함 메모는 활성 메모리가 아닙니다. 어떤 내용이 지속적인 메모리가 되어야 하는지 결정하기 전에 대략적인 메모를 보존하려는 경우 이 명령을 사용합니다.

## 관련 메모리 힌트

모두 수락 실행이 쓰기 전에 관련 메모리를 보고하는 경우, 아직 파일이 저장되지 않은 것입니다. 에이전트는 구조화된 후보를 사용하여 다시 실행해야 합니다:

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## 다음 단계

- [inject / link / upgrade](inject-link-upgrade.md)
- [개념: 쓰기 경로 및 승인](../concepts/write-path.md)
