---
title: verify / repair / quality-check
sidebar_position: 6
description: 유지 관리 명령 — 해시 검증, 유효하지 않은 파일 복구, 품질 점검, 충돌 해결.
---

# verify / repair / quality-check

유지 관리 명령은 메모리를 건강한 상태로 유지합니다.

## status

```bash
engram status
engram stat
engram status --json
```

워크스페이스와 글로벌 메모리 루트, 활성 프로필, 연결된 호스트, 대기 중인 검토 영수증, working 계층 개수, 무결성/신선도 상태를 한 화면에 요약해 출력합니다. `engram stat`은 짧은 별칭이며, `--json`은 스크립트용 구조화 스냅샷을 출력합니다.

## verify

```bash
engram verify
engram verify --sources
engram verify --sources --json
```

무결성을 위해 해시를 확인합니다. 수동 편집이나 가져오기 후에 실행하세요.

`--sources`는 take-control 메모리의 `source_files`도 `source_hashes`와 다시 대조하여, 변경되었거나 누락된 항목을 로컬의 gitignore된 `.agents/.engram/stale.json`에 기록합니다. 오래된 소스 때문에 `verify`가 실패하는 일은 없습니다. `load`는 오래된 메모리의 순위를 낮추고 카드 끝에 ` (stale)`을 붙이며, `engram take-control --refresh`는 해당 메모리에 대한 업데이트를 제안합니다. 소스 경로는 워크스페이스 안에 있어야 하며, 절대 경로, `..`, 심볼릭 링크와 하드 링크, 비밀 파일, `.git`, Engram 데이터는 확인되지 않은 항목으로 보고되고 읽지 않습니다. `--json`에서 `skipped`는 `{key, reason}` 객체를 나열합니다. 글로벌 take-control 메모리는 출처가 된 워크스페이스를 기록하며 그 워크스페이스에서만 확인됩니다.

## stats

```bash
engram stats
engram stats --usage
engram stats --backfill [--git <range>] [--limit <n>]
```

`--usage`는 로컬의 gitignore된 `.agents/.engram/usage.json`을 읽어 가져오기 횟수(`engram load --id`), 폐쇄 루프 결과 카운터(`applied`, `corrected`, 그리고 `noisy` / 유용성 0 주입), 그리고 30일 동안 주입되었지만 한 번도 가져오지 않은 메모리를 보여 줍니다. `--backfill`은 Git 커밋 기록(`backfillUsageFromGit`을 통해 최근 비병합 커밋 분석, 선택적 `[--git <range>] [--limit <n>]`)에서 과거 사용량 텔레메트리를 `usage.json`으로 백필합니다.

## repair

```bash
engram repair
engram rebuild-index
```

수동 편집이나 가져오기 후에 `repair`를 사용하면 인덱스 재빌드에서 건너뛴 잘못된 형식의 메모리 파일을 찾을 수 있습니다.

```bash
engram repair --move-backups
engram repair workspace --move-backups --confirm
```

`--move-backups`는 `rules`, `skills`, `knowledge`에 흩어져 있는 `*.bak` 마이그레이션 백업을 gitignore된 `backups/<kind>-<label>/` 폴더(예: `backups/schema-v3/rules/x.md.pre-v3.bak`)로 옮기는 계획을 세웁니다. 실제로 옮기려면 `--confirm`을 추가하세요. 대상 위치에 이미 다른 파일이 있으면 충돌로 보고하고 그대로 둡니다. `engram doctor`는 이런 파일을 `memory.stray_backups`로 보고합니다.

## quality-check

```bash
engram quality-check
```

모순 후보를 간결하게 보고합니다. 모순 감지는 휴리스틱이며 참고용입니다.

## graph

```bash
engram graph "package manager"
engram graph --rebuild
engram graph link <parent-id> <child-id...>
```

아카이브하기 전에 그래프 라우팅을 점검하거나, `engram graph link <parent-id> <child-id...>`로 명시적 `depends_on` 선행 항목을 연결하거나, 수동 편집 후 `engram graph --rebuild`를 실행하세요.

## archive

```bash
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

잘못되었거나 대체된 메모리를 아카이브합니다. 감사 가능성을 위해 삭제하지 말고 아카이브를 사용하세요. 파일은 승인 후에야 활성 라우팅에서 빠지며 `archive/` 아래에 보존됩니다.

## resolve-conflicts

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
```

Engram이 소유한 워크스페이스 메모리 충돌만 미리 보거나 해결합니다. 충돌 처리 후 에이전트가 메모리 폴더를 검토하게 하려면 `--metacognize`를 추가하세요. 이 명령은 결정적 충돌 처리를 `.agents/.engram/` 범위로 제한한 뒤, 간결한 `TYPE/TEXT` 후보를 위한 워크스페이스 metacognize 소스 팩을 덧붙입니다.

## benchmark

```bash
engram benchmark <cases.json> --json
engram benchmark <cases.json> --baseline <baseline.json> --fail-on forbidden,recall
engram benchmark <cases.json> --write-report <report.json>
engram benchmark --from-git [--out <path>]
```

버전 관리된 검색 회귀 테스트 모음을 실행합니다. 여기에는 `freshness-ordering`(최신성 가산 및 주의 집중 기반 본문 정렬), `multi-turn-session`(여러 턴에 걸친 훅 토큰 절감), 그리고 `telemetry-loop`(`real-stacks-v1` 폐쇄 루프 결과 텔레메트리 및 노이즈 감쇠)가 포함됩니다. `--from-git [--out <path>]`로 최근 Git 기록에서 저장소 로컬 벤치마크 케이스를 생성하고, `--baseline`으로 저장된 지표와 비교하며, `--write-report`로 ID만 포함된 JSON 보고서를 작성하고, `--fail-on`으로 특정 회귀 발생 시 CI가 실패하도록 설정할 수 있습니다.

## 다음 단계 {#next-steps}

- [sync / archive](sync-archive.md)
- [운영 문제 해결](../operations/troubleshooting.md)
