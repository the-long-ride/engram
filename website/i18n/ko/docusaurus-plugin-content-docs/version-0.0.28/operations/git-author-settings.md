---
title: Git 작성자 설정
sidebar_position: 2
description: 향후 Engram 메모리 및 Git 커밋에 기록될 식별 정보를 설정합니다.
---

# Git 작성자 설정

Engram은 작성자 프로필을 보유하여 메모리 저작권을 명시적이고 이식 가능하게 만듭니다.

<!-- future-memories-only -->
작성자 설정은 **향후 메모리에만** 영향을 미칩니다.

<a id="global-author"></a>
## 글로벌 작성자

모든 워크스페이스에 대한 기본 Engram 식별 정보를 설정합니다:

```bash
engram author set --name "Jane Doe" --email "jane@example.com"
engram author show
engram author --help
engram author set --help
```

새 파일은 별도의 `author_name` 및 `author_email` 필드를 사용합니다.

<a id="workspace-override"></a>
## 워크스페이스 재정의

워크스페이스는 글로벌 Engram 프로필을 재정의할 수 있습니다:

```bash
engram author set --scope workspace --name "Workspace Jane" --email "jane@work.com"
engram author show --scope workspace
```

<!-- workspace-never-syncs-global-git -->
워크스페이스 재정의는 글로벌 Git 설정을 동기화하지 않습니다.

<a id="resolution-order"></a>
## 확인 순서

```bash
engram author show
engram author show --json
engram author show --help
```

Engram은 다음 순서로 식별 정보를 확인합니다:
1. 워크스페이스 Engram 작성자
2. 글로벌 Engram 작성자
3. 읽기 전용 Git 대체
4. 미해결

Entry에서는 `WORKSPACE`, `GLOBAL`, `GIT`, `UNRESOLVED` 뱃지가 표시됩니다.

<a id="remove-an-author-profile"></a>
## 작성자 프로필 제거

```bash
engram author unset --scope workspace
engram author unset --scope global
engram author unset --help
```

`engram author unset --scope workspace` 또는 `--scope global`을 사용하세요.

<a id="global-git-configuration"></a>
## 글로벌 Git 구성

Entry는 **설정 → Git**의 글로벌 탭에만 구성을 노출합니다.

<a id="sync-to-global-git"></a>
## 글로벌 Git으로 동기화

```bash
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author sync-git-global --help
```

글로벌 프로필만 동기화할 수 있습니다. 먼저 미리보고 `--confirm`을 사용하여 실행하세요.

<a id="migrate-existing-memories"></a>
## 기존 메모리 마이그레이션

```bash
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

`engram author migrate-memories --plan`을 사용하고 `--confirm`으로 적용하세요.
