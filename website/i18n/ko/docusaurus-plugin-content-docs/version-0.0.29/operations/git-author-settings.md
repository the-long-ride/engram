---
title: Git 작성자 설정
sidebar_position: 2
description: 앞으로 작성되는 Engram 메모리와 Engram이 만드는 Git 커밋에 기록될 작성자 정보를 설정합니다.
---

# Git 작성자 설정

Engram은 메모리 작성자를 명확하고 이식 가능하게 유지하기 위해 자체 작성자 프로필을 관리합니다. 확인된 이름은 앞으로 작성되는 메모리의 frontmatter에 기록되며(이메일은 `memory.include_author_email`이 `true`일 때만 기록), 전체 작성자 정보는 프로세스 로컬 환경 변수를 통해 Engram이 만드는 Git 커밋에 전달됩니다. 저장소의 Git 설정은 변경되지 않습니다.

<!-- future-memories-only -->
작성자 설정은 **앞으로 작성되는 메모리에만** 적용됩니다. 기존 메모리는 명시적인 마이그레이션 명령으로만 변경됩니다.

<a id="global-author"></a>
## 글로벌 작성자

모든 워크스페이스에 적용되는 기본 Engram 작성자 정보를 설정합니다.

```bash
engram author set --name "Jane Doe" --email "jane@example.com"
engram author show
engram author --help
engram author set --help
```

새 메모리 파일에는 `author_name`만 기록됩니다. 이메일은 작성자 프로필과 Git 커밋에만 남으므로 커밋되는 메모리 파일에는 포함되지 않습니다. 이메일도 함께 기록하려면 선택 사항인 `memory.include_author_email` 키(기본값 `false`)를 활성화하세요.

```bash
engram config set memory.include_author_email true
```

```yaml
author_name: Jane Doe
author_email: jane@example.com   # opt-in: only with memory.include_author_email: true
```

기존 메모리를 업데이트하면 작성자 필드가 다시 기록되므로, 이 옵션을 켜지 않은 상태에서는 다음 업데이트 때 기존의 `author_email`이 제거됩니다.

기존 형식인 `author: jane@example.com`은 계속 읽을 수 있지만, 새 메모리에는 기록되지 않습니다.

<a id="workspace-override"></a>
## 워크스페이스 재정의

워크스페이스는 다른 워크스페이스에 영향을 주지 않고 글로벌 Engram 프로필을 재정의할 수 있습니다.

```bash
engram author set --scope workspace --name "Workspace Jane" --email "jane@work.com"
engram author show --scope workspace
```

<!-- workspace-never-syncs-global-git -->
워크스페이스 재정의는 글로벌 Git 설정을 절대 변경하지 않습니다. 이 정보는 워크스페이스에 저장되며 해당 워크스페이스의 메모리와 Engram이 만드는 커밋에만 사용됩니다.

<a id="resolution-order"></a>
## 확인 순서

Engram은 다음 순서로 작성자 정보를 확인합니다.

1. 워크스페이스 Engram 작성자.
2. 글로벌 Engram 작성자.
3. 읽기 전용으로 확인한 유효 Git `user.name` 및 `user.email` 대체값.
4. 확인 불가.

```bash
engram author show
engram author show --json
engram author show --help
```

메모리를 쓰려면 유효하고 완전한 이름과 이메일이 필요합니다. Engram이 만드는 커밋에는 `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, `GIT_COMMITTER_EMAIL`이 전달되며, 로컬 및 글로벌 Git 설정은 변경되지 않습니다.

Entry에서는 확인된 이름 뒤에 간단한 출처 배지가 표시됩니다. 워크스페이스 재정의는 `WORKSPACE`, Engram 글로벌 프로필은 `GLOBAL`, Git 대체값은 `GIT`, 완전한 작성자 정보가 없으면 `UNRESOLVED`입니다.

<a id="remove-an-author-profile"></a>
## 작성자 프로필 제거

```bash
engram author unset --scope workspace
engram author unset --scope global
engram author unset --help
```

Web UI에서는 확인 절차가 필요합니다. CLI는 명시적인 `unset` 명령을 실행하면 프로필을 즉시 제거합니다. 제거 후에는 확인 순서상 다음 출처가 활성화됩니다.

<a id="global-git-configuration"></a>
## 글로벌 Git 설정 {#global-git-configuration}

Entry는 기존 글로벌 메모리 Git 설정을 **Settings → Git**의 **Global 탭에서만** 제공합니다. 이 설정은 계속 공유 설정 백엔드를 사용하므로, 컨트롤 위치를 옮겨도 별도의 Git 설정 저장소가 생기지 않습니다.

Global 탭에서는 `global_git.enabled`, `global_git.remote`, `global_git.remote_url`, `global_git.branch`, `global_git.auto_sync`, `global_git.auto_resolve`를 편집할 수 있습니다. 이 필드들은 위험도가 높으므로 Entry는 변경 내용을 검증하고, 바뀐 키를 정확히 보여 주며, 저장 전에 검토를 요구합니다. Workspace 탭에는 이러한 글로벌 컨트롤이 표시되지 않습니다.

<a id="sync-to-global-git"></a>
## 글로벌 Git으로 동기화

Engram 글로벌 프로필만 글로벌 Git 설정으로 복사할 수 있습니다. 먼저 미리 보기를 실행한 뒤 명시적으로 확인하세요.

```bash
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author sync-git-global --help
```

확인된 작업은 `git config --global user.name`과 `git config --global user.email`을 기록하고 두 값을 검증하며, 기록이나 검증이 하나라도 실패하면 이전 값을 그대로 복원합니다. 워크스페이스 프로필은 이 작업의 대상이 될 수 없습니다.

<a id="migrate-existing-memories"></a>
## 기존 메모리 마이그레이션

완전하고 결정적인 작성자 정보를 사용할 수 있을 때 `author_name`을 채워 넣습니다(`author_email`은 `memory.include_author_email`이 `true`일 때만).

```bash
engram author migrate-memories --plan
engram author migrate-memories --scope workspace --confirm
engram author migrate-memories --scope both --confirm
engram author migrate-memories --help
```

마이그레이션은 Markdown 본문을 그대로 유지하고, `backups/author-v3/` 아래에 `.pre-author-v3.bak` 백업을 만들며, 아카이브와 유효하지 않은 파일은 건너뛰고, 여러 번 실행해도 결과가 같습니다(멱등). 누락된 이름을 추측하는 일은 없습니다. 미리 보기 출력에는 쓰기 전에 대상, 최신 상태, 건너뜀, 유효하지 않음으로 분류된 파일이 나열됩니다.

이전 릴리스에서 이미 메모리 파일에 기록된 이메일을 제거하려면 strip 옵션을 사용하세요. `--strip-email`은 기본적으로 계획만 보여 주며 `--confirm`을 붙일 때만 기록합니다. `author_name`은 유지하고 `author_email`과 기존 `author:` 이메일을 제거하며, 해시와 인덱스를 갱신하고 원본을 `backups/author-strip-email-<date>/` 아래에 백업합니다.

```bash
engram author migrate-memories --strip-email --scope both
engram author migrate-memories --strip-email --scope both --confirm
```

이 릴리스에서 작성된 메모리는 이메일 없이 이름만 포함하므로 이전 버전의 Engram은 이를 인덱싱할 수 없습니다. 이름만 있는 메모리에 의존하기 전에 모든 팀원을 업그레이드하세요.

## Entry Web UI

`engram entry`를 열고 **Settings → Git**을 선택합니다. Global 및 Workspace 탭에는 저장된 프로필, 확인된 출처 배지, 저장 전 검토 대화상자, 메모리 마이그레이션 미리 보기가 표시됩니다. Global 탭에는 추가로 **Global Git configuration**과 명시적인 Git 동기화 미리 보기가 있으며, 이 컨트롤은 Workspace에서는 숨겨집니다. 모든 정보 버튼은 이 현지화된 페이지를 새 탭에서 열고 해당하는 CLI `--help` 명령을 보여 줍니다.

## 개인정보 보호와 문제 해결

이름은 Markdown과 Git 기록에 영구적인 메타데이터로 남습니다. 이메일 주소는 `memory.include_author_email`을 활성화하지 않는 한 메모리 파일에 포함되지 않습니다. 다만 Engram이 만드는 커밋에는 여전히 작성자 이메일이 포함되므로, 저장소의 공개 범위에 적합한 주소를 사용하세요. 저장 시 작성자를 확인할 수 없다고 나오면 `engram author show`를 실행하고, 글로벌 또는 워크스페이스 프로필을 설정하거나 Git 대체값을 구성하세요. 글로벌 Git 동기화는 자동으로 실행되지 않습니다.
