---
title: Traces de preuve et provenance
sidebar_position: 7
description: Comment Engram préserve des preuves immuables, relie la mémoire approuvée à sa source et expose les mêmes métadonnées dans la CLI et l’interface web.
---

# Traces de preuve et provenance {#evidence-traces-and-provenance}

Engram sépare les preuves de la mémoire approuvée. Une trace préserve l’enregistrement de source assaini ; une mémoire reste une instruction ou une référence approuvée par un humain qui cite cette preuve.

## Contrat de la mémoire approuvée {#approved-memory-contract}

Les nouvelles mémoires approuvées utilisent le schema v3. Les anciens fichiers v1 et v2 restent lisibles et ne sont jamais réécrits silencieusement.

```yaml
schema_version: 3
authority: instruction | reference
evidence_refs: [tr_...]
derived_from: [session-id]
revision: 1
supersedes: [older-memory-id]
superseded_by: newer-memory-id
valid_from: YYYY-MM-DD
valid_until: YYYY-MM-DD | null
last_confirmed: YYYY-MM-DD
```

Les champs du contrat sont `schema_version`, `authority`, `evidence_refs`, `derived_from`, `revision`, `supersedes`, `superseded_by`, `valid_from`, `valid_until` et `last_confirmed`.

## Contrat de la trace immuable {#immutable-trace-contract}

Chaque fichier `traces/<trace-id>.jsonl` contient exactement un enregistrement canonique et est créé de façon exclusive ; un identifiant de trace existant ne peut donc pas être écrasé. Les champs `trace_id`, `session_id`, `source_hash`, `trust_level`, `sensitivity` et `retention` préservent l’identité, l’origine, l’intégrité, la confiance, la confidentialité et le cycle de vie. `authority: evidence` est une simple donnée et n’agit jamais comme une instruction.

```json
{
  "trace_id": "tr_...",
  "authority": "evidence",
  "session_id": "session-id",
  "source_hash": "sha256:...",
  "trust_level": "human",
  "sensitivity": "private",
  "retention": "30d"
}
```

## La CLI et l’interface web (Web UI) restent synchronisées {#cli-and-web-ui-stay-synchronized}

`engram observe` et les hooks de transcription assainissent avant la persistance. La CLI affiche l’identifiant de trace créé, et `save-session` reporte `evidence_refs` et `derived_from` dans la mémoire approuvée. L’interface web Entry (Web UI) lit le même index et affiche l’autorité, les identifiants de preuve, l’origine de session, la révision, la validité et les liens de remplacement dans le panneau de détail de la mémoire.

## Sûreté et migration {#safety-and-migration}

La capture humaine par défaut utilise `trust_level: human`, `sensitivity: private` et `retention: 30d`, sauf configuration contraire. Une preuve expirée ou manquante bloque les nouvelles écritures approuvées. Les enveloppes d’observation existantes restent des commodités de relecture qui pointent vers des traces, et l’initialisation migre une seule fois les anciennes enveloppes éligibles.

## Intégrité et portée de la promotion {#promotion-integrity-and-scope}

L’enveloppe de la boîte de réception est un matériau de relecture modifiable, pas la source de preuve. Pendant `save-session --file`, Engram rouvre la trace immuable, vérifie le hachage de l’enveloppe lorsqu’il est présent et utilise le texte, la session et les métadonnées de source de la trace. Modifier `## Raw Note` ne peut pas changer le contenu promu. Un enregistrement fondé sur une trace est lié à la portée workspace ou globale de la trace ; un `--scope` explicite en conflit est rejeté. Les anciens identifiants de trace et de session sont placés dans un espace de noms par portée pour éviter les collisions de provenance.
