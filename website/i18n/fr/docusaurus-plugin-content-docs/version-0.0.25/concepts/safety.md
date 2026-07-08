---
title: Confidentialité, règles d'exclusion et sécurité
sidebar_position: 7
description: Les règles d'exclusion, les validations d'approbation, les hachages et les profils protègent le contexte privé contre la capture accidentelle.
---

# Confidentialité, règles d'exclusion et sécurité

Engram est privé par défaut. Plusieurs couches empêchent le contexte privé de fuir dans la mémoire durable ou de franchir les limites des profils.

## Validation d'approbation (Approval gate)

Les écritures nécessitent une approbation humaine. Les agents proposent des candidats ; les humains les approuvent, les rejettent, les modifient ou les archivent. L'interface CLI directe en terminal utilise le système A/B/C. Le chat de l'agent d'IA utilise `yes` / `audit` / `cancel`.

## Regles d'exclusion (Ignore rules)

Les règles d'exclusion constituent des contrôles de confidentialité. Elles masquent les entrées non pertinentes ou sensibles lors du routage. Configurez-les dans le fichier `.engramignore` et dans la configuration de mémoire de l'espace de travail pour que les chemins et motifs privés ne soient jamais intégrés à l'index.

## Hachages (Hashes)

Les hachages sont des contrôles d'intégrité. Ils sont exécutés avant l'affichage du contenu et révèlent les modifications non sécurisées ayant contourné le flux d'écriture normal.

## Profils

Les profils isolent la mémoire de l'entreprise, des clients et personnelle afin que les API externes ou les agents d'entreprise ne fassent pas fuir le contexte d'un projet à l'autre. Voir [Profils et résolution de portée](profiles.md).

## Détection de secrets et d'injections

Au moment de la sauvegarde, Engram vérifie :

- la validation du schéma
- la détection de secrets (secrets scan)
- les motifs d'injection de requêtes (prompt injection)
- la sécurité des chemins

## Limites à connaître

La recherche par défaut d'Engram est une recherche lexicale déterministe. `engram search --semantic` ajoute une similarité locale déterministe, et non une recherche sémantique basée sur des plongements (embeddings). Les vecteurs du graphe sont des vecteurs de mots hachés locaux, pas des plongements sémantiques. La détection de contradictions est purement indicative. La configuration du chiffrement existe, mais le stockage chiffré n'est pas encore implémenté.

Ces limites sont affichées de manière intentionnelle. Engram doit informer clairement les utilisateurs sur ce qui est disponible aujourd'hui et sur les travaux futurs.

## Étapes suivantes

- [Chemin d'écriture et approbation](./write-path.md)
- [Résolution des problèmes d'exploitation](../operations/troubleshooting.md)
