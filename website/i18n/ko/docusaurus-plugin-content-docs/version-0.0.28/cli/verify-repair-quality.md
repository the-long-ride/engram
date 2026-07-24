---
title: verify / repair / quality-check
sidebar_position: 6
description: 유지 관리 명령 — 해시 확인, 잘못된 파일 복구, 품질 검사 및 충돌 해결.
---

# verify / repair / quality-check

유지 관리 명령은 메모리를 정상 상태로 유지합니다.

## verify

```bash
engram verify
```

무결성을 위해 해시를 확인합니다. 수동 편집 또는 가져오기 후에 실행합니다.

## repair

```bash
engram repair
engram rebuild-index
```

수동 편집 또는 가져오기 후에 `repair`를 사용하여 인덱스 재빌드에서 건너뛴 잘못된 형식의 메모리 파일을 찾습니다.

## quality-check

```bash
engram quality-check
```

모순 후보를 요약하여 보고합니다. 모순 감지는 휴리스틱 및 권고 사항입니다.

## graph

```bash
engram graph "package manager"
engram graph --rebuild
```

보관하기 전에 그래프 라우팅을 검사합니다. 수동 편집 후 `engram graph --rebuild`를 실행합니다.

## archive

```bash
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

잘못되거나 대체된 메모리를 보관합니다. 감사 가능성을 위해 삭제 대신 보관을 사용합니다. 파일은 승인 후에만 활성 라우팅을 떠나며 `archive/` 아래에 보존됩니다.

## resolve-conflicts

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
```

Engram이 소유한 작업 공간 메모리 충돌만 미리 보거나 해결합니다. 충돌 처리 후 에이전트가 메모리 폴더를 검토해야 하는 경우 `--metacognize`를 추가합니다. 이 명령은 결정론적 충돌 처리를 `.agents/.engram/` 범위로 유지한 다음 간결한 `TYPE/TEXT` 후보를 위해 작업 공간 자기 인식 소스 팩을 추가합니다.

## benchmark

```bash
engram benchmark
```

검색 회귀 검사.

## 다음 단계

- [sync / archive](sync-archive.md)
- [작업 문제 해결](../operations/troubleshooting.md)
