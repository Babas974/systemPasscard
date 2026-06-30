# main.tsx

**Chemin du fichier :** `app/src/main.tsx`

## Description

Point d'entrée principal de l'application React. Monte le composant `App` dans le DOM et enveloppe l'application dans `React.StrictMode` pour détecter les problèmes potentiels.

## Composants/clés/fonctions/exportations

- **ReactDOM.createRoot** — crée la racine de rendu React sur l'élément `#root`
- **React.StrictMode** — mode strict React (double rendu en dev, vérifications supplémentaires)
- **App** — composant principal de l'application

## Dépendances

- `react` — bibliothèque UI
- `react-dom/client` — client React pour le DOM
- `./App` — composant principal

## Détails importants

- Utilise l'API moderne `createRoot` (React 18+).
- Le `!` après `getElementById("root")` suppose que l'élément existe toujours (garanti par index.html).
