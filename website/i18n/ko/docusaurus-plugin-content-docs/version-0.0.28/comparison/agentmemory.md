---
title: agentmemory
sidebar_position: 3
description: Engram 대 rohitg00/agentmemory — 파일 프로토콜 대 자동 메모리 엔진.
---

# agentmemory

[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory)는 코딩 에이전트를 위한 강력한 자동 메모리 엔진입니다. README에는 서버 기반 메모리, MCP/hooks/REST 통합, 다양한 에이전트 어댑터, 벤치마크 주장, 뷰어, 재생, 하이브리드 검색 및 Hermes 통합이 제시되어 있습니다.

자동 캡처, 라이브 뷰어/재생, 벡터 검색, 다양한 MCP 도구 및 서버 스타일 공유 메모리를 원하는 경우 agentmemory를 사용하십시오.

메모리가 저장소에서 읽을 수 있는 프로토콜이 되기를 원하는 경우 Engram을 사용하십시오: Markdown 우선, 인간 승인, Git 검토, 실행 중인 서버 없이도 에이전트 간 이식 가능.

| 차원 | Engram | agentmemory |
| --- | --- | --- |
| 신뢰할 수 있는 소스 | 승인된 Markdown 파일 | 메모리 서버/저장소 |
| 신뢰 경계 | 인간 A/B/C 승인 | 자동 캡처 및 도구 거버넌스 |
| 기본 모드 | 파일 프로토콜, 데몬 불필요 | 실행 중인 서비스 권장 |
| 검토 | Git diff 및 Markdown 검토 | 뷰어/API 및 저장된 세션 |
| 가장 적합한 대상 | 소유권과 감사 가능성이 필요한 팀 | 자동 재현 및 재생을 원하는 사용자 |
| 위험 | 더 많은 수동 규율 필요 | 신중하게 관리하지 않으면 보이지 않는 상태가 늘어남 |

## 다음 단계

- [Hermes Agent](hermes-agent.md)
- [비교 개요](overview.md)
