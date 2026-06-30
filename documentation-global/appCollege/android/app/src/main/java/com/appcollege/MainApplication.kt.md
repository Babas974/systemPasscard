# MainApplication.kt

## Chemin du fichier
`android/app/src/main/java/com/appcollege/MainApplication.kt`

## Description
Classe Application principale de l'app Android. Configure le React Host, enregistre les packages natifs et initialise le client HTTP personnalisé.

## Composants/clés principaux

### Classe
- **`MainApplication`** : Étend `Application` et implémente `ReactApplication`

### Propriétés
- **`reactHost`** : Host React Native configuré avec :
  - Packages par défaut (via `PackageList`)
  - Package natif personnalisé contenant `NetworkModule`

### Méthode `onCreate()`
1. Appelle `super.onCreate()`
2. Configure `OkHttpClientProvider` avec `NoProxyOkHttpClientFactory()`
3. Charge React Native via `loadReactNative(this)`

### Package natif anonyme
- **`createNativeModules()`** : Retourne `NetworkModule(reactContext)`
- **`createViewManagers()`** : Retourne une liste vide

## Dépendances
- `com.facebook.react.*` : ReactApplication, ReactHost, PackageList, ReactNativeApplicationEntryPoint
- `com.facebook.react.modules.network.OkHttpClientProvider`
- `NetworkModule`
- `NoProxyOkHttpClientFactory`

## Détails importants
- **NoProxyOkHttpClientFactory** : Remplace le client HTTP par défaut pour contourner le proxy local
- **Lazy loading** : Le `reactHost` est initialisé en lazy pour optimiser le démarrage
- **Autolinking** : Les packages sont gérés automatiquement via `PackageList`
