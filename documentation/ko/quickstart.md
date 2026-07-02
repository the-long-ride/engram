# AI 에이전트 퀵스타트

## AI 채팅 승인

AI 에이전트와의 채팅에서 Engram 승인은 대화형으로 진행됩니다. 에이전트는 먼저 다듬은 `TYPE: ... | TEXT: ...` 후보를 보여 주고, 규칙 메모리라면 Light/Balanced/Strict 변형도 함께 제시합니다. 정확히 그 후보를 저장하려면 `yes`, 수정하려면 `audit`, 중단하려면 `cancel` 로 답합니다. `yes` 이후 에이전트는 승인된 후보 그대로 `engram save-session --accept-all` 을 사용합니다. 직접 CLI 에서 저장할 때는 accept-all 명령을 명시적으로 호출하지 않는 한 계속 A/B/C 를 사용합니다.


먼저 에이전트를 통해 Engram을 사용하는 것이 가장 좋습니다. CLI 명령어도 사용 가능하지만, 에이전트가 메모리를 자동으로 읽어 들인 다음 작업을 진행하고 세션 종료 시점에 유용한 영속 메모리를 제안하도록 유도하는 흐름이 최적의 경험을 제공합니다.

## 새로운 세션 시작 시 첫 메시지

에이전트에게 이렇게 질문하십시오:

```text
이번 태스크에는 Engram을 사용해줘. 로드할 메모리 주제: <현재 수행 중인 작업>.
```

슬래시 명령어 어댑터가 설정된 경우:

```text
/engram load "<현재 태스크>"
```

에이전트는 각 파일의 내용을 전부 붙여넣는 것이 아니라 관련 메모리 식별자(ID)와 규칙만 요약해야 합니다.

에이전트가 자체 포함된 Engram 사용 가이드를 필요로 할 때 다음을 실행하십시오.

```bash
engram llm
```

이 명령은 패키지된 `llm.txt` 가이드를 인쇄하며 `engram inject`를 요구하지 않습니다.

## 추천 설정 대화 흐름

에이전트에게 이렇게 질문하십시오:

```text
이 워크스페이스를 위한 Engram을 초기화하고, 이 에이전트에 맞는 스킬셋(skillset)을 설치한 다음, 내가 다음에 써야 할 명령어를 알려줘.
```

그러면 에이전트는 다음을 실행할 수 있습니다.

```bash
engram inject
engram help link
engram link <에이전트명>
```

동일한 에이전트를 전역적으로 가르쳐서 새 워크스페이스가 `engram inject`를 먼저 실행하지 않고도 Engram 전역 메모리를 로드할 수 있도록 하려면 다음을 실행하십시오.

```bash
engram link --global <에이전트명>
```

채팅창에서 바로 사용하고 싶다면 이렇게 질문하십시오:

```text
이 에이전트 환경에서 직접 /engram 슬래시 명령어를 쓸 수 있도록 어댑터를 설치해줘.
```

## 일상적인 반복 작업 루프

태스크 시작:

```text
/engram load "현재 태스크"
```

작업 진행 도중:

```text
/engram search "내가 놓쳤을 만한 관련 주제"
```

에이전트가 영속적으로 보존할 중요한 사실을 학습했을 때:

```text
/engram save knowledge
```

현재 세션에서 재사용할 가치가 있는 여러 규칙, 사실 또는 워크플로우를 얻었을 때:

```text
/engram save-session
```

또는 단축 명령어:

```text
/engram ss
```

에이전트가 실제로 접근할 수 있는 최근 채팅 기록까지 포함하려면:

```text
/engram save-session --query-level 3
```

`--query-level`은 양의 정수여야 합니다. 에이전트는 현재 세션을 포함해 해당 개수만큼의 최근 인간-에이전트 채팅만 사용할 수 있으며, 접근할 수 없는 기록을 만들어내서는 안 됩니다.

확실히 모든 제안 내용을 저장해도 괜찮다고 판단될 때만 일괄 승인(accept-all) 단축키를 씁니다:

```text
/engram ss -a
```

`-a` 옵션은 에이전트가 제안하는 모든 후보군을 인간이 즉시 저장하도록 사전 동의함을 의미합니다. 에이전트 스스로 이 옵션을 임의로 추가하여 실행해선 안 됩니다.

접근 가능한 최근 채팅을 추출하고 생성된 모든 후보를 한 번에 승인하려면:

```text
/engram ss -a last 50 sessions
```

이 표현은 `engram save-session --query-level 50 --accept-all`로 정규화됩니다.

## 기존 지식 가져오기 (Import)

레포지토리에 이미 `AGENTS.md`, `CLAUDE.md`, Cursor 규칙, 메모나 문서 파일들이 있는 경우:

```text
/engram take-control --plan
/engram take-control --all
```

분석 대상 파일, 스킵할 파일, 대략적인 토큰 수 및 예상 메모리 타입을 먼저 훑어보고자 할 경우 `--plan` 옵션을 먼저 사용하십시오.

## 글로벌 메모리

다양한 레포지토리에서 공통으로 추적하고 반영해야 하는 내 설정 정보들에는 글로벌 메모리를 사용하십시오:

```text
글로벌 Engram 메모리 경로를 <path>(으)로 잡아줘. 그 다음 다음 설정을 글로벌하게 저장해줘:
Use pnpm for package management.
```

그러면 에이전트는 다음을 사용할 수 있습니다.

```bash
engram inject --global-only --global-path <경로>
engram save --scope global "패키지 관리에 pnpm을 사용하십시오."
engram link --global <에이전트명>
```

inject 명령어가 구성된 전역 메모리를 감지하면 해당 전역 루트에 대한 사용자 기본 프로필을 생성하거나 선택하므로 향후 워크스페이스에서 이를 재사용할 수 있습니다.

## 항상 건강하게 유지하기

중요한 작업을 마무리할 때 에이전트에게 이렇게 질문하십시오:

```text
Engram 상태를 진단하고 손상된 메모리가 있는지 점검한 뒤, 오늘 작업 중에서 보존할 만한 내용들을 추천해줘.
```

기타 유용한 명령어:

```bash
engram upgrade
engram upgrade --plan
engram verify
engram repair
engram graph "<주제>"
engram quality-check
engram archive --reason "<이유>" <id 또는 파일>
```

다음 단계: [인간 소유 메모리 프로토콜](protocol.md).
