---
title: 릴리스 및 업그레이드 과정
sidebar_position: 2
description: Engram 패키지를 업그레이드하고 메모리 루트를 안전하게 조정합니다.
---

# 릴리스 및 업그레이드 과정

## npm 패키지 업데이트 후

패키지를 업데이트한 뒤 처음 실행하는 일반 Engram 명령은 이미 초기화된 워크스페이스/글로벌 루트를 새 버전에 맞게 한 번 조용히 조정합니다. 이전 메타데이터가 감지되면 생성된 도움말, 메모리 인덱스, 그래프 파일, 대상이 되는 벡터 사이드카를 갱신하므로 v0.0.8 이후 릴리스 간 메모리 스키마 변경을 처리합니다.

시작 시 점검은 첫 실행 이후에는 의도적으로 가볍게 동작합니다. 현재 버전이 이미 기록되어 있으면 작은 설정 마커만 읽습니다. npm postinstall에서는 실행되지 않으며, 새 메모리 루트를 만들지 않고, 사람이 작성한 파일을 교체하지 않습니다. 특정 명령에서 건너뛰려면 `--no-auto-upgrade` 또는 `ENGRAM_NO_AUTO_UPGRADE=1`을 사용하세요.

## 명시적 업그레이드

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

`engram upgrade`는 사람이 작성한 파일은 그대로 유지하면서 생성된 워크스페이스 도움말, 메모리 인덱스, 그래프 파일, 대상 벡터 사이드카, 이미 존재하는 Engram 생성 워크스페이스 스킬셋 파일, 등록된 글로벌 스킬셋을 갱신합니다.

`engram upgrade --latest`는 더 강력합니다. 이미 연결된 워크스페이스 에이전트와 등록된 글로벌 설치에 대해 현재 Engram이 관리하는 연결 에이전트 아티팩트(지침 파일, 규칙, MCP/플러그인 설정, 관리되는 훅 포함)를 덮어쓰므로, 연결된 호스트가 새 패키지 출력을 즉시 반영합니다.

`--force`는 생성된 Engram 어댑터 파일을 의도적으로 교체할 때만 사용하세요.

## 소유권을 고려한 설정 조정

최신 업그레이드 인벤토리는 등록된 통합을 물리적 파일 기준으로 중복 제거합니다. 여러 호스트가 같은 Engram 가이드를 공유하면, 호스트별 행이 서로를 덮어쓰지 않도록 Engram이 해당 파일을 한 번만 렌더링하고 기록합니다.

수동 편집 때문에 알려진 Engram 아티팩트를 일반 방식으로 교체하기 어려운 경우, Entry는 소유권을 증명할 수 있을 때만 **Force upgrade**를 제공할 수 있습니다. 표시된 Engram 블록에서는 강제 실행이 해당 블록만 교체하고 주변의 사용자 텍스트는 유지합니다. 등록되었거나 생성된 Engram 파일에서는 생성된 파일 전체를 교체할 수 있습니다. 소유권을 알 수 없으면 강제 실행은 불가능하며, 일괄 확인은 강제 작업을 수행하지 않습니다.

성공한 적용은 쓰기 후 다시 스캔하여 검증합니다. 롤백되었거나 실패한 트랜잭션, 그리고 업데이트되어야 하는데 `current`로 수렴하지 않은 아티팩트는 오류로 보고되며, 이런 경우 Entry는 업그레이드 성공 토스트를 표시하지 않습니다.

## 스킬셋 렌더 프로필

런타임을 지원하는 호스트에는 전체 프로토콜 대신 작은 부트스트랩 지침을 설치합니다. 훅이 라우팅된 작업 컨텍스트를 제공하고, MCP 도구가 로드/검색/제안 동작을 제공하며, 하나의 동반 가이드가 상세 워크플로를 담고, 슬래시 어댑터와 Agent Skills는 그 가이드를 가리키는 짧은 포인터 역할을 합니다. 신뢰할 수 있는 런타임 컨텍스트 주입이 없는 대체 대상에는 간결한 수동 지침이 그대로 제공됩니다.

## SQLite 설정 DB 대체 동작

Engram의 SQLite 설정 DB는 워크스페이스/프로필 관리를 위한 최적화입니다. DB를 열거나 초기화할 수 없으면 일반 읽기/쓰기 명령은 JSON 설정 스냅샷으로 대체됩니다. DB 전용 명령은 일반 메모리 사용을 막는 대신 SQLite를 사용할 수 없다고 보고합니다.


## 호스트 네이티브 릴리스의 변경 사항

기존 설치에서 `engram upgrade --latest`(또는 `engram link <host>`)를 실행하면 다음이 적용됩니다.

- **훅**: Claude와 Codex에 `SubagentStart`가 추가되고 Gemini에 `AfterTool`이 추가되며, 새 훅 항목은 각 호스트의 페이로드 상한을 준수합니다. Claude는 관리되는 `PreToolUse` 항목을 제거하고 `InstructionsLoaded`와 생성된 `.claude/rules/engram/` 규칙 파일을 추가합니다. 기존 동작을 유지하려면 먼저 `engram config set hooks.path_rules hook && engram link claude`를 실행하세요. 일반 `engram upgrade`는 훅 설정을 갱신하지 않습니다.
- **지침**: `link claude`는 관리되는 블록을 `AGENTS.md`에 기록하며 더 이상 `CLAUDE.md`를 만들지 않습니다. 기존 `CLAUDE.md` 블록은 유지됩니다. 생성되는 `SKILL.md` 파일은 이제 Agent Skills 사양을 따릅니다.
- **MCP**: 서버는 MCP 2026-07-28과 기존 핸드셰이크를 모두 지원하며, Claude Code와 Codex에서 `engram_commit`은 호출마다 확인이 필요합니다(`engram upgrade`가 관리되는 Codex 블록을 다시 기록합니다).
- **메모리 파일**: 새 메모리에는 `author_email`이 포함되지 않으며(기존 파일을 정리하려면 `engram author migrate-memories --strip-email --confirm` 실행), 규칙은 Content만 저장하고, 마이그레이션 백업은 gitignore된 `backups/` 폴더에 보관됩니다(`engram repair --move-backups`가 이전 백업을 옮겨 줍니다).
- **설정**: 새 설정에서는 `vector.enabled`의 기본값이 `false`이며, 이미 `true`로 저장된 설정은 그대로 켜져 있습니다. `cursorrules`는 한 릴리스 동안 `cursor-rules` 내보내기 형식의 지원 중단 별칭입니다.

전체 목록과 아직 완료되지 않은 항목은 [변경 로그](changelog.md)의 Unreleased 섹션을 참고하세요.

## 스키마 v3로의 기존 메모리 마이그레이션

`engram upgrade --latest`는 워크스페이스와 구성된 글로벌 루트의 활성 v1/v2 메모리 파일도 스키마 v3(schema v3)로 마이그레이션합니다. Engram은 각 Markdown 본문을 그대로 보존하고, `backups/schema-v3/<memory-file>.pre-v3.bak`을 기록하며(gitignore된 폴더이며, `engram repair --move-backups`가 메모리 옆에 남은 이전 백업을 옮겨 줍니다), 결정적인 메타데이터만 채우고, 무결성 해시를 갱신하며, 인덱스, 그래프, 대상 벡터 사이드카를 다시 빌드합니다. `evidence_refs`를 임의로 만들어 내지 않으며, 검증된 추적 링크가 없는 메모리에는 `evidence_status: unverified`가 표시됩니다. 유효하지 않은 메모리는 보고 후 건너뛰고, 아카이브된 메모리는 다시 기록하지 않으며, 두 번째 실행은 결과가 달라지지 않습니다(멱등).

쓰기 없이 모든 변경 내용을 미리 봅니다.

```bash
engram upgrade --latest --plan
```

연결된 에이전트 아티팩트를 덮어쓰지 않고 메모리 마이그레이션만 실행합니다.

```bash
engram upgrade --migrate-memories
```

최신 업그레이드 중 메모리 마이그레이션을 건너뜁니다.

```bash
engram upgrade --latest --no-migrate-memories
```

## 다음 단계

- [문제 해결](troubleshooting.md)
- [CLI: inject / link / upgrade](../cli/inject-link-upgrade.md)


## Git 작성자 정보

Engram은 글로벌 작성자와 선택적인 워크스페이스 재정의를 저장할 수 있습니다. 확인 순서는 워크스페이스, 글로벌, 그다음 읽기 전용 Git 대체값입니다. 설정은 앞으로 작성되는 메모리에만 적용되며, 워크스페이스 재정의는 글로벌 Git 설정을 바꾸지 않습니다. 글로벌 Git 동기화나 기존 메모리 마이그레이션에는 명시적인 계획 확인과 승인 절차를 사용하세요.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

전체 내용은 [Git 작성자 설정 가이드](git-author-settings.md)를 읽어 보세요.


<!-- configuration-upgrade-inventory -->

충돌 검토는 CLI와 Entry에서 동일한 공유 계획을 사용합니다. `engram upgrade --latest --review`를 실행하면 유형별 최신 제안을 수락하거나, `$VISUAL`/`$EDITOR`로 편집하거나, **Keep current**를 확인할 수 있습니다. Entry는 **Current**, **Proposed**, **Diff** 보기를 제공하며, **Diff**는 기본적으로 **Inline**이고 **Parallel**로 전환할 수 있습니다. 삭제된 내용은 빨강, 추가된 내용은 초록으로 강조됩니다. `pendingReviewCount`가 0이 아니면 최종 적용이 차단되고, `engram upgrade --latest --yes`는 해결되지 않았거나 오래된 결정을 거부합니다. 각 결정은 기록하기 전에 소스 해시와 대조하여 확인합니다.

## 설정 업그레이드 인벤토리

패키지를 업데이트한 후에는 `engram upgrade --latest`를 실행하기 전에 `engram upgrade --latest --plan`을 먼저 실행하세요. 공유 인벤토리는 워크스페이스와 글로벌에서 Engram이 관리하는 메모리, 지침, 스킬셋, 설정, 훅, 플러그인을 스캔합니다. 사용자가 작성한 바이트는 보존되며, 모호하게 섞인 파일은 적용 전에 명시적인 검토가 필요한 충돌로 보고됩니다. [설정 업그레이드](configuration-upgrades.md)를 참고하세요.
