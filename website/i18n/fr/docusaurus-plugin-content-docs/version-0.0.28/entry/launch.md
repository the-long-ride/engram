---
title: Lancement du panneau de contrôle
sidebar_position: 2
description: Exécutez engram entry pour lancer le panneau de contrôle local Entry.
---

# Lancement du panneau de contrôle

Lancez le panneau :

```bash
engram entry
```

La commande démarre un serveur local et ouvre votre navigateur par défaut à l'URL du panneau.

## Comportement du navigateur

Le panneau s'ouvre automatiquement dans votre navigateur par défaut. Si ce n'est pas le cas, copiez manuellement l'URL imprimée dans un navigateur.

## Comportement du serveur local

Le serveur se lie localement afin que seule votre machine puisse l'atteindre. Il n'est pas exposé au réseau par défaut.

## Flux de fermeture du serveur

Fermez le serveur depuis l'onglet **Runtime** à l'aide de l'action **Close server**, ou arrêtez le processus du terminal qui a démarré `engram entry`. Fermer l'onglet du navigateur n'arrête pas le serveur.

## Erreurs de lancement courantes

- **Port already in use (Port déjà utilisé)** — un autre processus utilise le port du panneau. Arrêtez-le ou suivez les instructions de secours imprimées.
- **Browser did not open (Le navigateur ne s'est pas ouvert)** — copiez manuellement l'URL imprimée dans un navigateur.
- **No workspace initialized (Aucun espace de travail initialisé)** — exécutez d'abord `engram inject`, ou utilisez `engram entry` depuis la racine d'un projet.

## Étapes suivantes

- [Onglet Connections](connections.md)
- [Onglet Construct](construct.md)
