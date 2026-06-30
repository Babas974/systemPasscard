# App.test.tsx

**Chemin du fichier :** `app/src/App.test.tsx`

## Description

Tests unitaires pour le composant `App`. Vérifie l'affichage, les compteurs et les opérations de suppression en utilisant des mocks des APIs Tauri.

## Composants/clés/fonctions/exportations

### Fonctions utilitaires
- **mockInvoke(handlers)** — configure les mocks pour la fonction `invoke` avec des valeurs par défaut

### Suites de tests

#### App - affichage
- **"affiche le titre Passage aujourd'hui"** — vérifie que le titre est présent
- **"affiche le message vide quand la base est vide"** — vérifie le message "Aucun scan enregistré"
- **"affiche les scans retournes par lister_scans_pagines"** — vérifie l'affichage des données

#### App - compteurs
- **"affiche 0/0 quand la base est vide"** — vérifie les zéros
- **"affiche les valeurs des compteurs"** — vérifie l'affichage de 7 et 42
- **"appelle lister_scans_pagines, compter_aujourd_hui et compter_total au chargement"** — vérifie les appels API

#### App - suppression
- **"appelle supprimer_scan lors du clic sur Supprimer"** — vérifie la suppression individuelle
- **"ouvre la modale de suppression"** — vérifie l'ouverture du modal
- **"appelle supprimer_tout quand on confirme"** — vérifie la suppression massive

## Dépendances

- `vitest` — framework de test (describe, it, expect, vi, beforeEach, afterEach)
- `@testing-library/react` — utilitaires de test (render, screen, waitFor, fireEvent, cleanup)
- `@tauri-apps/api/core` — mocké
- `@tauri-apps/api/event` — mocké
- `@tauri-apps/plugin-notification` — mocké
- `@tauri-apps/plugin-dialog` — mocké
- `./App` — composant testé

## Détails importants

- **Mocks complets** : toutes les APIs Tauri sont mockées pour permettre les tests sans backend.
- **Nettoyage** : `cleanup()` est appelé après chaque test via `afterEach`.
- **Valeurs par défaut** : `mockInvoke` fournit des réponses par défaut pour toutes les commandes Tauri.
- Les tests vérifient à la fois l'affichage et les interactions utilisateur.
