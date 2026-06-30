# tsconfig.json

**Chemin du fichier :** `app/tsconfig.json`

## Description

Configuration du compilateur TypeScript pour le projet frontend. Définit les options de compilation, la résolution des modules et les règles de stricte.

## Composants/clés/fonctions/exportations

- **compilerOptions** :
  - `target: "ES2020"` — cible ECMAScript 2020
  - `useDefineForClassFields: true` — utilise `Object.defineProperty` pour les champs de classe
  - `lib: ["ES2020", "DOM", "DOM.Iterable"]` — bibliothèques standards
  - `module: "ESNext"` — modules ES modernes
  - `moduleResolution: "bundler"` — résolution adaptée aux bundlers
  - `allowImportingTsExtensions: true` — autorise les imports avec `.ts`
  - `resolveJsonModule: true` — autorise les imports JSON
  - `isolatedModules: true` — chaque fichier est compilé indépendamment
  - `noEmit: true` — pas de sortie fichier (Vite gère le build)
  - `jsx: "react-jsx"` — transforme le JSX via la runtime React
  - `strict: true` — toutes les options strictes activées
  - `noUnusedLocals: true` — interdit les variables locales inutilisées
  - `noUnusedParameters: true` — interdit les paramètres inutilisés
  - `noFallthroughCasesInSwitch: true` — interdit le fallthrough dans les switch
- **include** : `["src"]` — uniquement le dossier src
- **exclude** : fichiers de test exclus de la compilation principale

## Dépendances

Aucune (fichier de configuration).

## Détails importants

- La configuration est très stricte, ce qui aide à maintenir un code propre.
- Les fichiers de test sont exclus de `include` mais inclus via la config Vitest séparée.
