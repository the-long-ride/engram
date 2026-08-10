---
title: Copilot
sidebar_position: 8
description: 레포지토리 및 사용자 지정 지침을 통한 Engram과 GitHub Copilot의 통합.
---

# Copilot

GitHub Copilot은 `.github/copilot-instructions.md`에서 레포지토리 지정 지침을 읽습니다. 글로벌 Copilot 설치의 경우, Engram은 `~/.copilot/copilot-instructions.md`에 관리형 블록을 추가합니다.

## 설치

```bash
engram link copilot
```

## 작성된 파일

| 파일 | 목적 |
| --- | --- |
| `.github/copilot-instructions.md` | 레포지토리 지정 지침 |

## 글로벌 설치

```bash
engram link --global copilot
```

`~/.copilot/copilot-instructions.md`에 관리형 블록을 추가합니다.

## 컴팩트/수동 대체 대상

Copilot은 컴팩트/수동 대체 대상입니다. 현재 훅이 시작 세션 컨텍스트는 노출하지만 v1에서 신뢰할 수 있는 프롬프트 시점의 컨텍스트 주입은 노출하지 않으므로 전체 컴팩트 프로토콜을 수신합니다. 훅 설치를 건너뛰고 훅 구성이 작성되지 않습니다.

## 다음 단계

- [에이전트 통합 개요](overview.md)
- [훅 및 검증 라인](hooks.md)
