# AndroidManifest.xml

## Chemin du fichier
`android/app/src/main/AndroidManifest.xml`

## Description
Manifeste Android de l'application. Définit les permissions, l'activité principale, le provider de fichiers et la configuration réseau.

## Composants/clés principaux

### Permissions
- **INTERNET** : Accès réseau pour communiquer avec le PC
- **ACCESS_NETWORK_STATE** : Vérification de l'état du réseau
- **VIBRATE** : Vibrations pour les retours haptiques

### Application
- **android:name** : `.MainApplication` — classe Application personnalisée
- **android:label** : `@string/app_name` (AppCollege)
- **android:allowBackup** : `false`
- **android:usesCleartextTraffic** : `true` — autorise le HTTP non chiffré
- **android:networkSecurityConfig** : `@xml/network_security_config`

### Activity
- **MainActivity** : Activité principale avec intent-filter MAIN/LAUNCHER
- **launchMode** : `singleTask`
- **windowSoftInputMode** : `adjustResize`

### Provider
- **FileProvider** : Pour le partage de fichiers logs
- **authorities** : `${applicationId}.fileprovider`
- **file_paths** : `@xml/file_paths`

## Dépendances
- `@xml/network_security_config`
- `@xml/file_paths`
- `@string/app_name`
- `@style/AppTheme`

## Détails importants
- **Cleartext HTTP** : Autorisé via `usesCleartextTraffic="true"` et `network_security_config` — nécessaire pour communiquer avec le serveur local en HTTP
- **FileProvider** : Utilisé pour partager les fichiers de logs via l'intent ACTION_SEND
- **Sauvegarde désactivée** : `allowBackup="false"` pour des raisons de sécurité
