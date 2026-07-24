---
title: sync / clone-memory / archive
sidebar_position: 7
description: 범위 간에 메모리를 이동하기 위한 동기화, 복제 및 보관 명령.
---

# sync / clone-memory / archive

범위 간에 메모리를 이동하고 잘못된 메모리를 안전하게 중단합니다.

## clone-memory

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
engram clone-memory workspace global --metacognize
```

작업 공간과 글로벌 범위 간에 활성 `rules/`, `skills/` 및 `knowledge/` Markdown을 복사합니다. 복제된 메모리가 있는 그대로 복사되는 대신 save-session 승인 흐름을 통해 제안되도록 하려면 `--metacognize`를 추가합니다.

에이전트는 일반적인 복제 요청을 `engram clone-memory`로 표준화할 수 있습니다. (예: "clone workspace memory to global" -> `engram clone-memory workspace global`) 범위를 반대로 하여 글로벌 메모리를 작업 공간에 복사합니다. 인간이 대상 복사본을 덮어쓰도록 명시적으로 요청한 경우에만 `--force`를 사용합니다.

## archive

```bash
engram archive --reason "<why>" <id-or-file>
```

잘못되거나 대체된 메모리를 보관합니다. 파일은 승인 후에만 활성 라우팅을 떠나며 `archive/` 아래에 보존됩니다. 감사 가능성을 위해 삭제 대신 보관을 사용하십시오.

## observe (inbox)

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe`는 민감한 정보를 지운 원시 메모를 `inbox/`에 저장합니다. 보관함 메모는 활성 메모리가 아닙니다.

## 글로벌 Git 동기화

글로벌 Git 동기화는 `global_git.*` 구성 필드에 의해 제어됩니다. 각 필드에 대한 내용은 [Entry Web UI: Construct 탭](../entry/construct.md)을 참조하십시오. `engram entry` 런타임 탭을 사용하여 확인된 Git 감지를 검사합니다.

## 다음 단계

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [작업: 팀 Git 워크플로우](../operations/team-git-workflow.md)
