---
title: Memories tab
sidebar_position: 6
description: Inspect the memory graph, preview memories, edit, and archive.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Memories tab

The Memories tab inspects active memory, explores its graph, and performs maintenance actions.

## Search

Use the search field to match text anywhere in each Markdown memory file. The search is case-insensitive and works together with the scope and type filters.

The search mode menu has two options:

- **Text matches only** shows memories whose file content or metadata directly matches the query.
- **Text matches + related memories** also shows connected dependency, duplicate, and semantic memories.

Clear the field to restore the full graph for the selected filters.

## 라우트 시뮬레이터

**Simulate route** 막대를 사용하여 에이전트가 쿼리를 보기 전에 Engram이 쿼리를 어떻게 라우팅하는지 테스트할 수 있습니다. 쿼리를 제출하면 `/api/recall?simulate=true`를 호출하여 다음 항목을 구분해 보여 줍니다.

- **Packed bodies** — 라우팅된 페이로드에 전체 내용이 포함된 메모리
- **Cards** — 전체 본문과 함께 포함된 간결한 메모리 카드
- **Omitted candidates** — 순위 또는 예산 제한으로 인해 제외된 일치 메모리
- **Token budget** — 시뮬레이션된 회상 응답 전체의 토큰 예산 사용량

## Scope chips {#scope-chips}

Filter the graph by memory source. Compare workspace vs global memory. Start with the current workspace only when the graph feels noisy.

## Type chips {#type-chips}

Filter the graph by memory type. Inspect rules, skills, or knowledge separately.

## Semantic links toggle {#semantic-links-toggle}

Shows semantic graph edges. Turn off when the graph is visually noisy.

## Refresh / rebuild

Reloads or rebuilds graph data. Use after edits, imports, archive actions, or config changes.

## Memory preview

Reads selected memory content. Useful to audit what the agent will receive.

<RiskCallout level="caution">
Sensitive local content may be visible in the browser. Treat the panel as open while previewing.
</RiskCallout>

## Edit memory

Opens the file in an editor and copies the path. Use for manual correction or review. The source of truth is the Markdown file.

## Working 및 Noisy 배지

메모리 카드와 세부 정보 패널에는 주의가 필요한 메모리를 강조하는 상태 배지가 표시됩니다.

- **Working** — gitignore 처리된 `working/` 계층에 저장된 활성 메모리를 표시합니다. **Promote** 버튼(`POST /api/memory/promote`를 즉시 호출)을 사용하면 CLI로 전환하지 않고도 활성 `working/` 메모리를 지속 저장소로 옮길 수 있습니다.
- **Noisy** — 가치를 더하지 못하면서 자주 일치하는 메모리에 플래그를 표시하여 트리거를 좁히거나 편집 또는 아카이브할 수 있게 합니다.

## 메모리 아카이브

메모리를 활성 라우팅에서 제거하면서 `archive/` 아래에 보존합니다. 아카이브를 클릭하면 **Delete memory?** 확인 대화 상자가 열립니다(별도의 모달 사유 입력창은 없으며 기본값 `'Deleted from Memories graph view'`가 기록됩니다). 감사 가능성을 위해 수동 삭제 대신 아카이브를 사용하세요.

<RiskCallout level="caution">
Archiving changes routing immediately. Use archive, not manual deletion, so history is preserved.
</RiskCallout>

<!-- evidence-foundation:v3:start -->
## 증거 기반 메모리

The detail panel mirrors CLI/index metadata. It shows `authority`, `revision`, `evidence_refs`, `derived_from`, `supersedes`, `superseded_by`, `valid_from`, `valid_until`, and `last_confirmed` when present. These fields explain why a memory exists and which immutable trace supports it; the Web UI does not turn evidence into an instruction.
<!-- evidence-foundation:v3:end -->

## CLI equivalent

```bash
engram graph "<topic>"
engram why <id> "<query>"
engram promote <id>
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

## Next steps

- [Core tab](core.md)
- [CLI: verify / repair / quality-check](../cli/verify-repair-quality.md)
