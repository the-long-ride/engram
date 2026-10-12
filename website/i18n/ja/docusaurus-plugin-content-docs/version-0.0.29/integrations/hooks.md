---
title: フックと証明行
sidebar_position: 12
description: Engramエージェントフックは、セッション開始時とプロンプトターンでルーティングされたメモリを注入します。証明行により注入が可視化されます。
---

# フックと証明行 {#hooks-and-proof-lines}

エージェントフックは、ホストがプロンプト時に安全なコンテキストチャネルを公開している場合に、セッション開始時およびその後のタスク切り替えターンでルーティングされたEngramコンテキストを注入するオプトインのホストフックです。

## フックのインストール {#install-hooks}

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

ユーザーレベルの設定には `--global` を使用し、Engramが管理するフックエントリのみを削除するには `engram unlink` を使用します。

## 読み取りモード {#read-mode}

`engram set-read startup|auto|always|manual|off` はランタイムの動作を制御します：

- `auto` はセッション開始時およびそれ以降のプロンプトターンでロードし、セッション内でまだ配信されていないメモリ本文のみを注入します。
- `startup` はセッション開始時のみロードします。
- `always` は対象となるすべてのターンで再注入します。
- `manual` と `off` は自動化を減らします。

フックキャッシュは、ハッシュ、セッションID、ホスト、cwd、およびセッションごとに配信済みのメモリキーを保存します。未加工のプロンプトテキストは保存しません。

## デルタ注入 (Delta injection) {#delta-injection}

各 (ホスト, cwd, セッション) について、フックは配信したキーを記録します。プロンプトターンでは、まだ配信されていない本文のみが注入され、残りのエントリについては1行の `already loaded: <ids>` で終わります。新しいエントリがないターンではその行のみが注入され（証明が有効な場合は証明行も含む）、何もルーティングされなかったターンではメモリは注入されません。`SessionStart` および `PreCompact` はセットをリセットするため、新しいセッションやコンテキストの圧縮後にメモリが再配信されます。7日以上経過したレコードはプルーニングされ、最大200件が保持されます。OpenCodeは単一のシステムプロンプトスロットを保持するため、そのプラグインは厳密なデルタを送信する代わりに現在のスロットを置換または保持します。

## ペイロード上限 {#payload-caps}

ホストは過大なフック出力を切り詰めるため、フックはレンダリングされた `additionalContext` を各ホスト独自の単位で測定します：Codexでは最大2,400トークン（UTF-8バイト / 4; Codexはメッセージを約2,500トークンに制限）、Claudeでは最大9,500文字（制限10,000）、その他の場所では `load.max_tokens`。テキストが上限を超えると、フックはより小さな予算で再計画するため、本文は1行カードに降格され、最もランクの低いカードは除外されます。本文がテキストの途中で切断されることはありません。同じ上限が `SubagentStart` およびパストリガー出力にも適用され、実際に送信された本文のみが配信済みとして記録されます。`already loaded:` IDはソートされ、証明 `sig` はソートされたルーティングキーをハッシュ化するため、同じルーティングセットは常に同じバイトを出力します。

## パススコープトリガー {#path-scoped-triggers}

Claude、Codex、およびGeminiのフックインストールはパストリガーも登録します。Codexは常に `PreToolUse` を使用し、Geminiは `AfterTool` を使用します。Claudeは `hooks.path_rules native`（デフォルト）の下で `InstructionsLoaded` を使用し、`hooks.path_rules hook` の下で `PreToolUse` を使用します：

- Claude `InstructionsLoaded`（マッチャー `path_glob_match`、非同期、出力無視）は、Claudeが生成された `.claude/rules/engram/<id>.md` ファイルをロードしたときに起動し、そのメモリを配信済みセットおよび `usage.json` に記録します。ルールファイル自体に本文が含まれているため、二重に注入されることはありません。
- Claude `PreToolUse`（フックモード）は `Read`、`Edit`、`Write`、および `MultiEdit` に一致し、`tool_input.file_path` を使用します。
- Codexには読み取りツールや複数編集ツールがなく、`PreToolUse` は読み取り時に起動しないため、`apply_patch` を介して編集されたファイルのみがトリガーされます。
- Gemini `AfterTool`（マッチャー `read_file|write_file|replace`、ミリ秒単位のタイムアウト）はツール入力から変更されたパスを読み取り、ツール結果にメモリを追加するため、読み取りの1ステップ後に到着します。Geminiのマッチャーは固定されていない正規表現であるため、名前に単に `replace` が含まれるツールでもフックが起動し、それらのツールでは `{}` で終了します。配信済みセットを `BeforeAgent` と共有します。

変更されたパス（作業ディレクトリからの相対パス）が、まだ配信されていないメモリの `applies_to` globと一致すると、フックはイベントごとに最大3つの本文を `additionalContext` として注入します。アクセス許可の決定を返すことはないため、ツール呼び出しをブロックすることはできず、作業ディレクトリ外のパスは無視されます。実際のファイルパスを指定するプロンプトテキストも、`applies_to` メモリのアンカーとしてカウントされます。

古いインストールにパストリガー（`InstructionsLoaded` または `PreToolUse`）および `PreCompact`（Gemini: `PreCompress`）を追加するには、`engram upgrade --latest`（または再度 `engram link <host>`）を1回実行します。既存のClaudeインストールはその更新時に `PreToolUse` から `InstructionsLoaded` に切り替わるため、`PreToolUse` を維持するにはまず `engram config set hooks.path_rules hook` を実行してください。通常の `engram upgrade` はフック設定を更新しません。Claude、Codex、およびCursorはフックの `timeout` を秒単位で読み取り、管理されたエントリは `10` を書き込みます。

## サブエージェント {#subagents}

ClaudeおよびCodexのフックインストールは `SubagentStart`（マッチャー `*`、すべてのエージェントタイプ）も登録します。ルーティングされた `current session` コンテキストを追加コンテキストとしてサブエージェントに注入し、決定を返すことはありません。サブエージェントフックは親の `session_id` を保持するため、サブエージェントの配信済みセットのキーは `<session_id>#agent:<agent_id>` となり、親のセットが変更されることはありません。親セッションを立ち退かせないよう、最大100件のサブエージェントレコードが保持されます。Codexの `SubagentStart` 出力は、Codexがそのイベントにリストしていない `suppressOutput` を省略します。同じペイロード上限が適用されます。既知の制約：Codexは `PreToolUse` で `agent_id` を文書化していないため、Codexサブエージェント内のパストリガーが親の配信済みセットに記録される可能性があります。

## セッショントランスクリプトキュー（オプトイン） {#session-transcript-queue-opt-in}

`engram link claude --session-end` および `engram link codex --session-end` は `SessionEnd` コマンドフックも登録します（Claudeのタイムアウトは5秒、Codexは3秒）。これは単純なコマンドフックです：何も注入せず、`{}` で応答し、オープンフェイル（fail open）し、ワークスペースのメモリフォルダにあるgitignoreされた `session-queue.json` に `{ transcript_path, host, session, at }` を追加するだけです。エントリはファイルロック下で書き込まれ、ホストとセッションで重複排除され、最新の50件に制限されます。このフラグはデフォルトでオフであり、`engram upgrade` が追加することはなく（既存エントリは保持されます）、`engram unlink` は削除し、Geminiは登録されません。保存されるパスは絶対パスでありOSユーザー名が含まれるため、ファイルがマシンから外部に出ることはありません。

`engram observe --queue` でキューを処理します（`--dry-run` は検査のみ、`--limit n` は実行あたりのエントリ数を制限）。各トランスクリプトは存在し、通常のファイル（シンボリックリンクやハードリンクではない）であり、最大5 MiBである必要があります。編集され、インジェクションのような行が除去され、絶対パスを含まない受信トレイラッパーを伴うトレースとして保存されます。スキップまたは保存されたエントリはキューから削除されます。受信トレイのクォータ（任意の `.agents/engram.transcripts.json` 内の `max_files`）に達したエントリは保持されます。直接的なメモリ書き込みは行われません：`engram save-session --file <inbox file>` と通常の承認ゲートを使用して受信トレイファイルを昇格させます。非同期Codexフックからではなく、手動または単純なコマンドフックから `observe --queue` を実行してください。

## 証明モード {#proof-mode}

`engram set-proof off|compact` は、サポートされているフックが対象となる各ターンにコンパクトな `Engram proof:` 行も追加するかどうかを制御します。証明の可視性は `set-read` とは独立しています：`compact` は完全なEngramメモリが注入されるタイミングを変更することなく、ロード、再利用、またはスキップされたターンを報告できます。

## フック機能マトリックス {#hook-capability-matrix}

| ホスト | 設定パス | イベント |
| --- | --- | --- |
| `codex` | `.codex/hooks.json`; グローバル `~/.codex/hooks.json` | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PreCompact`, `SubagentStart` (オプトイン `SessionEnd`) |
| `claude` | `.claude/settings.json`; グローバル `~/.claude/settings.json` | `SessionStart`, `UserPromptSubmit`, `InstructionsLoaded` (`hooks.path_rules hook` 使用時は `PreToolUse`), `PreCompact`, `SubagentStart` (オプトイン `SessionEnd`) |
| `gemini` | `.gemini/settings.json`; グローバル `~/.gemini/settings.json` | `SessionStart`, `BeforeAgent`, `AfterTool`, `PreCompress` |
| `cursor` | `.cursor/hooks.json`; グローバルプラグイン `hooks/hooks.json` | `sessionStart` |
| `windsurf` / `cascade` | `.windsurf/hooks.json`; グローバル `~/.codeium/windsurf/hooks.json` | `pre_user_prompt` |
| `opencode` | `~/.config/opencode/plugins/engram.js` | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | 書き込みなし | 該当なし |
| `cline` | 書き込みなし | 該当なし |

## 次のステップ {#next-steps}

- [エージェント統合の概要](overview.md)
- [CLI: inject / link / upgrade](../cli/inject-link-upgrade.md)
