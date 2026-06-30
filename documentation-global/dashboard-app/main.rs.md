# main.rs

**Chemin du fichier :** `app/src-tauri/src/main.rs`

## Description

Point d'entrée principal de l'application Tauri. Initialise la base de données, configure le serveur HTTP actix-web, enregistre les commandes Tauri et gère l'état global de l'application.

## Composants/clés/fonctions/exportations

### Structures
- **AppState** — état global de l'application :
  - `db` : `Arc<Mutex<Connection>>` — connexion SQLite thread-safe
  - `startup` : `Instant` — moment du démarrage
  - `server_handle` : handle du serveur HTTP actix-web
  - `config_port` : port du serveur configurable
  - `log_dir` : dossier des logs

### Commandes Tauri (fonctions exposées au frontend)
- **lister_scans** — liste les 500 derniers scans
- **lister_scans_pagines** — liste les scans avec pagination et recherche
- **compter_aujourd_hui** — compte les scans du jour
- **compter_total** — compte le total des scans
- **compter_scans_filtres** — compte avec filtre de recherche
- **compter_avec_predicat** — compte selon un prédicat (aujourd'hui, jours précédents, tout)
- **obtenir_statistiques** — retourne les statistiques complètes
- **exporter_csv** — exporte les scans en CSV
- **supprimer_scan** — supprime un scan par ID
- **supprimer_tout** — supprime tous les scans
- **supprimer_aujourd_hui** — supprime les scans du jour
- **supprimer_precedents** — supprime les scans des jours précédents
- **forcer_focus** — force la mise au premier plan de la fenêtre
- **obtenir_port_serveur** — retourne le port actuel
- **changer_port_serveur** — modifie le port et sauvegarde en config
- **relancer_serveur** — retourne l'état du serveur
- **vider_anciens_logs** — supprime les fichiers logs antérieurs à hier

### Fonctions internes
- **build_emitter** — crée un émetteur d'events Tauri pour les nouveaux scans
- **build_log_emitter** — crée un émetteur d'events Tauri pour les logs
- **main** — point d'entrée principal

## Dépendances

- `app_lib::{db, routes}` — modules partagés
- `std::sync::{Arc, Mutex}` — synchronisation thread-safe
- `std::time::Instant` — chronomètre
- `tauri::{AppHandle, Emitter, State}` — API Tauri

## Détails importants

- **Serveur HTTP** : démarre sur un thread séparé avec actix-web, bind sur `0.0.0.0:{port}`.
- **CORS** : restreint aux adresses locales (127.0.0.1, localhost, 192.168.*, 10.*, 172.*).
- **Config** : port sauvegardé dans `~/.config/appcollege/config.json`.
- **Logs** : stockés sur le Bureau dans `~/Desktop/appcollege-logs/`.
- **Événements** : les nouveaux scans émettent l'event `nouveau-scan`, les logs émettent `nouveau-log`.
- **Routes debug** : `/debug/log` (POST), `/debug/logs` (GET/DELETE), `/seed` (POST, debug only).
- **Routes CRUD** : `/scan` (POST), `/scans` (GET), `/scan/{id}` (DELETE), `/scans/all|today|previous` (DELETE).
- **Seed** : route de test `/seed` uniquement en mode debug (`#[cfg(debug_assertions)]`).
