# file_paths.xml

## Chemin du fichier
`android/app/src/main/res/xml/file_paths.xml`

## Description
Configuration des chemins de fichiers autorisés pour le `FileProvider` Android. Définit le répertoire accessible pour le partage de fichiers.

## Composants/clés principaux
- **external-files-path** : 
  - **name** : `logs`
  - **path** : `Documents/appcollege-logs/`

## Dépendances
- Utilisé par `AndroidManifest.xml` pour le `FileProvider`

## Détails importants
- Autorise l'accès uniquement au sous-dossier `Documents/appcollege-logs/` dans les fichiers externes de l'app
- Utilisé pour partager les fichiers de logs via l'intent de partage Android
