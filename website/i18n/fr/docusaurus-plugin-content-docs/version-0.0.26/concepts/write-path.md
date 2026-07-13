---
title: "Chemin d'écriture et approbation"
sidebar_position: 6
description: "Les agents proposent, les humains approuvent. Seule la mémoire approuvée est écrite, puis les index, le graphe, les empreintes numériques (hashes) et le journal des modifications sont actualisés."
---

# Protocole de Mémoire Humaine

## Approbation en Chat IA

Dans le chat avec un agent IA, l'approbation Engram est conversationnelle. L'agent montre d'abord des candidats affines `TYPE: ... | TEXT: ...`, y compris les variantes Light/Balanced/Strict pour les regles. Repondez `yes` pour enregistrer exactement ces candidats, `audit` pour les reviser, ou `cancel` pour arreter. Apres `yes`, l'agent utilise `engram save-session --force` avec les candidats approuves. Les enregistrements directs en CLI continuent d'utiliser A/B/C sauf si une commande accept-all a ete invoquee explicitement.


Engram n'est pas simplement une « mémoire d'agent ». C'est un protocole qui rend la mémoire inspectable, portable et gouvernée par les humains.

## Le Contrat

Le Markdown est une mémoire durable.

Les fichiers d'index et de graphe JSON sont des couches d'accélération.

L'approbation est la frontière de confiance (trust boundary).

Les hashes sont des vérifications d'intégrité.

Les règles d'exclusion (ignore rules) sont des contrôles de confidentialité.

Git assure la portabilité et l'historique d'audit.

Les adaptateurs d'agent sont des commodités, pas des autorités.

Les agents peuvent suggérer une mémoire, mais les humains possèdent ce qui devient de la mémoire.

## Types de Mémoire

| Type | Utilisation |
| --- | --- |
| Rule | préférence utilisateur, correction, contrainte, consigne "toujours/jamais" |
| Skill | flux de travail (workflow) répétable, liste de contrôle, procédure, procédure opérationnelle (runbook) |
| Knowledge | fait objectif du projet, décision, détail d'implémentation |

Chaque fichier de mémoire active comporte des sections `Context`, `Content` et `Example`. Les mémoires de type Rule visent également des limites de lignes concises afin que les directives chargées restent utiles.

## Flux d'Écriture

1. L'agent propose un ou plusieurs candidats.
   Avec `save-session --query-level <n>`, l'agent peut prendre en compte jusqu'à n conversations humain-agent récentes et accessibles, mais seulement comme contexte de proposition.
   La forme naturelle `/engram ss -f last 50 sessions` utilise le même périmètre avec approbation explicite de tous les candidats : `engram save-session --query-level 50 --force`.
2. Engram analyse le type de candidat et la portée cible (scope).
3. Engram vérifie le schéma, les secrets, les modèles d'injection de prompt et la sécurité des chemins d'accès.
4. L'humain voit un aperçu.
5. L'humain répond `A`, `A 1,3`, `B <note>` ou `C`.
6. Seule la mémoire approuvée est écrite.
7. L'index, le graphe, les hashes et le journal des modifications (changelog) sont actualisés.

## Flux de Lecture

1. Engram charge l'espace de travail (workspace) et les index globaux facultatifs.
2. Les entrées de l'espace de travail l'emportent sur les doublons globaux.
3. Les règles d'exclusion et les filtres de rôle masquent les entrées non pertinentes.
4. Le routage sensible au graphe sélectionne un pack de contexte compact.
5. Les vérifications de hash et de sécurité s'exécutent avant l'affichage du contenu.

## Pourquoi C'est Important

Sans protocole, la mémoire peut devenir un état invisible. Un état invisible est difficile à réviser, difficile à partager et facile à empoisonner accidentellement par les agents.

Engram rend la mémoire volontairement ennuyeuse : des fichiers, des diffs, des hashes, des barrières de révision et des commandes qu'un humain peut réexécuter.

Suivant : [Opérations](../cli/overview.md).

