# MainActivity.kt

## Chemin du fichier
`android/app/src/main/java/com/appcollege/MainActivity.kt`

## Description
Activité principale Android de l'application. Point d'entrée de l'interface utilisateur React Native.

## Composants/clés principaux

### Classe
- **`MainActivity`** : Étend `ReactActivity`

### Méthodes
- **`getMainComponentName()`** : Retourne `"app"` — le nom du composant React Native racine
- **`createReactActivityDelegate()`** : Retourne un `DefaultReactActivityDelegate` avec Fabric activé

## Dépendances
- `com.facebook.react.ReactActivity`
- `com.facebook.react.ReactActivityDelegate`
- `com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled`
- `com.facebook.react.defaults.DefaultReactActivityDelegate`

## Détails importants
- **Fabric** : L'architecture nouvelle (Fabric renderer) est activée via `fabricEnabled`
- **singleTask** : Le mode de lancement est défini dans le manifest comme `singleTask`
- **Composant racine** : Le nom `"app"` correspond à l'export de `AppAvecBoundary` dans `App.tsx`
