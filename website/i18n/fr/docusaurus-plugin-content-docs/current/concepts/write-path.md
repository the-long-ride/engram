---
title: Chemin d’écriture et approbation
sidebar_position: 6
description: Les agents proposent, les humains approuvent. Seule la mémoire approuvée est écrite, puis les index, le graphe, les hachages et le journal des modifications sont actualisés.
---

# Chemin d’écriture et approbation {#write-path-and-approval}

Le flux d’écriture est la frontière de confiance. Les agents proposent, les humains approuvent.

## Flux d’écriture {#write-flow}

1. L’agent propose un ou plusieurs candidats.
   Avec `save-session --query-level <n>`, l’agent peut considérer jusqu’à n conversations récentes accessibles entre humain et agent, mais uniquement comme contexte de proposition.
   La formule naturelle `/engram ss -f last 50 sessions` correspond à la même portée plus une approbation de forçage explicite : `engram save-session --query-level 50 --force`.
2. Engram analyse le type du candidat et la portée cible.
3. Engram vérifie le schéma, les secrets, les motifs d’injection de prompt et la sûreté des chemins.
4. L’humain voit un aperçu. Chaque candidat porte une ligne `Verdict:` déterministe : `ADD`, `UPDATE <id>`, `SUPERSEDE <id>` ou `NOOP duplicate of <id>` (aucun appel à un modèle).
5. Les réponses de la CLI directe utilisent `A`, `A 1,3`, `B <note>` ou `C`.
6. Les réponses dans le chat d’un agent IA utilisent `yes`, `audit` ou `cancel` après les candidats exacts affichés.
7. Seule la mémoire approuvée est écrite. `A` et `B` ignorent les candidats `NOOP`, et l’approbation d’un `SUPERSEDE` marque l’ancienne mémoire comme remplacée ; `--force` et l’enregistrement automatique n’appliquent jamais un `SUPERSEDE`, ils le diffèrent pour relecture.
8. L’index, le graphe, les hachages et le journal des modifications sont actualisés.

## Mots d’approbation {#approval-words}

Les mots d’approbation sont `yes`, `approve`, `confirm` ou `save`. Les mots d’audit sont `audit`, `revise`, `correct` ou un texte de remplacement modifié. Les mots d’annulation sont `cancel`, `stop` ou un refus. Seule une approbation donnée après l’affichage exact des candidats autorise `engram save-session --force` pour ces candidats.

La CLI directe dans un terminal reste A/B/C. Les outils de proposition MCP restent sans écriture.

## Indications sur les mémoires apparentées {#related-memory-hints}

Lorsque `engram save` trouve des mémoires actives apparentées, l’aperçu d’approbation les signale avec une suggestion de `depends_on` ou un avertissement de doublon possible. Accepter enregistre l’aperçu tel quel ; refusez d’abord si vous voulez restructurer les dépendances ou archiver les doublons avant d’enregistrer.

Pour `save-session --force`, Engram s’interrompt avant d’écrire lorsque ces indications de mémoires apparentées apparaissent. L’agent doit utiliser la réponse pour réfléchir à une nouvelle exécution structurée : ajouter `DEPENDS_ON: memory-id` pour les dépendances, `LEVEL: advanced` lorsqu’une mémoire est plus poussée que son prérequis, ou `UPDATE: memory-id` lorsqu’un candidat doit fusionner avec un doublon possible.

<!-- evidence-foundation:v3:start -->
## Mémoire étayée par des preuves {#evidence-backed-memory}

Pour un matériau source qui doit être relu avant de devenir de la mémoire active :

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<observation>.md
```

La première commande assainit la source et écrit une trace immuable identifiée par `trace_id`, ainsi qu’une enveloppe de boîte de réception modifiable. La seconde commande résout l’enveloppe vers sa trace, vérifie le hachage et la portée, puis n’écrit que de la mémoire schema v3 approuvée par un humain, avec `evidence_refs`. Modifier `## Raw Note` ne peut pas remplacer la preuve de la trace.
<!-- evidence-foundation:v3:end -->

## Contrôles de sûreté à l’enregistrement {#safety-checks-at-save-time}

- Validation du schéma
- Analyse des secrets
- Analyse des injections de prompt
- Sûreté des chemins
- Intégrité des hachages

## Pourquoi c’est important {#why-this-matters}

Sans protocole, la mémoire peut devenir un état invisible. Un état invisible est difficile à relire, difficile à partager et facile à empoisonner par accident pour les agents.

Engram rend la mémoire volontairement ennuyeuse : des fichiers, des diffs, des hachages, des portes de relecture et des commandes qu’un humain peut relancer.

## Étapes suivantes {#next-steps}

- [Confidentialité, règles d’ignorance et sûreté](safety.md)
- [CLI : save / save-session / observe](../cli/save-session.md)
