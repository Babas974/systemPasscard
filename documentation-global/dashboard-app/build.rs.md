# build.rs

**Chemin du fichier :** `app/src-tauri/build.rs`

## Description

Script de build Rust exécuté avant la compilation. Appelle la fonction de build de Tauri pour générer les fichiers nécessaires (bindings, etc.).

## Composants/clés/fonctions/exportations

- **fn main()** — point d'entrée du script de build
  - Appelle `tauri_build::build()` pour générer les artefacts de build Tauri

## Dépendances

- **tauri-build** — crate de build Tauri

## Détails importants

- Ce fichier est automatiquement exécuté par Cargo avant la compilation.
- Il génère les bindings nécessaires entre le frontend et le backend Rust.
