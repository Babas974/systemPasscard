# App.test.tsx

## Chemin du fichier
`__tests__/App.test.tsx`

## Description
Test unitaire de base pour le composant App. Vérifie que le composant se rend correctement sans erreur.

## Composants/clés principaux
- **Test `renders correctly`** : Crée une instance du composant `App` via `ReactTestRenderer` et vérifie qu'il se rend sans crash

## Dépendances
- `react`
- `react-test-renderer` : `ReactTestRenderer`
- `../App` : Composant App (default export)

## Détails importants
- Test basique de smoke test — ne vérifie pas le comportement métier
- Utilise `ReactTestRenderer.act()` pour gérer les effets de bord asynchrones
