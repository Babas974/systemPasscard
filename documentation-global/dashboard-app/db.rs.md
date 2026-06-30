# db.rs

**Chemin du fichier :** `app/src-tauri/src/db.rs`

## Description

Module de gestion de la base de données SQLite. Contient toutes les opérations CRUD pour les scans et les logs, ainsi que les fonctions utilitaires de date et les types partagés.

## Composants/clés/fonctions/exportations

### Types/Structures
- **Scan** — `{ id: i64, contenu: String, date_heure: String }` — structure sérialisable d'un scan
- **StatsJour** — `{ date: String, nombre: i64 }` — statistiques par jour
- **StatsContenu** — `{ contenu: String, nombre: i64 }` — statistiques par contenu
- **Statistiques** — `{ par_jour, top_contenus, heure_pointe, heure_pointe_nombre, total }`
- **LogEntry** — `{ id, source, niveau, message, date_heure }` — structure d'un log
- **ScanEmitter** — `Arc<dyn Fn(i64, &str, &str) + Send + Sync>` — type callback pour émettre les events de scan
- **LogEmitter** — `Arc<dyn Fn(i64, &str, &str, &str, &str) + Send + Sync>` — type callback pour émettre les events de log

### Fonctions d'initialisation
- **init_db()** — initialise la base de données SQLite par défaut (`~/.local/share/appcollege/scans.db`)
- **init_db_at(path)** — initialise la base à un chemin spécifié (pour les tests)

### Fonctions CRUD Scans
- **inserer_scan(conn, contenu, date_heure)** — insère un scan, retourne l'ID
- **compter_par_date(conn, date_prefix)** — compte les scans d'une date
- **compter_total(conn)** — compte le total des scans
- **supprimer_par_id(conn, id)** — supprime un scan par ID
- **supprimer_par_date(conn, date_prefix)** — supprime les scans d'une date
- **supprimer_hors_date(conn, date_prefix)** — supprime les scans hors d'une date
- **supprimer_tout(conn)** — supprime tous les scans
- **lister_scans(conn, limit)** — liste les derniers scans
- **lister_scans_pagines(conn, page, taille, recherche)** — liste avec pagination et recherche
- **compter_avec_filtre(conn, recherche)** — compte avec filtre de recherche

### Fonctions Logs
- **inserer_log(conn, source, niveau, message, date_heure)** — insère un log
- **lister_logs(conn, limit)** — liste les derniers logs
- **compter_logs(conn)** — compte le total des logs
- **supprimer_tous_logs(conn)** — supprime tous les logs
- **supprimer_logs_anciens(conn, garder)** — garde uniquement les N derniers logs
- **supposer_logs_info_debug_anciens(conn, secondes)** — supprime les logs info/debug anciens

### Fonctions utilitaires
- **date_du_jour()** — retourne la date du jour au format YYYY-MM-DD
- **date_heure_maintenant()** — retourne la date/heure au format YYYY-MM-DD HH:MM:SS
- **date_heure_maintenant_ms()** — retourne la date/heure avec millisecondes
- **generer_csv(conn)** — génère le contenu CSV de tous les scans
- **echapper_like(pattern)** — échappe les caractères spéciaux pour les requêtes LIKE

### Callbacks
- **noop_emitter()** — émetteur vide (pour le serveur headless)
- **noop_log_emitter()** — émetteur de logs vide

### Tests
- **temp_db()** — crée une base temporaire pour les tests
- Tests unitaires : insertion, comptage, suppression, formatage de dates

## Dépendances

- `chrono::Local` — heure locale
- `rusqlite::{Connection, params}` — SQLite
- `serde::{Deserialize, Serialize}` — sérialisation
- `std::sync::{Arc, Mutex}` — synchronisation

## Détails importants

- **WAL mode** : la base utilise le mode Write-Ahead Logging pour de meilleures performances.
- **Index** : index sur `date_heure` (DESC) pour les scans et les logs, et sur `niveau` pour les logs.
- **Recherche sécurisée** : la fonction `echapper_like` protège contre les注入 SQL dans les requêtes LIKE.
- **Émetteurs** : les callbacks `ScanEmitter` et `LogEmitter` permettent de brancher l'émission d'events Tauri ou un no-op.
- **Tests** : 9 tests unitaires couvrant les opérations de base (insertion, comptage, suppression, formatage).
- **CSV** : échappe correctement les virgules et guillemets dans le contenu.
- **Clé primaire auto-incrémentée** : les IDs sont générés automatiquement par SQLite.
