# package.json

**Chemin du fichier :** `app/package.json`

## Description

Fichier de configuration du projet Node.js pour l'application frontend React. Définit les dépendances, les scripts de développement et les outils de build.

## Composants/clés/fonctions/exportations

- **name** : `"app"` — nom du package
- **version** : `0.1.1`
- **type** : `"module"` — utilisation d'ES modules
- **scripts** :
  - `dev` — lance le serveur de développement Vite
  - `build` — compilation TypeScript + build Vite
  - `preview` — aperçu du build de production
  - `tauri` — lance les commandes Tauri CLI
  - `test` — exécute les tests Vitest
  - `test:watch` — lance les tests en mode observateur
- **dependencies** :
  - `@tauri-apps/api` ^2.11.0 — API Tauri pour le frontend
  - `react` ^19.2.7 — bibliothèque UI
  - `react-dom` ^19.2.7 — rendu React pour le DOM
- **devDependencies** :
  - `@tauri-apps/cli` ^2.11.2 — CLI Tauri
  - `@tauri-apps/plugin-dialog` ^2.7.1 — plugin boîtes de dialogue
  - `@tauri-apps/plugin-notification` ^2.3.3 — plugin notifications natives
  - `@testing-library/jest-dom` ^6.6.3 — matchers DOM pour les tests
  - `@testing-library/react` ^16.1.0 — utilitaires de test React
  - `@types/react` / `@types/react-dom` — types TypeScript
  - `@vitejs/plugin-react` ^4.7.0 — plugin React pour Vite
  - `jsdom` ^25.0.1 — environnement DOM pour les tests
  - `typescript` ~5.6.3
  - `vite` ^6.4.3 — outil de build
  - `vitest` ^2.1.8 — framework de tests

## Dépendances

Aucune importation externe (fichier JSON de configuration).

## Détails importants

- Le projet utilise pnpm comme gestionnaire de packages (déduit de `pnpm dev` dans tauri.conf.json).
- Les plugins Tauri (`dialog`, `notification`) sont en devDependencies car ils ne sont utilisés que via les imports TypeScript.
