---
title: 변경 이력
sidebar_position: 5
description: Engram 릴리스 히스토리.
---

# 변경 이력 (Changelog)

Engram 릴리스 히스토리는 [`CHANGELOG.md`](https://github.com/the-long-ride/engram/blob/main/CHANGELOG.md) 리포지토리에서 관리됩니다.

현재 패키지 버전은 [`package.json`](https://github.com/the-long-ride/engram/blob/main/package.json)을 참조하십시오.

## 현재 버전

현재 릴리스된 Engram 버전은 `0.1.0`입니다.

## 0.1.0 주요 변경 사항

- **검색 및 토큰화**: 3-스트림 BM25F(`title`, `tags`, `body`), 정확한 앵커가 없을 때 작동하는 24개 개념 클러스터와 코퍼스 공기(co-occurrence) 브리지, 그리고 Unicode/베트남어/CJK 토큰화를 지원합니다.
- **신선도, 정렬 및 시작 압축**: `knowledgeFreshnessBoost` 최신성/working 계층 점수화, `orderForAgentConsumption` 주의(attention) 인식 위상 정렬, 그리고 `read: auto` 모드에서의 `hookStartupAuto` 시작 카드 압축을 제공합니다.
- **폐쇄 루프 사용량 텔레메트리**: 로컬 gitignore 파일인 `usage.json`에서 결과(`applied`, `corrected`, 유용성이 0인 반복 주입에 대한 노이즈 감쇠)를 추적하며 `engram stats --backfill`을 지원합니다.
- **Option A 세션 학습 및 작업 노트**: 결정론적 프롬프트 시점 및 트랜스크립트 학습으로 만료되는 gitignore 대상 `working/` 메모리와 스테이징된 `inbox/r-*.json` 영수증(`engram review inbox|triage|apply|dismiss`)을 기록하며, `engram working note` / `engram_note` MCP 도구와 옵트인 `SessionEnd` 트랜스크립트 대기열(`engram link claude|codex --session-end`)을 추가했습니다.
- **CLI 편의성**: `engram status`(`engram stat`), `engram why <id> ["<query>"]`, `engram help --compact`, `engram graph link <parent-id> <child-id...>`, `engram review triage`, `engram benchmark --from-git`을 제공합니다.
- **Entry Web UX 및 보안**: Entry Web UI 워크플로를 개선하고 취약점이 없는 의존성으로 업데이트했습니다.

## 업그레이드

```bash
npm install -g @the-long-ride/engram@latest
engram upgrade
```

자세한 내용은 [릴리스 및 업그레이드 프로세스](release-upgrade.md)를 참조하십시오.
