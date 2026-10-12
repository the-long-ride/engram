---
title: Copilot
sidebar_position: 8
description: 저장소 및 사용자 지정 지침을 통한 Engram과 GitHub Copilot 통합.
---

# Copilot

GitHub Copilot은 `.github/copilot-instructions.md`에서 저장소 사용자 지정 지침을 읽습니다. 전역 Copilot 설치의 경우 Engram은 관리 블록을 `~/.copilot/copilot-instructions.md`에 추가합니다.

## 설치 {#install}

```bash
engram link copilot
```

## 작성된 파일 {#files-written}

| 파일 | 목적 |
| --- | --- |
| `.github/copilot-instructions.md` | 저장소 사용자 지정 지침 |

## 전역 설치 {#global-install}

```bash
engram link --global copilot
```

`~/.copilot/copilot-instructions.md`에 관리 블록을 추가합니다.

## 압축/수동 대체 대상 {#compact-manual-fallback-target}

Copilot은 압축/수동 대체 대상입니다. 전체 압축 프로토콜을 수신합니다. v1에서는 훅 설치를 건너뜁니다. 컨텍스트를 위해 Engram 스킬셋 또는 수동 `engram load`를 사용하세요.

## 다음 단계 {#next-steps}

- [에이전트 통합 개요](overview.md)
- [훅 및 증명 라인](hooks.md)
