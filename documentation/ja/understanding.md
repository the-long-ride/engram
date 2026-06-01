# Engram を理解する

コマンドガイドの前にこのページを読むと、Engram の見方がつかみやすくなります。Engram の価値はコマンドの多さではなく、memory の所有者が人間であることです。

## 一文モデル

Engram は、AI agent が durable memory を使えるようにしつつ、何が durable になるかは人間が決める file protocol です。

## Engram とは

Engram は次のための knowledge memory center です:

- project rules
- team decisions
- repeatable workflows
- durable facts
- 複数 project に持ち運びたい personal preferences

Memory 本体は普通の Markdown です。index、graph、hash、adapter は、その Markdown を見つけやすく、安全に使うための補助です。

## Engram ではないもの

Engram は次のものではありません:

- agent の隠れた脳
- vendor が所有する memory silo
- project documentation の代替
- authority を名乗る vector database
- すべてを永久保存する automatic recorder

Agent は memory を提案できます。人間が承認、拒否、編集、archive し、memory を所有します。

## 中心の約束

Engram は AI memory を次のようにします:

- reviewable: 普通の editor で読める
- portable: Git で sync し、複数 agent で使える
- correctable: 間違った memory を理由付きで archive できる
- private by default: ignore rules と approval gate が誤保存を減らす
- deliberately simple: 見えない platform state より Markdown の方が信頼しやすい

## レイヤー

| Layer | 意味 |
| --- | --- |
| Markdown | durable source of truth |
| JSON index | fast lookup layer |
| JSON graph | topic/relationship routing layer |
| Hashes | integrity checks |
| Approval | 書き込み前の trust boundary |
| Ignore rules | privacy controls |
| Git | history, portability, review, recovery |
| Agent adapters | Codex, Claude, Cursor, Gemini などの agent 向け convenience layer |

生成された JSON は agent が memory を早く探す助けになりますが、authority ではありません。JSON と Markdown が食い違う場合、Markdown が勝ちます。

## Memory Lifecycle

1. session、file、human note に有用な知識がある。
2. agent が短い memory candidate を提案する。
3. 人間がすべて承認、一部選択、note 追加、または拒否する。
4. Engram が承認済み Markdown memory を書く。
5. Engram が hash、index、graph、changelog を更新する。
6. 未来の agent は現在の task に関係する memory だけを load する。
7. memory が誤りになったら、Engram が理由付きで archive する。

この lifecycle により、memory は有効なまま、見えない state にはなりません。

## Human, Agent, Engram, Git

| Actor | 役割 |
| --- | --- |
| Human | 何が durable memory になるか決める |
| Agent | pattern を見つけて candidate を提案する |
| Engram | schema, safety, routing, approval, maintenance を適用する |
| Git | memory を machine 間で運び、review history を残す |

Agent は助けになりますが、owner ではありません。

## よい Memory

よい Engram memory は:

- 来週も意味があるほど安定している
- 後で routing できるほど具体的
- agent context に入るほど短い
- 意図した scope に対して安全
- rule、workflow、knowledge のどれかとして明確

悪い memory は、一時的な chat noise、secret、credential、一度だけの推測、承認されていない fact です。

## Scope

Workspace memory はここにあります:

```text
<project>/.agents/.engram/
```

Global memory は optional で、user が設定した場所に置きます。

Workspace が優先です。Global は reusable preference、personal habit、team default の fallback です。

## Built-In Agent Memory だけにしない理由

Built-in memory は便利ですが、inspect、diff、export、share、correct が難しいことがあります。多くは特定の app や account に属します。

Engram は durable layer を見える形にします。Built-in memory も役立ちますが、重要な知識は人間が所有する Engram を source にするべきです。

## 知っておく制限

現在の search は deterministic lexical search です。Graph vector は local hashed word vector で、semantic embedding ではありません。Contradiction detection は advisory signal です。Encryption config はありますが、encrypted storage はまだ実装されていません。

これらの制限は明示するべきです。Engram は、今日実際にあるものと future work を分けて伝えます。

次: [AI agent quickstart](quickstart.md)。
