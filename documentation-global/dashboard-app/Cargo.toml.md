# Cargo.toml

**Chemin du fichier :** `app/src-tauri/Cargo.toml`

## Description

Fichier de configuration Rust pour le crate `app`. Définit les dépendances native de l'application Tauri, incluant la base de données SQLite, le serveur HTTP actix-web et les plugins Tauri.

## Composants/clés/fonctions/exportations

### Package
- **name** : `"app"`
- **version** : `0.2.1`
- **authors** : `["S.Babas"]`
- **edition** : `2021`

### Library
- **name** : `"app_lib"`
- **crate-type** : `["staticlib", "cdylib", "rlib"]` — types de librairie pour Tauri

### Build dependencies
- **tauri-build** ^2 — outil de build Tauri

### Dependencies
- **tauri** ^2 — framework d'application desktop
- **tauri-plugin-opener** ^2 — plugin pour ouvrir des URLs/fichiers
- **tauri-plugin-notification** ^2 — plugin notifications natives
- **tauri-plugin-dialog** ^2 — plugin boîtes de dialogue
- **serde** ^1 (features: derive) — sérialisation/désérialisation
- **serde_json** ^1 — manipulation JSON
- **chrono** ^0.4 — manipulation de dates/heures
- **rusqlite** ^0.32 (features: bundled) — client SQLite (version bundlée)
- **actix-web** ^4 — serveur HTTP
- **actix-cors** ^0.7 — gestion CORS pour actix-web
- **tokio** ^1 (features: full) — runtime async
- **dirs** ^5 — répertoires système (config, data, desktop)

## Dépendances

Aucune (fichier de configuration).

## Détails importants

- **SQLite bundlé** : la feature `bundled` de rusqlite inclut SQLite compilé statiquement, pas besoin de l'installer séparément.
- **actix-web** : utilisé pour le serveur HTTP interne qui reçoit les scans de la tablette.
- **tokio** : runtime async complet pour actix-web.
- **dirs** : utilisé pour les chemins de config (`~/.config/appcollege/`) et de données (`~/.local/share/appcollege/`).
