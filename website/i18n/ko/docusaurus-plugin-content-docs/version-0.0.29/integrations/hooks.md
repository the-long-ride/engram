---
title: 훅 및 증명 라인
sidebar_position: 12
description: Engram 에이전트 훅은 세션 시작 및 프롬프트 턴에서 라우팅된 메모리를 주입합니다. 증명 라인은 주입을 가시화합니다.
---

# 훅 및 증명 라인 {#hooks-and-proof-lines}

에이전트 훅은 호스트가 프롬프트 시점에 안전한 컨텍스트 채널을 노출할 때, 세션 시작 및 이후 작업 전환 턴에서 라우팅된 Engram 컨텍스트를 주입하는 옵트인 호스트 훅입니다.

## 훅 설치 {#install-hooks}

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

사용자 수준 설정에는 `--global`을 사용하고, Engram이 관리하는 훅 항목만 제거하려면 `engram unlink`를 사용합니다.

## 읽기 모드 {#read-mode}

`engram set-read startup|auto|always|manual|off`는 런타임 동작을 제어합니다:

- `auto`는 세션 시작 시 및 이후 프롬프트 턴에서 로드되며, 세션 내에서 아직 전달되지 않은 메모리 본문만 주입합니다.
- `startup`은 세션 시작 시에만 로드됩니다.
- `always`는 적격한 모든 턴에서 다시 주입합니다.
- `manual` 및 `off`는 자동화를 줄입니다.

훅 캐시는 해시, 세션 ID, 호스트, cwd, 세션당 이미 전달된 메모리 키를 저장하며, 원시 프롬프트 텍스트는 절대 저장하지 않습니다.

## 델타 주입 (Delta injection) {#delta-injection}

각 (호스트, cwd, 세션)에 대해 훅은 전달한 키를 기록합니다. 프롬프트 턴은 아직 전달되지 않은 본문만 주입하고 나머지 항목에 대해 하나의 `already loaded: <ids>` 라인으로 끝납니다. 새로운 항목이 없는 턴은 해당 라인만 주입하고(증명이 켜져 있을 때는 증명 라인 포함), 아무것도 라우팅되지 않은 턴은 메모리를 주입하지 않습니다. `SessionStart` 및 `PreCompact`는 집합을 초기화하므로 새 세션이나 컨텍스트 압축 후에 메모리가 다시 전달됩니다. 7일보다 오래된 레코드는 정리되며 최대 200개가 유지됩니다. OpenCode는 단일 시스템 프롬프트 슬롯을 유지하므로 해당 플러그인은 엄격한 델타를 보내는 대신 현재 슬롯을 교체하거나 유지합니다.

## 페이로드 상한 {#payload-caps}

호스트는 너무 큰 훅 출력을 잘라내므로, 훅은 렌더링된 `additionalContext`를 각 호스트 자체 단위로 측정합니다: Codex에서는 최대 2,400 토큰(UTF-8 바이트 / 4; Codex는 메시지를 약 2,500 토큰으로 제한), Claude에서는 최대 9,500 자(제한 10,000), 다른 곳에서는 `load.max_tokens`입니다. 텍스트가 상한을 초과하면 훅은 더 적은 예산으로 다시 계획하므로 본문이 한 줄 카드로 강등되고 가장 낮은 순위의 카드가 제외됩니다. 본문이 텍스트 중간에 잘리는 일은 절대 없습니다. 동일한 상한이 `SubagentStart` 및 경로 트리거 출력에 적용되며, 실제로 전송된 본문만 전달된 것으로 기록됩니다. `already loaded:` ID는 정렬되며 증명 `sig`는 정렬된 라우팅 키를 해시하므로 동일한 라우팅 집합은 항상 동일한 바이트를 출력합니다.

## 경로 범위 트리거 {#path-scoped-triggers}

Claude, Codex 및 Gemini 훅 설치는 경로 트리거도 등록합니다. Codex는 항상 `PreToolUse`를 사용하고 Gemini는 `AfterTool`을 사용합니다. Claude는 `hooks.path_rules native`(기본값)에서 `InstructionsLoaded`를 사용하고 `hooks.path_rules hook`에서 `PreToolUse`를 사용합니다:

- Claude `InstructionsLoaded`(매처 `path_glob_match`, 비동기, 출력 무시)는 Claude가 생성된 `.claude/rules/engram/<id>.md` 파일을 로드할 때 트리거되며, 전달된 집합 및 `usage.json`에 해당 메모리를 기록합니다. 규칙 파일 자체가 본문을 포함하므로 두 번 주입되지 않습니다.
- Claude `PreToolUse`(훅 모드)는 `Read`, `Edit`, `Write` 및 `MultiEdit`과 일치하며 `tool_input.file_path`를 사용합니다.
- Codex에는 읽기 또는 다중 편집 도구가 없으며 `PreToolUse`는 읽기 시 실행되지 않으므로 `apply_patch`를 통해 편집된 파일만 트리거됩니다.
- Gemini `AfterTool`(매처 `read_file|write_file|replace`, 밀리초 단위 제한 시간)은 도구 입력에서 수정된 경로를 읽고 도구 결과에 메모리를 추가하므로 읽기 후 한 단계 뒤에 도착합니다. Gemini의 매처는 고정되지 않은 정규식이므로 이름에 `replace`가 포함된 도구에 대해서도 훅이 시작되며, 해당 도구의 경우 `{}`로 종료됩니다. `BeforeAgent`와 전달된 집합을 공유합니다.

수정된 경로(작업 디렉터리 기준 상대 경로)가 아직 전달되지 않은 메모리의 `applies_to` glob과 일치하면 훅은 이벤트당 최대 3개의 본문을 `additionalContext`로 주입합니다. 권한 결정을 반환하지 않으므로 도구 호출을 차단할 수 없으며 작업 디렉터리 외부의 경로는 무시됩니다. 실제 파일 경로를 지정하는 프롬프트 텍스트도 `applies_to` 메모리의 앵커로 간주됩니다.

이전 설치에 경로 트리거(`InstructionsLoaded` 또는 `PreToolUse`) 및 `PreCompact`(Gemini: `PreCompress`)를 추가하려면 `engram upgrade --latest`(또는 `engram link <host>` 다시 실행)를 한 번 실행합니다. 기존 Claude 설치는 새로 고칠 때 `PreToolUse`에서 `InstructionsLoaded`로 전환되므로 `PreToolUse`를 유지하려면 먼저 `engram config set hooks.path_rules hook`을 실행하세요. 일반 `engram upgrade`는 훅 설정을 새로 고치지 않습니다. Claude, Codex 및 Cursor는 훅 `timeout`을 초 단위로 읽으며, 관리되는 항목은 `10`을 씁니다.

## 서브에이전트 (Subagents) {#subagents}

Claude 및 Codex 훅 설치는 `SubagentStart`(매처 `*`, 모든 에이전트 유형)도 등록합니다. 라우팅된 `current session` 컨텍스트를 추가 컨텍스트로 서브에이전트에 주입하며 결정을 반환하지 않습니다. 서브에이전트 훅은 부모 `session_id`를 전달하므로 서브에이전트의 전달된 집합은 `<session_id>#agent:<agent_id>`로 키가 지정되고 부모 집합은 변경되지 않습니다. 부모 세션을 축출하지 않도록 최대 100개의 서브에이전트 레코드가 유지됩니다. Codex `SubagentStart` 출력은 Codex가 해당 이벤트에 나열하지 않는 `suppressOutput`을 생략합니다. 동일한 페이로드 상한이 적용됩니다. 알려진 문제점: Codex는 `PreToolUse`에 `agent_id`를 문서화하지 않으므로 Codex 서브에이전트 내부의 경로 트리거가 부모의 전달된 집합에 기록될 수 있습니다.

## 세션 트랜스크립트 큐 (옵트인) {#session-transcript-queue-opt-in}

`engram link claude --session-end` 및 `engram link codex --session-end`는 `SessionEnd` 명령 훅도 등록합니다(Claude 제한 시간 5초, Codex 3초). 이는 일반 명령 훅입니다: 아무것도 주입하지 않고, `{}`로 응답하며, 오픈 실패(fail open)하고, 워크스페이스 메모리 폴더의 gitignore 처리된 `session-queue.json`에 `{ transcript_path, host, session, at }`만 추가합니다. 항목은 파일 잠금 하에 기록되며 호스트 및 세션별로 중복 제거되고 최신 50개로 제한됩니다. 이 플래그는 기본적으로 꺼져 있으며, `engram upgrade`는 이를 추가하지 않고(기존 항목 유지), `engram unlink`는 제거하며 Gemini는 등록되지 않습니다. 저장된 경로는 절대 경로이며 OS 사용자를 지정하므로 파일이 컴퓨터 외부로 나가지 않습니다.

`engram observe --queue`로 큐를 비웁니다(`--dry-run`은 검사만 수행, `--limit n`은 실행당 항목 수 제한). 각 트랜스크립트는 반드시 존재해야 하고, 일반 파일(심볼릭 링크나 하드 링크가 아님)이어야 하며, 최대 5 MiB여야 합니다. 이는 편집되고 주입과 유사한 라인이 제거되며, 절대 경로를 지정하지 않는 받은 편지함 래퍼와 트레이스로 저장됩니다. 건너뛰거나 저장된 항목은 큐에서 제거됩니다. 받은 편지함 할당량(선택적 `.agents/engram.transcripts.json`의 `max_files`)에 도달한 항목은 유지됩니다. 직접적인 메모리는 기록되지 않습니다: `engram save-session --file <inbox file>` 및 일반 승인 게이트를 사용하여 받은 편지함 파일을 승격합니다. 비동기 Codex 훅이 아닌 직접 또는 일반 명령 훅에서 `observe --queue`를 실행하세요.

## 증명 모드 {#proof-mode}

`engram set-proof off|compact`는 지원되는 훅이 적격한 각 턴에 컴팩트한 `Engram proof:` 라인도 추가할지 여부를 제어합니다. 증명 가시성은 `set-read`와 별개입니다: `compact`는 전체 Engram 메모리가 주입되는 시점을 변경하지 않고 로드, 재사용 또는 건너뛴 턴을 보고할 수 있습니다.

## 훅 지원 매트릭스 {#hook-capability-matrix}

| 호스트 | 설정 경로 | 이벤트 |
| --- | --- | --- |
| `codex` | `.codex/hooks.json`; 글로벌 `~/.codex/hooks.json` | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PreCompact`, `SubagentStart` (옵트인 `SessionEnd`) |
| `claude` | `.claude/settings.json`; 글로벌 `~/.claude/settings.json` | `SessionStart`, `UserPromptSubmit`, `InstructionsLoaded` (`hooks.path_rules hook` 시 `PreToolUse`), `PreCompact`, `SubagentStart` (옵트인 `SessionEnd`) |
| `gemini` | `.gemini/settings.json`; 글로벌 `~/.gemini/settings.json` | `SessionStart`, `BeforeAgent`, `AfterTool`, `PreCompress` |
| `cursor` | `.cursor/hooks.json`; 글로벌 플러그인 `hooks/hooks.json` | `sessionStart` |
| `windsurf` / `cascade` | `.windsurf/hooks.json`; 글로벌 `~/.codeium/windsurf/hooks.json` | `pre_user_prompt` |
| `opencode` | `~/.config/opencode/plugins/engram.js` | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | 기록 없음 | 해당 없음 |
| `cline` | 기록 없음 | 해당 없음 |

## 다음 단계 {#next-steps}

- [에이전트 통합 개요](overview.md)
- [CLI: inject / link / upgrade](../cli/inject-link-upgrade.md)
