# build.gradle (app Android)

## Chemin du fichier
`android/app/build.gradle`

## Description
Fichier de configuration Gradle du module Android principal. Définit les paramètres de compilation, les dépendances, les types de build et la signature.

## Composants/clés principaux

### Plugins appliqués
- `com.android.application`
- `org.jetbrains.kotlin.android`
- `com.facebook.react`

### Configuration React Native
- **autolinkLibrariesWithApp()** : Autolinking automatique

### Android
- **namespace** : `com.appcollege`
- **applicationId** : `com.appcollege`
- **minSdkVersion** : 24 (Android 7.0)
- **targetSdkVersion** : 36
- **versionCode** : 10
- **versionName** : `0.1.0`

### Signing
- **debug** : Utilise `debug.keystore` (mot de passe standard Android)

### Build Types
- **debug** : Signature debug
- **release** : Signature debug (⚠️ pas de keystore de production), ProGuard désactivé par défaut

### Dépendances
- `com.facebook.react:react-android`
- Hermes ou JavaScriptCore selon la configuration

## Dépendances
- React Native Android
- Hermes (par défaut) ou JSC (`io.github.react-native-community:jsc-android:2026004.+`)

## Détails importants
- **⚠️ Sécurité** : Le build release utilise encore le keystore debug — nécessite un keystore de production
- **ProGuard** : Désactivé par défaut (`enableProguardInReleaseBuilds = false`)
- **Hermes** : Moteur JS par défaut, basculable vers JSC
- **API 36** : Compile et cible Android 14+
