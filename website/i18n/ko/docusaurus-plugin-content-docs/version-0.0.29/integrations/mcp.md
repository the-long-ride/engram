---
title: MCP 도구
sidebar_position: 11
description: Engram MCP 서버는 MCP 지원 호스트에 로드, 검색 및 제안 전용 도구를 노출합니다.
---

# MCP 도구 {#mcp-tools}

Engram은 MCP 지원 호스트에 도구를 노출하는 MCP 서버 바이너리 `engram-mcp`를 제공합니다.

## 등록 {#registration}

`engram link <target>`은 기본적으로 해당 대상에 대해 알려진 MCP 등록도 설치합니다.

| 범위 | 경로 |
| --- | --- |
| 워크스페이스 Claude Code 및 `.mcp.json`을 읽는 기타 호스트 (Codex 제외, Codex는 `~/.codex/config.toml`만 읽음; 글로벌 Codex 참조) | `.mcp.json` |
| Gemini 워크스페이스 | `.gemini/settings.json` 내의 `mcpServers.engram` |
| Cursor 워크스페이스 | `.cursor/mcp.json` |
| OpenCode 워크스페이스 | `opencode.json` / `opencode.jsonc` 내의 `mcp` 필드 |
| 글로벌 Claude | 파일이 아님: Engram이 `claude mcp add --scope user engram -- engram-mcp` 출력 (Claude Code는 사용자 MCP 서버를 `~/.claude.json`에 보관함) |
| 글로벌 Gemini | `~/.gemini/settings.json`에 병합된 `mcpServers.engram` |
| 글로벌 Codex | `~/.codex/config.toml` 내의 관리되는 `[mcp_servers.engram]` 블록 |
| 글로벌 Antigravity | Gemini MCP 설정 파일 |
| 글로벌 OpenCode | `~/.config/opencode/opencode.jsonc` / `opencode.json` 내의 `mcp` 필드 |
| 글로벌 Cursor | 로컬 플러그인에 번들됨 |
| 글로벌 Windsurf | `~/.codeium/windsurf/mcp_config.json` |

Windsurf 워크스페이스 MCP는 공식 계약에서 사용자 수준 MCP 설정만 문서화하므로 건너뜁니다.

서버 명령은 `PATH`에 있을 때 `engram-mcp`이고, 그렇지 않으면 설치된 릴리스에 고정된 `npx` 형태(`npx -y --package @the-long-ride/engram@<version> engram-mcp`)입니다. `engram upgrade` 및 `engram link <host>`는 기존 항목을 다시 고정합니다. Unlink는 Engram 항목 또는 관리되는 블록만 제거하고 다른 서버와 키는 그대로 둡니다.

## 프로토콜 버전 {#protocol-versions}

단일 `engram-mcp` 프로세스가 두 가지 프로토콜 시대를 지원합니다:

- **레거시(Legacy)**: 클라이언트의 `protocolVersion`이 `2024-11-05`, `2025-03-26`, `2025-06-18` 또는 `2025-11-25`일 때 `initialize`는 이를 반환하고, 그렇지 않으면 `2025-11-25`를 반환합니다. 알 수 없는 버전 문자열은 그대로 반환되지 않습니다.
- **MCP 2026-07-28**: `params._meta`에 `io.modelcontextprotocol/protocolVersion`이 포함된 요청은 상태 비저장으로 처리됩니다(`server/discover`, `tools/list`, `tools/call`, `resources/*`, `prompts/*`). 또한 `io.modelcontextprotocol/clientCapabilities`가 포함되어야 합니다(누락 시 `-32602`). 결과에는 `resultType: "complete"`가 포함되며 목록 메서드는 `ttlMs` 및 `cacheScope`를 추가합니다. 지원되지 않는 최신 버전은 `data.supported` 및 `data.requested`와 함께 `-32022`를 반환합니다. 이 시대에서 `ping`, `initialize` 및 단순 도구 메서드는 `-32601`을 반환합니다.

Stdout은 라인당 하나의 메시지로 JSON-RPC만 전달합니다.

## 서버 지침 및 도구 검색 {#server-instructions-and-tool-search}

레거시 `initialize` 결과와 MCP 2026-07-28 `server/discover` 결과는 모두 동일한 `instructions` 문자열(최대 512자, 자체 포함)을 전달합니다. 호스트에게 Engram 도구를 언제 사용해야 하는지(프로젝트 규칙 및 결정 상기, 프로젝트 지식 저장)와 `engram_commit`에는 인간의 승인이 필요함을 알립니다. Codex는 처음 512자를 읽습니다. Claude Code는 초기에 도구 이름과 `instructions`만 로드하고 도구 정의는 도구 검색 뒤로 연기합니다.

`engram-mcp --always-load`는 `engram_load`에 `_meta["anthropic/alwaysLoad"]: true`를 표시하여 Claude Code가 해당 도구를 미리 로드하도록 합니다. Engram Claude 훅이 이미 컨텍스트를 주입하므로, `engram link`는 Engram Claude 훅이 설치되지 않았거나 설치 중이지 않을 때만 플래그를 추가하며, Claude Code가 읽는 설정(`.mcp.json` 및 출력된 `claude mcp add --scope user` 명령)에만 추가합니다. Codex, Cursor, Gemini 및 Windsurf 설정에는 절대 추가되지 않습니다. `.mcp.json`의 기존 `engram` 항목은 `--force`, `engram upgrade` 또는 새로 고침을 사용할 때만 변경됩니다. `engram-mcp --no-elicitation`은 승인 대화 상자를 지원하는 클라이언트(아래 참조)의 경우에도 채팅 `approval_token` 흐름을 유지합니다. 알 수 없는 `engram-mcp` 옵션은 stderr의 참고 사항과 함께 무시됩니다.

## 도구 {#tools}

| 도구 | 목적 | 쓰기 |
| --- | --- | --- |
| `engram_load` | 작업에 대한 메모리 라우팅 및 반환 (`query`, `id`, `budget_tokens`, `disclosure`, `full`, `explain`) | 아니요 |
| `engram_route` | 작업을 분류하고 라우팅되는 메모리 목록 표시 | 아니요 |
| `engram_search` | 쿼리로 메모리 검색 | 아니요 |
| `engram_verify`, `engram_status` | 해시 확인, 상태 및 카운트 보고 | 아니요 |
| `engram_save`, `engram_save_session` | 번호가 매겨진 제안 및 `approval_token` 반환 | 아니요 |
| `engram_commit` | 승인된 제안 쓰기 | 예, 인간 승인 후 |
| `engram_set_role`, `engram_set_rule_variant` | 역할 또는 규칙 변형 모드 업데이트 | 예 |
| `engram_note` | 수정된 작업 계층 작업 메모 저장 (`text`, `objective`, `type`, `scope`); `{id, file, valid_until}` 반환 | 예, 1회 승인/취소 후 |

`engram_load`는 기본적으로 [읽기 경로 및 라우팅](../concepts/read-path.md)에 설명된 계층화된 출력을 사용합니다. 더 넓은 레거시 출력을 원하면 `full: true`를 전달하세요. `budget_tokens`는 `id`와 함께 사용할 때 효과가 없습니다.

## 구조화된 결과 {#structured-results}

인간용 텍스트는 `content[0].text`에 있습니다. `structuredContent`는 `{contract_version, ok, data, diagnostics}` 봉투이며 여기서 `data`는 다음을 전달합니다:

- `engram_load`: `selected_keys`, `body_keys`, `card_ids`, `omitted_ids` (토큰 예산으로 인해 제외된 ID, `id`를 통해 가져올 수 있음), 및 `tokens`.
- `engram_search` 및 `engram_route`: `id`, `type`, `scope` 및 `score`가 포함된 `entries`. 경로 항목은 점수순이 아니라 로드 순서대로 정렬됩니다.

## 승인 및 커밋 (Commit) {#approval-and-commit}

`engram_save` 및 `engram_save_session`은 **제안 전용(proposal-only)**입니다: 미리보기와 `approval_token`을 반환합니다. 인간이 채팅에서 정확한 후보를 승인한 후, `approval_token`과 `approve: "all"` 또는 1 기반 후보 번호 목록과 함께 `engram_commit`을 호출합니다. 이는 `save-session --force`와 동일한 경로를 통해 쓰기를 수행하므로 관련되거나 중복된 후보는 평소와 같이 연기됩니다.

- 토큰은 무작위이며 워크스페이스에 바인딩되고 1회용이며 30분 후에 만료됩니다.
- 토큰의 해시만 gitignore된 `pending-approvals.json`에 저장되며, 대기 중인 후보를 편집하면 무결성 검사에 실패합니다.
- 인간이 표시된 후보를 승인하기 전에는 절대 `engram_commit`을 호출하지 마세요.
- `engram_commit`은 `tools/list`에서 `_meta["anthropic/requiresUserInteraction"]: true`를 전달하므로 Claude Code는 우회 모드에서도 모든 호출에서 확인을 요청합니다. 관리되는 Codex 블록은 `approval_mode = "approve"`가 포함된 `[mcp_servers.engram.tools.engram_commit]`을 추가하고, Gemini `mcpServers.engram` 항목이 확인을 건너뛰는 `trust: true`를 설정하면 `engram doctor`가 경고(`host.gemini_trust`)합니다.
- 각 후보는 결정론적인 `Verdict:` 라인(`ADD`, `UPDATE <id>`, `SUPERSEDE <id>`, `NOOP duplicate of <id>`)을 전달합니다. 토큰은 평결을 고정하며, `engram_commit`은 재계산된 평결이 여전히 일치하는 동안에만 `SUPERSEDE`를 적용합니다.
- `approval_token`이 에이전트에 반환됩니다. 이는 제안이 존재함을 증명할 뿐 인간이 승인했음을 증명하지 않습니다. 인간 게이트는 `engram_commit`에 대한 호스트의 도구별 권한 프롬프트이므로, `mcp__engram__engram_commit`(또는 호스트 동등물)을 허용 목록에 추가하거나 자동 승인하지 마세요.

### 승인 대화 상자 (Elicitation) {#approval-dialog-elicitation}

클라이언트가 양식 유도(elicitation)를 선언하면 `engram_save` 및 `engram_save_session`은 토큰을 반환하는 대신 호스트 자체 대화 상자에서 인간에게 묻습니다:

- 양식에는 `ADD`/`UPDATE` 및 ID 제목(메모리 텍스트는 표시되지 않음)과 저장 범위가 있는 후보 번호가 나열됩니다. `both`는 하나의 범위로 좁힐 수 있지만 넓힐 수는 없습니다.
- `accept`는 `engram_commit`과 동일한 경로를 통해 선택된 후보를 정확히 씁니다. `approval_token`은 반환되지 않습니다.
- `decline`은 제안을 취소합니다: 이후 해당 토큰을 사용한 `engram_commit`은 `approval was declined in the approval dialog`와 함께 실패합니다. 유효하지 않은 응답도 제안을 취소합니다.
- `cancel`, 60초 제한 시간 또는 클라이언트 오류는 `nothing was saved`가 접두사로 붙은 위의 토큰 텍스트로 폴백하므로 유도를 선언하지만 대화 상자를 닫는 호스트도 계속 작동합니다. 자동으로 거부하는 호스트에는 `engram-mcp --no-elicitation`이 필요합니다.
- 레거시 클라이언트는 서버-클라이언트 간 `elicitation/create` 요청을 받습니다. MCP 2026-07-28 클라이언트는 `requestState`가 도구, 워크스페이스 및 인수에 바인딩된 HMAC 봉인 만료 봉투인 `input_required` 결과를 받습니다. 이들은 `inputResponses` 및 해당 `requestState`로 `tools/call`을 다시 시도합니다. 위조되었거나 만료되었거나 일치하지 않는 상태는 `-32602`를 반환하고 아무것도 쓰지 않습니다. 서버를 다시 시작하면 열려 있는 상태가 무효화되므로 에이전트가 다시 제안합니다.
- 이 기능이 없고 `--no-elicitation`이 설정된 호출은 변경되지 않은 토큰 흐름을 사용합니다.

### 작업 계층 메모 {#working-tier-notes}

`engram_note`는 짧은 작업 메모 하나를 gitignore된 `working/` 계층에 저장합니다(`source: note`, `tier: working`, `valid_until` = 오늘 + `load.working_ttl_days`). 텍스트는 수정되며 미리보기 전에 지침과 유사한 라인은 거부됩니다. 인간은 위에서 설명한 동일한 대화 상자, `input_required` 재시도 또는 `approval_token` 흐름을 통해 하나의 예/취소 프롬프트에 응답합니다. `decline`, `cancel` 및 제한 시간 초과는 아무것도 쓰지 않습니다. 메모는 동일한 ID를 가진 영구 메모리를 업데이트하지 않으며 `engram promote`가 영구 메모리로 전환하는 유일한 방법입니다. SessionStart는 `ENGRAM_SESSION_OBJECTIVE`가 메모의 목표와 일치하지 않는 한 메모를 제외합니다. 그렇지 않으면 한 줄 카드로 나타납니다. 도구는 `readOnlyHint: false`를 가지며 `destructiveHint`는 없습니다.

## 강제 규칙 (Force rule) {#force-rule}

단축키 `/engram ss -f`를 포함한 명시적인 `/engram save-session --force` 요청은 CLI 쓰기 경로를 사용해야 합니다. 카운트된 단축키 `/engram ss -f last 50 sessions`는 `engram save-session --query-level 50 --force`를 사용해야 합니다. MCP 전용 호스트는 `engram_commit`을 통해 커밋합니다.

## OpenCode MCP 항목 {#opencode-mcp-entry}

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

MCP 서버는 표준 JSON-RPC 핸드셰이크(`initialize`, `notifications/initialized`, `tools/list` 및 `tools/call`)를 구현하고 `ping`에 응답합니다. 메모리는 MCP 리소스로도 노출되며(`engram://index`는 한 줄 카드를 나열하고, `engram://memory/{id}`는 `engram load --id`와 동일한 본문을 읽고 가져오기로 계산됨), 하나의 프롬프트인 `propose`는 메모리 제안 프로토콜을 반환합니다. `resources/list`는 인덱스와 사용량 기준 상위 `mcp.resource_limit` 메모리를 반환합니다(JSON 설정, 기본값 20, 0~200). 읽기 도구는 `annotations.readOnlyHint: true`를 포함합니다. 잘못된 형식의 JSON 라인은 `-32700` 오류 응답을 받고 서버는 계속 실행됩니다. `id`가 없는 요청은 알림이며 응답을 받지 않고, `tools/call`이 아닌 단순 메서드 호출은 일반 텍스트를 반환합니다.

## 다음 단계 {#next-steps}

- [에이전트 통합 개요](overview.md)
- [훅 및 증명 라인](hooks.md)
