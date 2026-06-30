# build.gradle (racine Android)

## Chemin du fichier
`android/build.gradle`

## Description
Fichier de configuration Gradle racine du projet Android. Définit les versions globales du SDK, NDK, Kotlin et les plugins Gradle nécessaires.

## Composants/clés principaux

### Variables globales (ext)
- **buildToolsVersion** : `36.0.0`
- **minSdkVersion** : `24` (Android 7.0)
- **compileSdkVersion** : `36`
- **targetSdkVersion** : `36`
- **ndkVersion** : `27.1.12297006`
- **kotlinVersion** : `2.1.20`

### Dépendances buildscript
- `com.android.tools.build:gradle`
- `com.facebook.react:react-native-gradle-plugin`
- `org.jetbrains.kotlin:kotlin-gradle-plugin`

### Plugins
- `com.facebook.react.rootproject`

## Dépendances
- Google Maven Repository
- Maven Central

## Détails importants
- Utilise SDK 36 (Android 14+)
- Kotlin 2.1.20
- NDK 27.1 pour la compilation native
