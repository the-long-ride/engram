---
title: 문제 해결
sidebar_position: 3
description: 자주 발생하는 Engram 문제 및 해결 방법입니다.
---

# 문제 해결

첫 번째 단계: `engram entry`를 실행하고 **Runtime** 탭을 확인하십시오. 확인된 프로필, 메모리 루트, 핵심 설정, 라우팅, 그래프 및 Git 감지 상태가 표시됩니다.

## 메모리가 로드되지 않는 경우

- `engram load --dry-run "<작업>"`을 실행하여 후보 수와 좁히기 태그를 확인합니다.
- `engram config view`에서 `enabled`, `read` 및 `load.limit` 설정을 확인합니다.
- `.agents/.engram/` 아래에 작업 공간 메모리가 존재하는지 확인합니다.
- `engram verify`를 실행하여 해시를 검사합니다.

## 훅(Hooks)이 주입되지 않는 경우

- `engram set-read status`가 `off`나 `manual`이 아닌지 확인합니다.
- 호스트가 연결되어 있는지 확인합니다: `engram link <대상>`.
- 연결(link) 또는 연결 해제(unlink) 후 호스트를 재시작하거나 새로고침하십시오 (특히 OpenCode의 경우).
- `engram set-proof status`를 실행하여 증명 줄(proof line) 표시 여부를 확인합니다.

## 저장에 실패한 경우

- 승인 미리보기를 확인하여 관련 메모리 관련 힌트가 있는지 읽어봅니다.
- 만약 전체 승인(accept-all)에서 관련 메모리가 보고되었다면 파일이 저장되지 않은 것입니다. `DEPENDS_ON` 또는 `UPDATE` 후보를 지정하여 다시 실행하십시오.
- CLI 출력에서 스키마, 비밀 정보 및 인젝션 스캔 오류를 확인합니다.

## 프로필 혼동이 발생하는 경우

- `engram profile status`를 실행합니다.
- 작업 공간의 `default_profile` 및 활성 사용자 프로필을 확인합니다.
- 작업 공간 기본값과 다른 명시적 프로필을 지정하여 실행하면 해당 명령의 작업 공간 메모리가 비활성화됨을 인지하십시오.

## 손상된 메모리 파일인 경우

```bash
engram verify
engram repair
engram rebuild-index
engram graph --rebuild
```

## 패키지 업데이트 후 어댑터가 기한 만료된 경우

```bash
engram upgrade
engram upgrade --latest
engram link all
```

생성된 Engram 어댑터 파일을 의도적으로 대체할 때만 `--force`를 사용하십시오.

## SQLite 설정 DB를 사용할 수 없는 경우

일반 읽기/쓰기 명령은 JSON 설정 스냅샷으로 폴백됩니다. DB 전용 명령은 일반 메모리 사용을 차단하는 대신 SQLite를 사용할 수 없음으로 보고합니다.

## 글로벌 Git 동기화 문제

- `global_git.enabled`가 `true`인지 확인합니다.
- `global_git.remote_url`이 유효한 Git 원격 저장소 URL인지 확인합니다.
- `global_git.auto_resolve` 설정을 검토하십시오. 자동 충돌 해결 기능은 메모리 변경 사항(diff)을 가릴 수 있습니다.
- `engram entry`의 Runtime 탭을 점검하여 `global_git_detected`를 확인합니다.

## 다음 단계

- [자주 묻는 질문](faq.md)
- [CLI: verify / repair / quality-check](../cli/verify-repair-quality.md)
