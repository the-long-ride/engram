---
title: save / save-session / observe
sidebar_position: 3
description: Commandes d’écriture — enregistrer une mémoire, en enregistrer plusieurs à partir d’une session et capturer des notes brutes.
---

# save / save-session / observe

Les commandes d’écriture proposent de la mémoire en passant par la porte d’approbation.

## save

```bash
engram save [rule|workflow|knowledge] "<text>"
engram save --role frontend "<text>"
engram save --scope global "<text>"
```

`engram save` capture le meilleur candidat de mémoire unique, met automatiquement à jour une mémoire correspondante ou en crée une nouvelle, et affiche toujours la porte d’approbation A/B/C avant d’écrire.

Lorsque `engram save` trouve des mémoires actives apparentées, l’aperçu d’approbation les signale avec une suggestion de `depends_on` ou un avertissement de doublon possible.

## save-session

```bash
engram save-session
engram ss
engram save-session --query-level 3
engram ss -f
engram ss -f last 50 sessions
engram save-session --file transcript.md
engram save-session --force
```

Utilisez `save-session` lorsqu’une longue interaction a produit plusieurs candidats :

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` est facultatif. Ajoutez-le uniquement s’il explique pourquoi la mémoire existe. Les candidats peuvent aussi ajouter des champs `DEPENDS_ON`, `LEVEL` ou `UPDATE` lors de la restructuration de mémoires apparentées.

- `--query-level <n>` — explore jusqu’à n conversations récentes accessibles entre humain et agent ; doit être un entier positif ; les agents ne doivent pas inventer un historique indisponible
- `--force` / `-f` — chaque candidat généré est enregistré, car l’humain a explicitement approuvé ce raccourci
- `--file <path>` — pour des transcriptions ou de longs résumés déjà présents sur le disque

### Verdicts d’enregistrement {#save-verdicts}

Chaque aperçu de candidat (CLI, MCP et Entry) affiche une ligne `Verdict:` juste après `File:` : `ADD`, `UPDATE <id>`, `SUPERSEDE <id>` ou `NOOP duplicate of <id>`. Le verdict est déterministe (il repose sur les scores de déduplication et de mémoires apparentées existants ; aucun appel à un modèle). `A` et `B` ignorent les candidats `NOOP` et les listent comme ignorés ; `A 1,3` écrit exactement les candidats numérotés. L’approbation d’un `SUPERSEDE` écrit `supersedes: [old]` sur la nouvelle mémoire et `lifecycle: superseded` sur l’ancienne, de sorte que `engram load` l’écarte. `--force` et l’enregistrement automatique n’appliquent jamais un `SUPERSEDE` : il est différé jusqu’à ce que vous relanciez sans `--force` et le relisiez.

<a id="candidate-fields"></a>
### Champs d’un candidat {#candidate-fields}

En plus de `CONTEXT`, `DEPENDS_ON`, `LEVEL` et `UPDATE`, un candidat peut porter :

| Champ | Signification |
| --- | --- |
| `OBJECTIVE: task` ou `durable` | `task` enregistre dans le [niveau de travail](#working-memory-promote-and-prune) ; `durable` par défaut |
| `SCOPE: workspace` ou `global` | Remplace la portée de la commande pour ce candidat. L’aperçu d’approbation nomme la cible sur sa ligne `Scope:`. Avec `--force`, un candidat dont la portée sort de celle de la commande est différé, pas écrit |
| `APPLIES_TO: <globs>` | Jusqu’à 8 globs relatifs ; la mémoire est injectée lorsqu’un fichier correspondant est lu ou modifié |
| `DIRECTIVE: <line>` | Une ligne d’au plus 160 caractères, affichée sur la carte de la mémoire |

```text
TYPE: rule | TEXT: Route commands through MediatR. | DIRECTIVE: Route commands through MediatR | APPLIES_TO: src/Api/**
```

Les noms de champs ne sont pas sensibles à la casse dans le format `|`. Dans le format multiligne, ils ne sont reconnus qu’en majuscules ; les lignes de prose ordinaires comme `Scope: the billing module` restent donc du contenu.

Pour `/engram take-control --force` ou la formule naturelle `/engram take control force`, l’adaptateur slash normalise la formulation, ne génère que des candidats concis `TYPE: ... | TEXT: ...` et laisse Engram les enregistrer sans seconde invite d’approbation.

<a id="working-memory-promote-and-prune"></a>
## Mémoire de travail : promouvoir et purger {#working-memory-promote-and-prune}

```bash
engram promote <id>
engram promote workspace:<id>
engram working note "<text>" [--objective "<text>"] [--type knowledge|rule] [--scope workspace|global]
engram working prune --dry-run
engram working prune
```

Un candidat `OBJECTIVE: task` approuvé est écrit dans `.agents/.engram/working/` (ou `<global>/working/`), ignoré par Git, avec `tier: working`, le texte `--objective` et `valid_until` = aujourd’hui + `load.working_ttl_days` (14 par défaut, plage de 1 à 365). L’aperçu d’approbation affiche `Tier: working (expires <date>)`. Les mémoires de travail se chargent, se recherchent et se routent comme les mémoires durables jusqu’à leur expiration ; elles disparaissent ensuite de `load` avec le motif d’omission `lifecycle`. Les cartes et corps destinés aux agents sont étiquetés `working`.

- `engram promote <id>` affiche un aperçu A/B/C et, une fois approuvé, déplace la mémoire vers le stockage durable : il retire `tier` et `valid_until`, conserve `objective` et incrémente `revision`. Les mémoires de travail expirées ne peuvent pas être promues. Utilisez `workspace:<id>` ou `global:<id>` lorsque les deux portées contiennent le même identifiant.
- `engram working prune` supprime les mémoires de travail dont `valid_until` est dépassé et reconstruit les index, hachages et graphes ; `--dry-run` les liste d’abord. La mémoire durable n’est jamais touchée.
- `engram working note "<text>"` enregistre une note de tâche (`source: note`, type par défaut `knowledge`, `--type rule` autorisé) dans le niveau de travail. Le texte est expurgé et les lignes ressemblant à des instructions sont refusées. Une seule invite Y/C commande l’écriture et l’annulation n’écrit rien. Une note ne met jamais à jour une mémoire durable portant le même identifiant. Le démarrage de session l’omet sauf si `ENGRAM_SESSION_OBJECTIVE` correspond au `--objective` de la note ; sinon elle apparaît sous forme de carte. Promouvez-la avec `engram promote <id>`.

Les mémoires de travail n’atteignent jamais Git, et leurs entrées d’index, de graphe et de hachage restent dans des fichiers annexes locaux sous `working/`.

## observe

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` stocke des notes brutes assainies dans `inbox/`. Les notes de la boîte de réception ne sont pas de la mémoire active. Utilisez-le pour conserver des notes brutes avant de décider ce qui doit devenir de la mémoire durable.

<!-- evidence-foundation:v3:start -->
## Mémoire étayée par des preuves {#evidence-backed-memory}

```bash
engram observe --file session.md
# Output includes Trace: tr_... and the inbox wrapper path
engram save-session --file .agents/.engram/inbox/<observation>.md
```

La source immuable se trouve dans `.agents/.engram/traces/<trace-id>.jsonl` ; le Markdown de la boîte de réception n’est qu’une enveloppe de relecture. La promotion rouvre la trace et écrit la mémoire approuvée avec `evidence_refs` et `derived_from`. `engram observe --propose --file session.md` peut entrer immédiatement dans le flux d’approbation normal, mais il utilise toujours la trace comme preuve source. `engram observe --queue [--dry-run] [--limit n]` vide la file optionnelle des transcriptions `SessionEnd` vers les mêmes traces assainies et enveloppes de boîte de réception, et n’écrit aucune mémoire.
<!-- evidence-foundation:v3:end -->

## Indications sur les mémoires apparentées {#related-memory-hints}

Lorsqu’une exécution « tout accepter » signale des mémoires apparentées avant d’écrire, aucun fichier n’a encore été enregistré. L’agent doit relancer avec des candidats structurés :

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## Étapes suivantes {#next-steps}

- [inject / link / upgrade](inject-link-upgrade.md)
- [Concepts : chemin d’écriture et approbation](../concepts/write-path.md)


## Identité d’auteur Git {#git-author-identity}

Engram peut stocker un auteur global et une surcharge d’espace de travail facultative. La résolution suit l’ordre workspace, global, puis repli Git en lecture seule. Les paramètres n’affectent que les mémoires futures ; une surcharge d’espace de travail ne modifie jamais la configuration Git globale. Utilisez un plan explicite et une confirmation pour la synchronisation Git globale ou la migration des anciennes mémoires.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Lisez le [guide complet des paramètres de l’auteur Git](../operations/git-author-settings.md).
