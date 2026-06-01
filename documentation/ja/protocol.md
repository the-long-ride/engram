# 人間が所有する Memory Protocol

Engram は単なる "agent memory" ではありません。memory を inspect 可能、portable、人間が governance できるものにする protocol です。

## Contract

Markdown は durable memory です。

JSON index と graph は acceleration layers です。

Approval は trust boundary です。

Hashes は integrity checks です。

Ignore rules は privacy controls です。

Git は portability と audit history です。

Agent adapters は convenience であり authority ではありません。

agent は memory を提案できますが、何が memory になるかは人間が所有します。

## Memory Types

| Type | Use |
| --- | --- |
| Rule | preference, correction, constraint |
| Skill | repeatable workflow, checklist, procedure |
| Knowledge | objective fact, decision, implementation detail |

すべての active memory は `Context`, `Content`, `Example` を持ちます。

## Write Flow

1. Agent が candidates を提案します。
2. Engram が type と scope を parse します。
3. schema, secrets, prompt injection, path safety を検査します。
4. 人間が preview を見ます。
5. 人間が `A`, `A 1,3`, `B <note>`, `C` で返答します。
6. 承認された memory だけを書き込みます。
7. index, graph, hashes, changelog を更新します。

## Read Flow

1. Engram が workspace/global index を load します。
2. Workspace が global duplicate より優先します。
3. Ignore rules と roles がノイズを除外します。
4. Graph-aware routing が compact context を選びます。
5. 出力前に hash と safety checks が走ります。

protocol がないと memory は invisible state になります。Engram はそれを files, diffs, hashes, review gates に戻します。

次: [Operations](operations.md)。

