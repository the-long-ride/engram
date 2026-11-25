---
title: MCPツール
sidebar_position: 11
description: Engram MCPサーバーは、MCP対応ホストにロード、検索、および提案専用ツールを公開します。
---

# MCPツール {#mcp-tools}

Engramには、MCP対応ホストにツールを公開するMCPサーバーバイナリ `engram-mcp` が同梱されています。

## 登録 {#registration}

`engram link <target>` はデフォルトで、そのターゲットについて知られているMCP登録もインストールします。

| スコープ | パス |
| --- | --- |
| ワークスペース Claude Code および `.mcp.json` を読み取るその他のホスト (Codexを除く。Codexは `~/.codex/config.toml` のみ読み取り。グローバルCodexを参照) | `.mcp.json` |
| Gemini ワークスペース | `.gemini/settings.json` 内の `mcpServers.engram` |
| Cursor ワークスペース | `.cursor/mcp.json` |
| OpenCode ワークスペース | `opencode.json` / `opencode.jsonc` 内の `mcp` フィールド |
| グローバル Claude | ファイルではありません: Engramが `claude mcp add --scope user engram -- engram-mcp` を出力 (Claude CodeはユーザーMCPサーバーを `~/.claude.json` に保持) |
| グローバル Gemini | `~/.gemini/settings.json` にマージされた `mcpServers.engram` |
| グローバル Codex | `~/.codex/config.toml` 内の管理された `[mcp_servers.engram]` ブロック |
| グローバル Antigravity | Gemini MCP 設定ファイル |
| グローバル OpenCode | `~/.config/opencode/opencode.jsonc` / `opencode.json` 内の `mcp` フィールド |
| グローバル Cursor | ローカルプラグインにバンドル |
| グローバル Windsurf | `~/.codeium/windsurf/mcp_config.json` |

WindsurfワークスペースMCPは、公式契約でユーザーレベルのMCP設定のみが文書化されているためスキップされます。

サーバーコマンドは、`PATH` 上にある場合は `engram-mcp` であり、それ以外の場合はインストールされたリリースに固定された `npx` 形式（`npx -y --package @the-long-ride/engram@<version> engram-mcp`）です。`engram upgrade` および `engram link <host>` は既存のエントリを再固定します。UnlinkはEngramエントリまたは管理ブロックのみを削除し、他のサーバーやキーには手を触れません。

## プロトコルバージョン {#protocol-versions}

単一の `engram-mcp` プロセスが2つのプロトコル時代に対応します：

- **レガシー**: クライアントの `protocolVersion` が `2024-11-05`, `2025-03-26`, `2025-06-18`, または `2025-11-25` の場合、`initialize` はそれを返し、それ以外の場合は `2025-11-25` を返します。不明なバージョン文字列がそのまま返されることはありません。
- **MCP 2026-07-28**: `params._meta` に `io.modelcontextprotocol/protocolVersion` を持つリクエストはステートレスに処理されます（`server/discover`, `tools/list`, `tools/call`, `resources/*`, `prompts/*`）。また、`io.modelcontextprotocol/clientCapabilities` を含める必要があります（欠落時は `-32602`）。結果には `resultType: "complete"` が含まれ、リストメソッドは `ttlMs` と `cacheScope` を追加します。サポートされていない最新バージョンは `data.supported` と `data.requested` を伴う `-32022` を返します。この時代では、`ping`、`initialize`、およびベアツールメソッドは `-32601` を返します。

StdoutはJSON-RPCのみを1行に1メッセージずつ転送します。

## サーバーの指示とツール検索 {#server-instructions-and-tool-search}

レガシーの `initialize` 結果とMCP 2026-07-28の `server/discover` 結果はどちらも同じ `instructions` 文字列（最大512文字、自己完結型）を保持します。ホストに対してEngramツールをいつ使用すべきか（プロジェクトのルールや決定の想起、プロジェクト知識の保存）と、`engram_commit` には人間の承認が必要であることを伝えます。Codexは最初の512文字を読み取ります。Claude Codeは事前にツール名と `instructions` のみをロードし、ツールの定義はツール検索の背後に遅延させます。

`engram-mcp --always-load` は `engram_load` に `_meta["anthropic/alwaysLoad"]: true` をマークし、Claude Codeがそのツールを事前にロードするようにします。EngramのClaudeフックはすでにコンテキストを注入しているため、`engram link` はEngram Claudeフックがインストールされていないかインストール中でない場合にのみフラグを追加し、Claude Codeが読み取る設定（`.mcp.json` および出力される `claude mcp add --scope user` コマンド）にのみ追加します。Codex、Cursor、Gemini、およびWindsurfの設定には決して追加されません。`.mcp.json` 内の既存の `engram` エントリは、`--force`、`engram upgrade`、または更新を使用した場合にのみ変更されます。`engram-mcp --no-elicitation` は、承認ダイアログをサポートするクライアント（下記参照）に対してもチャット `approval_token` フローを維持します。不明な `engram-mcp` オプションはstderrの注記とともに無視されます。

## ツール {#tools}

| ツール | 目的 | 書き込み |
| --- | --- | --- |
| `engram_load` | タスクのメモリをルーティングして返す (`query`, `id`, `budget_tokens`, `disclosure`, `full`, `explain`) | いいえ |
| `engram_route` | タスクを分類し、ルーティング先のメモリを一覧表示 | いいえ |
| `engram_search` | クエリでメモリを検索 | いいえ |
| `engram_verify`, `engram_status` | ハッシュを確認、ヘルスとカウントを報告 | いいえ |
| `engram_save`, `engram_save_session` | 番号付きの提案と `approval_token` を返す | いいえ |
| `engram_commit` | 承認された提案を書き込む | はい、人間の承認後 |
| `engram_set_role`, `engram_set_rule_variant` | ロールまたはルールバリアントモードを更新 | はい |
| `engram_note` | 編集済みの作業層タスクノートを保存 (`text`, `objective`, `type`, `scope`); `{id, file, valid_until}` を返す | はい、1回のはい/キャンセル承認後 |

`engram_load` はデフォルトで [読み取りパスとルーティング](../concepts/read-path.md) で説明されている階層化された出力を生成します。より広範なレガシー出力を得るには `full: true` を渡します。`budget_tokens` は `id` と一緒には機能しません。

## 構造化された結果 {#structured-results}

人間向けのテキストは `content[0].text` にあります。`structuredContent` は `{contract_version, ok, data, diagnostics}` エンベロープであり、`data` には以下が含まれます：

- `engram_load`: `selected_keys`, `body_keys`, `card_ids`, `omitted_ids` (トークン予算によって除外されたID、`id` を介して取得可能), および `tokens`。
- `engram_search` および `engram_route`: `id`, `type`, `scope`, および `score` を持つ `entries`。ルートエントリはロード順であり、スコア順にはソートされません。

## 承認とコミット (Commit) {#approval-and-commit}

`engram_save` および `engram_save_session` は**提案専用**です：プレビューと `approval_token` を返します。人間がチャットで正確な候補を承認した後、`approval_token` と `approve: "all"` または1ベースの候補番号のリストを指定して `engram_commit` を呼び出します。`save-session --force` と同じパスを通じて書き込むため、関連する候補や重複する候補は通常どおり延期されます。

- トークンはランダムで、ワークスペースにバインドされ、使い捨てで、30分後に期限切れになります。
- トークンのハッシュのみがgitignoreされた `pending-approvals.json` に保存され、保留中の候補を編集すると整合性チェックが失敗します。
- 人間が表示された候補を承認する前に `engram_commit` を呼び出してはいけません。
- `engram_commit` は `tools/list` で `_meta["anthropic/requiresUserInteraction"]: true` を保持するため、Claude Codeはバイパスモードでも呼び出しごとに確認を求めます。管理されたCodexブロックは `approval_mode = "approve"` を含む `[mcp_servers.engram.tools.engram_commit]` を追加し、Geminiの `mcpServers.engram` エントリが確認をスキップする `trust: true` を設定している場合、`engram doctor` が警告（`host.gemini_trust`）します。
- 各候補は確定的な `Verdict:` 行（`ADD`, `UPDATE <id>`, `SUPERSEDE <id>`, `NOOP duplicate of <id>`）を持ちます。トークンは評決を固定し、`engram_commit` は再計算された評決がまだ一致している間にのみ `SUPERSEDE` を適用します。
- `approval_token` はエージェントに返されます。これは提案が存在することを証明するものであり、人間がそれを承認したことを証明するものではありません。人間のゲートは `engram_commit` に対するホストのツールごとの権限プロンプトであるため、`mcp__engram__engram_commit`（またはホストの同等物）を許可リストに追加したり自動承認したりしないでください。

### 承認ダイアログ (Elicitation) {#approval-dialog-elicitation}

クライアントがフォーム引き出し（elicitation）を宣言すると、`engram_save` および `engram_save_session` はトークンを返す代わりにホスト独自のダイアログで人間に尋ねます：

- フォームには、`ADD`/`UPDATE` とIDタイトル（メモリテキストは含まれません）および保存スコープを持つ候補番号が一覧表示されます。`both` は1つのスコープに絞り込むことはできますが、広げることはできません。
- `accept` は `engram_commit` と同じパスを通じて選択された候補を正確に書き込みます。`approval_token` は返されません。
- `decline` は提案を取り消します：その後そのトークンを使用した `engram_commit` は `approval was declined in the approval dialog` で失敗します。無効な回答もそれを取り消します。
- `cancel`、60秒のタイムアウト、またはクライアントエラーは、先頭に `nothing was saved` が付いた上記のトークンテキストにフォールバックするため、引き出しを宣言してもダイアログを閉じるホストは引き続き機能します。自動的に拒否するホストには `engram-mcp --no-elicitation` が必要です。
- レガシークライアントはサーバーからクライアントへの `elicitation/create` リクエストを受信します。MCP 2026-07-28クライアントは、`requestState` がツール、ワークスペース、および引数にバインドされたHMAC封印された有効期限付きエンベロープである `input_required` 結果を受信します。これらは `inputResponses` とその `requestState` を使用して `tools/call` を再試行します。偽造、期限切れ、または不一致の状態は `-32602` を返し、何も書き込みません。サーバーの再起動により開いている状態が無効になるため、エージェントは再度提案します。
- この機能がなく `--no-elicitation` を持つ呼び出しは、変更されていないトークンフローを使用します。

### 作業層ノート {#working-tier-notes}

`engram_note` は1つの短いタスクノートをgitignoreされた `working/` 層に保存します（`source: note`, `tier: working`, `valid_until` = 今日 + `load.working_ttl_days`）。テキストは編集され、指示のような行はプレビューの前に拒否されます。人間は上記で説明したのと同じダイアログ、`input_required` 再試行、または `approval_token` フローを通じて1つのはい/キャンセルプロンプトに応答します。`decline`、`cancel`、およびタイムアウトは何も書き込みません。ノートが同じIDを持つ永続メモリを更新することはなく、`engram promote` が永続メモリにする唯一の方法です。SessionStartは、`ENGRAM_SESSION_OBJECTIVE` がノートの目標と一致しない限りノートを除外します。一致しない場合は1行カードとして表示されます。ツールは `readOnlyHint: false` を持ち、`destructiveHint` は持ちません。

## 強制ルール {#force-rule}

ショートカット `/engram ss -f` を含む明示的な `/engram save-session --force` リクエストは、CLI書き込みパスを使用する必要があります。カウントされたショートカット `/engram ss -f last 50 sessions` は `engram save-session --query-level 50 --force` を使用する必要があります。MCPのみのホストは `engram_commit` を通じてコミットします。

## OpenCode MCP エントリ {#opencode-mcp-entry}

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

MCPサーバーは標準のJSON-RPCハンドシェイク（`initialize`, `notifications/initialized`, `tools/list`, および `tools/call`）を実装し、`ping` に応答します。メモリはMCPリソースとしても公開され（`engram://index` は1行カードを一覧表示し、`engram://memory/{id}` は `engram load --id` と同じ本文を読み取り、フェッチとしてカウントされます）、1つのプロンプト `propose` がメモリ提案プロトコルを返します。`resources/list` はインデックスに使用量上位の `mcp.resource_limit` メモリを加えたものを返します（JSON設定、デフォルト20、0〜200）。読み取りツールは `annotations.readOnlyHint: true` を保持します。不正な形式のJSON行は `-32700` エラー応答を受け取り、サーバーは実行を継続します。`id` のないリクエストは通知であり、応答を受信しません。`tools/call` ではないベアメソッド呼び出しはプレーンテキストを返します。

## 次のステップ {#next-steps}

- [エージェント統合の概要](overview.md)
- [フックと証明行](hooks.md)
