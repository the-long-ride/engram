---
title: 명령 개요
sidebar_position: 1
description: 모든 Engram CLI 명령과 그 역할을 한눈에 보여 주는 지도입니다.
---

# 명령 개요

간결한 명령 목록은 `engram -h`로 확인하세요. 명령별 예시와 사용 사례는 `engram help <topic>` 또는 `engram -h <topic>`으로 볼 수 있습니다.

## 명령 지도

| 필요한 작업 | 명령 |
| --- | --- |
| 작업용 메모리 로드 | `engram load "<task>"` |
| 간결한 작업용 메모리 로드 | `engram load "<task>"` |
| AI 에이전트 사용 가이드 출력 | `engram llm` |
| 라우팅된 메모리 파일 미리 보기 | `engram load --dry-run "<task>"` |
| 토큰 상한을 두고 로드 | `engram load --budget-tokens 800 "<task>"` |
| 패킹된 모든 본문 출력 | `engram load --disclosure full "<task>"` |
| id로 카드 가져오기 | `engram load --id <id>,<id>` |
| 메모리 검색 | `engram search "<topic>"` |
| 메모리 하나 저장 | `engram save [rule\|workflow\|knowledge] "<text>"` |
| 세션 메모리 여러 개 저장 | `engram save-session` 또는 `engram ss` |
| 접근 가능한 최근 채팅 분석 | `engram save-session --query-level 3` |
| 세션 후보 강제 저장 | `engram ss -f` |
| 최근 채팅을 분석해 강제 저장 | `engram ss -f last 50 sessions` |
| 원시 노트 캡처 | `engram observe --file session.md` |
| 기존 문서/지침 변환 | `engram take-control --all` |
| 소스 인수 미리 보기 | `engram take-control --plan` |
| 코드 또는 설정 요약 | `engram take-control --kind code --objective "<text>"` |
| 오래된 코드 기반 메모리 갱신 | `engram take-control --refresh` |
| 소스 최신성 확인 | `engram verify --sources` |
| 작업 메모리 유지 | `engram promote <id>` |
| 만료된 작업 메모리 정리 | `engram working prune [--dry-run]` |
| 가져오기 및 주입 횟수 확인 | `engram stats --usage` |
| 기존 메모리 폴더 재구성 | `engram metacognize --workspace\|--global\|--all` |
| 충돌 해결 및 metacognize | `engram resolve-conflicts --metacognize` |
| 그래프 라우팅 점검 | `engram graph "<topic>"` |
| 해시 확인 | `engram verify` |
| 잘못된 형식의 메모리 파일 찾기 | `engram repair` |
| 잘못된 메모리 아카이브 | `engram archive --reason "<why>" <id-or-file>` |
| 규칙 강도 조정 | `engram set-rule-variant strict\|balanced\|light\|off` |
| 기본 저장 대상 설정 | `engram set-save-target workspace\|global\|both\|status` |
| 간결한 로드 한도 설정 | `engram set-load-limit 1..32\|status\|reset` |
| 자동 훅 읽기 설정 | `engram set-read startup\|auto\|always\|manual\|off\|status` |
| 훅 증명 표시 설정 | `engram set-proof off\|compact\|status` |
| 에이전트 훅 설치 | `engram link codex\|claude\|gemini\|opencode\|cursor\|windsurf` |
| 글로벌 프로필 관리 | `engram profile status\|list\|create\|use\|merge` |
| 워크스페이스/글로벌 메모리 복제 | `engram clone-memory workspace global [--metacognize]` |

## 명령 찾기 {#command-discovery}

```bash
engram help save-session
engram help set-role
engram -h set-rule-variant
```

도움말에 나열된 모든 명령에는 짧은 별칭이 있습니다. 별칭은 정식 명령과 같은 CLI 동작과 승인 게이트로 연결됩니다.

## 셸 자동 완성 {#shell-completion}

```bash
engram completion bash
engram completion zsh
engram completion powershell
```

## 다음 단계 {#next-steps}

- [load / search / graph](load-search-graph.md)
- [save / save-session / observe](save-session.md)
- [inject / link / upgrade](inject-link-upgrade.md)


## Git 작성자 정보 {#git-author-identity}

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

전체 내용은 [Git 작성자 설정 가이드](../operations/git-author-settings.md)를 읽어 보세요.
