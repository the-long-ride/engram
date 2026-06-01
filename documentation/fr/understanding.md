# Comprendre Engram

Lis cette page avant le guide des commandes. Engram vaut surtout par la propriété de la mémoire, pas par le nombre de commandes.

## Modèle En Une Phrase

Engram est un protocole de fichiers qui permet aux agents IA d'utiliser une mémoire durable pendant que les humains décident ce qui devient durable.

## Ce Qu'est Engram

Engram est un centre de mémoire de connaissance pour:

- règles de projet
- décisions d'équipe
- workflows répétables
- faits durables
- préférences personnelles qui doivent suivre entre projets

La mémoire est du Markdown ordinaire. L'index, le graphe, les hashes et les adapters rendent ce Markdown plus facile et plus sûr à utiliser.

## Ce Que N'est Pas Engram

Engram n'est pas:

- un cerveau caché de l'agent
- un silo mémoire possédé par un fournisseur
- un remplacement de la documentation projet
- une base vectorielle qui prétend faire autorité
- un enregistreur automatique qui garde tout pour toujours

Les agents peuvent proposer une mémoire. Les humains approuvent, rejettent, éditent, archivent et possèdent la mémoire.

## Promesse Centrale

Engram cherche à rendre la mémoire IA:

- révisable: lisible dans un éditeur normal
- portable: synchronisable avec Git et utilisable par plusieurs agents
- corrigeable: une mauvaise mémoire peut être archivée avec une raison
- privée par défaut: ignore rules et approbation limitent les captures accidentelles
- volontairement simple: Markdown inspire plus confiance qu'un état invisible de plateforme

## Les Couches

| Couche | Sens |
| --- | --- |
| Markdown | source de vérité durable |
| JSON index | couche de recherche rapide |
| JSON graph | routage par sujet et relation |
| Hashes | contrôles d'intégrité |
| Approval | frontière de confiance avant écriture |
| Ignore rules | contrôles de confidentialité |
| Git | historique, portabilité, revue, récupération |
| Agent adapters | couche de confort pour Codex, Claude, Cursor, Gemini et autres agents |

Le JSON généré aide les agents à trouver la mémoire plus vite, mais il ne fait pas autorité. Si JSON et Markdown divergent, Markdown gagne.

## Cycle De Vie De La Mémoire

1. Une session, un fichier ou une note humaine contient un savoir utile.
2. Un agent propose des candidats concis.
3. Un humain approuve tout, sélectionne certains éléments, ajoute une note ou rejette.
4. Engram écrit la mémoire Markdown approuvée.
5. Engram met à jour hashes, index, graphe et changelog.
6. Les futurs agents chargent seulement la mémoire utile à la tâche.
7. Si une mémoire devient fausse, Engram l'archive avec une raison.

Ce cycle garde la mémoire active sans la rendre invisible.

## Humain, Agent, Engram, Git

| Acteur | Rôle |
| --- | --- |
| Humain | décide ce qui devient mémoire durable |
| Agent | repère des patterns et propose des candidats |
| Engram | applique schéma, sécurité, routage, approbation et maintenance |
| Git | transporte la mémoire entre machines et garde l'historique de revue |

L'agent aide, mais il n'est pas propriétaire.

## Bonne Mémoire

Une bonne mémoire Engram est:

- assez stable pour être utile la semaine prochaine
- assez précise pour être retrouvée plus tard
- assez courte pour entrer dans le contexte de l'agent
- sûre pour le scope prévu
- écrite comme règle, workflow ou connaissance

Une mauvaise mémoire est du bruit de chat temporaire, un secret, un credential, une spéculation ponctuelle ou un fait non approuvé.

## Scope

La mémoire workspace vit ici:

```text
<project>/.agents/.engram/
```

La mémoire globale est optionnelle et vit là où l'utilisateur la configure.

Le workspace gagne. Le global sert de fallback pour préférences réutilisables, habitudes personnelles ou defaults d'équipe.

## Pourquoi Pas Seulement La Mémoire Intégrée

La mémoire intégrée est pratique, mais elle peut être difficile à inspecter, comparer, exporter, partager ou corriger. Elle appartient souvent à une app ou un compte.

Engram rend la couche durable visible. La mémoire intégrée peut aider, mais Engram doit être la source possédée quand le savoir compte.

## Limites À Connaître

La recherche par defaut est lexicale et deterministe. `engram search --semantic` ajoute une similarite locale deterministe, pas une recherche semantique avec embeddings. Les vecteurs du graphe sont des vecteurs locaux de mots hashes, pas des embeddings semantiques. La detection de contradictions est indicative. La configuration de chiffrement existe, mais le stockage chiffre n'est pas encore implemente.

Ces limites sont dites explicitement. Engram doit montrer ce qui existe aujourd'hui et ce qui reste du travail futur.

Suite: [Quickstart agent IA](quickstart.md).
