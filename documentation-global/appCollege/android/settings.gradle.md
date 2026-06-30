# settings.gradle

## Chemin du fichier
`android/settings.gradle`

## Description
Configuration des paramètres Gradle pour le projet Android. Gère le plugin management, l'autolinking React Native et l'inclusion des modules.

## Composants/clés principaux

### Plugins
- **`com.facebook.react.settings`** : Plugin React Native pour l'autolinking
- **`org.gradle.toolchains.foojay-resolver-convention`** v0.8.0 : Résolution des toolchains JVM

### Configurations
- **toolchainManagement** : Désactive la résolution IBM_SEMERU en laissant les repos vides
- **autolinkLibrariesFromCommand()** : Autolinking automatique des bibliothèques React Native

### Projets
- **rootProject.name** : `appCollege`
- **include** : `:app`

## Dépendances
- `@react-native/gradle-plugin` (inclus via `includeBuild`)

## Détails importants
- Le `toolchainManagement` est configuré pour éviter les téléchargements indésirables de toolchains
- L'autolinking est géré via la commande React Native CLI
