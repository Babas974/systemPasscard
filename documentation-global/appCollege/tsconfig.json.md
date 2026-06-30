# tsconfig.json

## Chemin du fichier
`tsconfig.json`

## Description
Configuration du compilateur TypeScript pour le projet React Native. Étend la config de base fournie par `@react-native/typescript-config`.

## Composants/clés principaux
- **compilerOptions.types** : Déclare les types Jest disponibles globalement
- **compilerOptions.jsx** : Utilise le transformateur `react-native` pour les fichiers JSX
- **include** : Inclut tous les fichiers `.ts` et `.tsx` du projet
- **exclude** : Exclut `node_modules` et `Pods`

## Dépendances
- `@react-native/typescript-config` (config étendue)

## Détails importants
- Aucune configuration spécifique supplémentaire au-delà du preset React Native.
