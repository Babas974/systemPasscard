#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use app_lib::{db, routes};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Emitter, State};

type DbState = Arc<Mutex<rusqlite::Connection>>;

struct AppState {
    db: DbState,
    #[allow(dead_code)]
    startup: Instant,
}

// -------------------------------------------------------------------------
// Commandes Tauri (appelees depuis React)
// -------------------------------------------------------------------------

#[tauri::command]
fn lister_scans(state: State<'_, AppState>) -> Result<Vec<db::Scan>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::lister_scans(&conn, 500).map_err(|e| e.to_string())
}

#[tauri::command]
fn lister_scans_pagines(
    page: u32,
    taille: u32,
    recherche: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<db::Scan>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::lister_scans_pagines(&conn, page, taille, recherche.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
fn compter_aujourd_hui(state: State<'_, AppState>) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::compter_par_date(&conn, &db::date_du_jour()).map_err(|e| e.to_string())
}

#[tauri::command]
fn compter_total(state: State<'_, AppState>) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::compter_total(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn compter_scans_filtres(
    recherche: Option<String>,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::compter_avec_filtre(&conn, recherche.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
fn compter_avec_predicat(predicat: String, state: State<'_, AppState>) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let result: Result<i64, rusqlite::Error> = match predicat.as_str() {
        "aujourd-hui" => db::compter_par_date(&conn, &db::date_du_jour()),
        "jours-precedents" => {
            let ajd = db::compter_par_date(&conn, &db::date_du_jour()).unwrap_or(0);
            let tot = db::compter_total(&conn).unwrap_or(0);
            Ok(tot - ajd)
        }
        "tout" => db::compter_total(&conn),
        other => return Err(format!("Predicat inconnu: {}", other)),
    };
    result.map_err(|e| e.to_string())
}

#[tauri::command]
fn obtenir_statistiques(state: State<'_, AppState>) -> Result<db::Statistiques, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::obtenir_statistiques(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn exporter_csv(chemin: String, state: State<'_, AppState>) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let contenu = db::generer_csv(&conn).map_err(|e| e.to_string())?;
    std::fs::write(&chemin, contenu).map_err(|e| format!("Ecriture CSV echouee: {}", e))?;
    Ok(chemin)
}

#[tauri::command]
fn supprimer_scan(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::supprimer_par_id(&conn, id).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn supprimer_tout(state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::supprimer_tout(&conn).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn supprimer_aujourd_hui(state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::supprimer_par_date(&conn, &db::date_du_jour()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn supprimer_precedents(state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::supprimer_hors_date(&conn, &db::date_du_jour()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn forcer_focus(window: tauri::Window) -> Result<(), String> {
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------

fn main() {
    let db_handle = db::init_db().expect("Erreur ouverture base SQLite");
    let db_http = db_handle.clone();
    let startup = Instant::now();

    // Branchement de l'emitter Tauri sur le callback HTTP partage
    fn build_emitter(app: AppHandle) -> db::ScanEmitter {
        Arc::new(move |id, contenu, date_heure| {
            let payload = serde_json::json!({
                "id": id,
                "contenu": contenu,
                "date_heure": date_heure
            });
            let _ = app.emit("nouveau-scan", payload);
        })
    }

    fn build_log_emitter(app: AppHandle) -> db::LogEmitter {
        Arc::new(move |id, source, niveau, message, date_heure| {
            let payload = serde_json::json!({
                "id": id,
                "source": source,
                "niveau": niveau,
                "message": message,
                "date_heure": date_heure
            });
            let _ = app.emit("nouveau-log", payload);
        })
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            db: db_handle,
            startup,
        })
        .setup(move |app| {
            let app_handle = app.handle().clone();
            let http_state = routes::HttpState {
                db: db_http,
                emitter: build_emitter(app_handle.clone()),
                log_emitter: build_log_emitter(app_handle),
            };

            // Demarrage du serveur HTTP dans un thread dedie
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new().unwrap();
                rt.block_on(async {
                    let data = actix_web::web::Data::new(http_state);
                    actix_web::HttpServer::new(move || {
                        let cors = actix_cors::Cors::permissive();
                        actix_web::App::new()
                            .wrap(cors)
                            .app_data(data.clone())
                            .route("/health", actix_web::web::get().to(routes::health))
                            .route("/scan", actix_web::web::post().to(routes::post_scan))
                            .route("/scans", actix_web::web::get().to(routes::get_scans))
                            .route("/scan/{id}", actix_web::web::delete().to(routes::delete_scan))
                            .route("/seed", actix_web::web::post().to(routes::seed))
                            .route("/debug/log", actix_web::web::post().to(routes::post_log))
                            .route("/debug/logs", actix_web::web::get().to(routes::get_logs))
                            .route("/debug/logs", actix_web::web::delete().to(routes::delete_logs))
                    })
                    .bind("0.0.0.0:8389")
                    .expect("Impossible de demarrer le serveur sur le port 8389")
                    .run()
                    .await
                    .expect("Erreur serveur HTTP");
                });
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            lister_scans,
            lister_scans_pagines,
            compter_aujourd_hui,
            compter_total,
            compter_scans_filtres,
            compter_avec_predicat,
            obtenir_statistiques,
            exporter_csv,
            supprimer_scan,
            supprimer_tout,
            supprimer_aujourd_hui,
            supprimer_precedents,
            forcer_focus
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors de l'execution du moteur d'application Tauri");
}
