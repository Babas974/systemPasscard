# lib.rs

**Chemin du fichier :** `app/src-tauri/src/lib.rs`

## Description

Point d'entrée de la librairie Rust. Re-exporte les modules partagés `db` et `routes` pour qu'ils soient accessibles depuis main.rs et les autres binaires.

## Composants/clés/fonctions/exportations

- **pub mod db** — module de base de données SQLite
- **pub mod routes** — module des routes HTTP

## Dépendances

Aucune (déclaration de modules uniquement).

## Détails importants

- Ce fichier est minimal car son seul rôle est de re-exporter les modules.
- Le crate est configuré avec `crate-type = ["staticlib", "cdylib", "rlib"]` dans Cargo.toml pour être compatible avec Tauri.
- Le nom de la librairie est `app_lib` (défini dans Cargo.toml).
