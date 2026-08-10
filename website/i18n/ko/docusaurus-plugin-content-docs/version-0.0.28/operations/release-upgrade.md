---
title: 릴리스 및 업그레이드 프로세스
sidebar_position: 2
description: Engram 패키지를 업그레이드하고 메모리 루트를 안전하게 조정합니다.
---

# 릴리스 및 업그레이드 프로세스

## npm 패키지 업데이트 이후

다음 일반 Engram 명령이 실행될 때 조용히 새 버전에 맞게 이미 초기화된 작업 공간/글로벌 루트를 한 번 조정합니다. 이는 이전 메타데이터가 발견되었을 때 도움말 생성본, 메모리 인덱스, 그래프 파일, 적격한 벡터 사이드카를 새로고침하여 v0.0.8 이후 버전 간의 메모리 스키마 변경 사항을 반영합니다.

시작 검사는 첫 실행 이후에 의도적으로 가볍게 처리되도록 설계되었습니다. 현재 버전이 이미 기록되어 있다면 작은 설정 마커만 읽습니다. npm postinstall에서 실행되지 않으며, 새로운 메모리 루트를 생성하거나 사용자가 직접 작성한 파일을 대체하지도 않습니다. 일회성으로 건너뛰려면 `--no-auto-upgrade` 또는 `ENGRAM_NO_AUTO_UPGRADE=1`을 사용하십시오.

## 명시적 업그레이드

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

`engram upgrade`는 사용자가 작성한 파일을 보존하면서 생성된 작업 공간 도움말, 메모리 인덱스, 그래프 파일, 적격한 벡터 사이드카, 기존 Engram 생성 작업 공간 스킬셋 파일 및 등록된 글로벌 스킬셋을 새로고침합니다.

`engram upgrade --latest`는 더 강력합니다. 이미 연결된 작업 공간 에이전트 및 등록된 글로벌 설치에 대해 현재 Engram이 관리하는 연결된 에이전트 빌드 본(지침 파일, 규칙, MCP/플러그인 설정 및 관리 훅 포함)을 덮어써서 연결된 호스트가 새 패키지 출력을 즉시 반영하도록 합니다.

생성된 Engram 어댑터 파일을 의도적으로 대체할 때만 `--force`를 사용하십시오.

## 스킬셋 렌더 프로필

런타임 기능을 지원하는 호스트의 경우, Engram은 전체 프로토콜 대신 소형 부트스트랩 지침을 설치합니다. 훅은 라우팅된 작업 컨텍스트를 제공하고, MCP 도구는 로드/검색/제안 동작을 제공하며, 슬래시 어댑터나 Agent Skills는 상세한 명령 워크플로를 전달합니다. 신뢰할 수 있는 런타임 컨텍스트 주입이 없는 폴백 대상은 압축된 수동 지침을 계속 수신합니다.

## SQLite 설정 DB 폴백

Engram의 SQLite 설정 DB는 작업 공간/프로필 관리를 위한 최적화 레이어입니다. DB를 열거나 초기화할 수 없는 경우, 일반 읽기/쓰기 명령은 JSON 설정 스냅샷으로 폴백됩니다. DB 전용 명령은 일반 메모리 사용을 차단하는 대신 SQLite를 사용할 수 없음으로 보고합니다.

## 다음 단계

- [문제 해결](troubleshooting.md)
- [CLI: inject / link / upgrade](../cli/inject-link-upgrade.md)

## Legacy memory migration to schema v3

`engram upgrade --latest` also migrates active v1/v2 memory files in the workspace and configured global roots to schema v3. Engram preserves each Markdown body exactly, creates `<memory-file>.pre-v3.bak`, fills only deterministic metadata, refreshes integrity hashes, and rebuilds the index, graph, and eligible vector sidecars. It never invents `evidence_refs`; a memory without verified trace links is marked `evidence_status: unverified`. Invalid memories are reported and skipped, archived memories are not rewritten, and a second run is idempotent.

Preview all changes without writing:

```bash
engram upgrade --latest --plan
```

Run only the memory migration, without overwriting linked agent artifacts:

```bash
engram upgrade --migrate-memories
```

Skip memory migration during a latest upgrade:

```bash
engram upgrade --latest --no-migrate-memories
```

<!-- configuration-upgrade-inventory -->

충돌 검토는 CLI와 Entry에서 동일한 공유 플랜을 사용합니다. ngram upgrade --latest --review를 실행하여 유형별 최신 제안을 수락하거나, $VISUAL / $EDITOR를 통해 편집하거나, **Keep current**를 확인하세요. Entry는 **Current**, **Proposed**, **Diff** 뷰를 제공합니다. **Diff**는 기본적으로 **Inline**으로 설정되며 **Parallel**로 전환할 수 있습니다. 삭제된 콘텐츠는 빨간색으로, 추가된 콘텐츠는 녹색으로 강조 표시됩니다. pendingReviewCount가 0이 아닌 동안에는 최종 적용이 차단되며, ngram upgrade --latest --yes는 미해결되거나 만료된 결정을 거부합니다. 각 결정은 쓰기 전에 소스 해시와 비교 검증됩니다.

## 소유권 인식 구성 조정

최신 업그레이드 인벤토리는 물리적 파일별로 등록된 통합의 중복을 제거합니다. 여러 호스트가 동일한 Engram 가이드를 공유하는 경우 Engram은 해당 파일을 한 번만 렌더링하고 기록합니다.

수동 편집으로 인해 정상적인 교체가 안전하지 않은 경우, Entry는 소유권을 증명할 수 있는 경우에만 **Force upgrade**를 제공합니다. 표시된 Engram 블록의 경우 강제 교체는 해당 Engram 블록만 교체하고 주변 사용자 텍스트를 보존합니다. 등록/생성된 Engram 파일의 경우 강제 교체는 생성된 파일 전체를 교체할 수 있습니다. 알 수 없는 소유권은 일괄 처리로 강제 실행되지 않습니다.

쓰기 후 재검색을 통해 성공적인 적용이 검증됩니다. current로 수렴되지 않는 예상 업데이트 아티팩트는 검증 오류로 보고됩니다.

## Git author identity

Engram can store a global author and an optional workspace override. Resolution is workspace, global, then read-only Git fallback. Settings affect future memories only; a workspace override never changes global Git configuration. Use explicit plan and confirmation for global Git sync or legacy-memory migration.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Read the complete [Git author settings guide](../operations/git-author-settings.md).
