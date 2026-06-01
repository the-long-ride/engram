# Comprendre Engram

Lisez ceci avant le guide des commandes. Engram est utile en raison de qui possède la mémoire, et non pas parce qu'il propose de nombreuses commandes.

## Modèle en Une Phrase

Engram est un protocole de fichier qui permet aux agents d'IA d'utiliser une mémoire durable tandis que les humains décident de ce qui devient durable.

## Ce Qu'est Engram

Engram est un centre de mémoire de connaissances pour :

- les règles de projet
- les décisions d'équipe
- les flux de travail (workflows) répétables
- les faits durables
- les préférences personnelles qui doivent voyager d'un projet à l'autre

La mémoire est en Markdown simple. L'index, le graphe, les hashes et les fichiers d'adaptateur n'existent que pour rendre ce Markdown plus facile et plus sûr à utiliser.

## Ce Qu'Engram N'est Pas

Engram n'est pas :

- un cerveau caché pour un agent
- un silo de mémoire appartenant à un fournisseur (vendor)
- un remplacement pour la documentation du projet
- une base de données vectorielle prétendant faire autorité
- un enregistreur automatique qui sauvegarde tout pour toujours

Les agents peuvent suggérer des éléments de mémoire. Les humains approuvent, rejettent, modifient, archivent et possèdent la mémoire.

## La Promesse Centrale

Engram s'efforce de rendre la mémoire de l'IA :

- révisable : vous pouvez la lire dans un éditeur standard
- portable : vous pouvez la synchroniser avec Git et l'utiliser sur différents agents
- corrigeable : une mémoire erronée peut être archivée au lieu de hanter silencieusement le travail futur
- privée par défaut : les règles d'exclusion (ignore rules) et les barrières d'approbation empêchent la capture accidentelle
- ennuyeuse à dessein : le Markdown est plus facile à croire et à valider qu'un état de plateforme invisible

## Les Couches

| Couche | Signification |
| --- | --- |
| Markdown | Source de vérité durable |
| JSON index | Couche de recherche rapide |
| JSON graph | Couche de routage par sujet et relation |
| Hashes | Vérifications d'intégrité |
| Approval | Limite de confiance avant les écritures |
| Ignore rules | Contrôles de confidentialité |
| Git | Historique, portabilité, révision, récupération |
| Agent adapters | Couche de commodité pour Codex, Claude, Cursor, Gemini et d'autres agents |

Le JSON généré aide les agents à trouver la mémoire plus rapidement, mais il ne fait pas autorité. Si les fichiers générés ne correspondent pas au Markdown, c'est le Markdown qui l'emporte.

## Cycle de Vie de la Mémoire

1. Une session, un fichier ou une note humaine contient des connaissances utiles.
2. Un agent propose des candidats de mémoire concis.
3. Un humain approuve tout, en sélectionne certains, ajoute une note ou les rejette.
4. Engram écrit la mémoire Markdown approuvée.
5. Engram actualise les hashes, l'index, le graphe et le journal des modifications (changelog).
6. Les futurs agents chargent uniquement la mémoire pertinente pour la tâche actuelle.
7. Si une mémoire devient erronée, Engram l'archive avec un motif.

Ce cycle de vie maintient la mémoire active sans la rendre invisible.

## Humain, Agent, Engram, Git

| Acteur | Rôle |
| --- | --- |
| Humain | Choisit ce qui devient une mémoire durable |
| Agent | Détecte les modèles et propose des candidats |
| Engram | Applique le schéma, la sécurité, le routage, l'approbation et la maintenance |
| Git | Transporte la mémoire entre les machines et fournit l'historique des révisions |

L'agent est utile, mais il n'est pas le propriétaire.

## Une Bonne Mémoire

Une bonne mémoire Engram est :

- assez stable pour avoir de l'importance la semaine prochaine
- assez spécifique pour être routée plus tard
- assez courte pour être chargée dans le contexte d'un agent
- assez sûre pour être partagée dans la portée (scope) prévue
- rédigée sous forme de règle, de flux de travail (workflow) ou d'élément de connaissance

Une mauvaise mémoire est constituée par le bruit temporaire du chat, les secrets, les identifiants, les spéculations ponctuelles ou les faits que personne n'a approuvés.

## Portée (Scope)

La mémoire de l'espace de travail vit dans :

```text
<projet>/.agents/.engram/
```

La mémoire globale est facultative et vit là où l'utilisateur la configure.

La mémoire de l'espace de travail l'emporte. La mémoire globale sert de secours (fallback) pour les préférences réutilisables, les habitudes personnelles ou les valeurs par défaut de l'équipe.

## Pourquoi Pas Seulement la Mémoire Intégrée de l'Agent

La mémoire intégrée est pratique, mais elle peut être difficile à inspecter, à comparer (diff), à exporter, à partager ou à corriger. Elle appartient souvent à une seule application ou à un seul compte.

Engram rend la couche durable visible. La mémoire intégrée peut toujours aider, mais Engram doit rester la source détenue par l'utilisateur lorsque les connaissances sont importantes.

## Limites à Connaître

La recherche par défaut d'Engram est une recherche lexicale déterministe. `engram search --semantic` ajoute une similarité locale déterministe, et non une recherche sémantique basée sur des embeddings complets. Les vecteurs du graphe sont des vecteurs de mots hachés locaux, pas des embeddings sémantiques. La détection des contradictions est indicative et consultative. La configuration du chiffrement existe, mais le stockage chiffré n'est pas encore implémenté.

Ces limites sont intentionnellement présentées de manière claire. Engram se doit de dire aux utilisateurs ce qui est réel aujourd'hui et ce qui relève du travail futur.

Suivant : [Démarrage rapide pour agent d'IA](quickstart.md).
