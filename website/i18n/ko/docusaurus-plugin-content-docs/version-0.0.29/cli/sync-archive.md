---
title: sync / clone-memory / archive
sidebar_position: 7
description: 범위 간 메모리 이동을 위한 sync, clone, archive 명령.
---

# sync / clone-memory / archive

범위 간에 메모리를 이동하고 잘못된 메모리를 안전하게 정리합니다.

## clone-memory

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
engram clone-memory workspace global --metacognize
```

워크스페이스와 글로벌 범위 간에 `rules/`, `skills/`, `knowledge/`의 활성 Markdown을 복사합니다. 복제된 메모리가 그대로 복사되는 대신 save-session 승인 흐름을 통해 제안되도록 하려면 `--metacognize`를 추가하세요.

에이전트는 자연어 복제 요청을 `engram clone-memory`로 정규화할 수 있습니다 (예: "clone workspace memory to global" -> `engram clone-memory workspace global`). 글로벌 메모리를 워크스페이스로 복제하려면 범위를 반대로 지정하세요. 사용자가 대상 복제본을 덮어쓰도록 명시적으로 요청한 경우에만 `--force`를 사용하세요.

## archive

```bash
engram archive --reason "<why>" <id-or-file>
```

잘못되었거나 대체된 메모리를 보관합니다. 파일은 승인 후에만 활성 라우팅에서 제외되며 `archive/` 아래에 보존됩니다. 감사 목적을 위해 삭제(delete) 대신 보관(archive)을 사용하세요.

## observe (inbox)

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe`는 정제된 원시 메모를 `inbox/`에 저장합니다. 수신함 메모는 활성 메모리가 아닙니다.

## 글로벌 Git 동기화 {#global-git-sync}

글로벌 Git 동기화는 `global_git.*` 구성 필드에 의해 제어됩니다. 각 필드에 대한 자세한 내용은 [Entry Web UI: Construct 탭](../entry/construct.md)을 참조하세요. 해결된 Git 감지 상태를 검사하려면 `engram entry` 및 Construct 탭 또는 `engram config view`를 사용하세요.

## 다음 단계 {#next-steps}

- [프로필 / 워크스페이스 / 구성](profiles-workspaces-config.md)
- [운영: 팀 Git 워크플로](../operations/team-git-workflow.md)
