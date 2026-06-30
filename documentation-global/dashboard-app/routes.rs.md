# routes.rs

**Chemin du fichier :** `app/src-tauri/src/routes.rs`

## Description

Handlers HTTP partagés entre le binaire Tauri (main.rs) et le serveur headless. Définit toutes les routes de l'API REST pour la gestion des scans et des logs.

## Composants/clés/fonctions/exportations

### Structures
- **HttpState** — état partagé pour les handlers HTTP :
  - `db` : `Arc<Mutex<Connection>>` — connexion SQLite
  - `emitter` : callback pour émettre les events de scan
  - `log_emitter` : callback pour émettre les events de log
  - `log_dir` : dossier de stockage des logs
- **ScanRequest** — corps de la requête POST `/scan` : `{ contenu, date_heure? }`
- **ScansQuery** — paramètres de requête GET `/scans` : `{ page?, taille?, recherche? }`
- **LogRequest** — corps de la requête POST `/debug/log` : `{ source, niveau?, message, date_heure?, envoyer_a_tous? }`
- **LogsQuery** — paramètres de requête GET `/debug/logs` : `{ limit?, niveau? }`

### Handlers HTTP
- **post_scan** — POST `/scan` — insère un scan, émet l'event Tauri
- **get_scans** — GET `/scans` — liste les scans avec pagination
- **delete_scan** — DELETE `/scan/{id}` — supprime un scan par ID
- **delete_scans_tout** — DELETE `/scans/all` — supprime tous les scans
- **delete_scans_aujourd_hui** — DELETE `/scans/today` — supprime les scans du jour
- **delete_scans_precedents** — DELETE `/scans/previous` — supprime les scans des jours précédents
- **health** — GET `/health` — health check avec stats
- **post_log** — POST `/debug/log` — reçoit un log de la tablette
- **get_logs** — GET `/debug/logs` — liste les logs
- **delete_logs** — DELETE `/debug/logs` — supprime tous les logs
- **seed** — POST `/seed` — insère des données de test (debug only)

### Fonctions utilitaires
- **ecrire_log_fichier** — écrit un log dans le fichier de la date du jour
- **vider_logs_anciens** — supprime les fichiers logs antérieurs à hier

## Dépendances

- `crate::db` — module de base de données
- `actix_web::{web, HttpResponse}` — framework HTTP
- `chrono::NaiveDate` — manipulation de dates
- `rusqlite::{params, Connection}` — SQLite
- `serde::Deserialize` — désérialisation
- `std::io::Write` — écriture fichier
- `std::sync::{Arc, Mutex}` — synchronisation

## Détails importants

- **Validation** : le contenu du scan ne peut pas être vide.
- **Logs info** : uniquement en temps réel via event Tauri (pas de DB, pas de fichier).
- **Logs error/fatal** : écrits en DB + fichier + event Tauri.
- **Logs warn/debug** : uniquement via event Tauri.
- **Health check** : inclut le nombre total de scans, les scans du jour, et la mémoire (Linux/Mac).
- **Seed** : génère 20 scans de test sur les 5 derniers jours avec des noms français.
- **Fichiers logs** : nommés `logs-YYYY-MM-DD.log`, stockés dans le dossier configuré.
- **Anti-injection SQL** : la fonction `echapper_like` dans db.rs protège contre les caractères spéciaux LIKE.
