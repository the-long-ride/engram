# Protocole De Mémoire Possédé Par L'Humain

Engram n'est pas seulement une "mémoire d'agent." C'est un protocole qui rend la mémoire inspectable, portable et gouvernée par l'humain.

## Contrat

Markdown est la mémoire durable.

JSON index et graph sont des couches d'accélération.

L'approbation est la frontière de confiance.

Les hashes sont des contrôles d'intégrité.

Les ignore rules sont des contrôles de confidentialité.

Git est la portabilité et l'historique d'audit.

Les adaptateurs d'agent sont pratiques, pas autoritaires.

Les agents suggèrent; les humains décident ce qui devient mémoire.

## Types

| Type | Usage |
| --- | --- |
| Rule | préférence, correction, contrainte |
| Skill | workflow, checklist, procédure |
| Knowledge | fait objectif, décision, détail d'implémentation |

Chaque mémoire active contient `Context`, `Content` et `Example`.

## Écriture

1. L'agent propose des candidats.
2. Engram détecte type et scope.
3. Engram valide schema, secrets, injection et chemins.
4. L'humain voit un aperçu.
5. L'humain répond `A`, `A 1,3`, `B <note>` ou `C`.
6. Seule la mémoire approuvée est écrite.
7. Index, graph, hashes et changelog sont rafraîchis.

## Lecture

1. Engram charge workspace et global index.
2. Le workspace gagne sur les duplicats globaux.
3. Ignore rules et rôles filtrent le bruit.
4. Le graph routing choisit un contexte compact.
5. Hashes et sécurité passent avant l'affichage.

Sans protocole, la mémoire devient un état invisible. Engram la remet dans des fichiers, diffs, hashes et revues.

Suite: [Opérations](operations.md).

