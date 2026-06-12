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
    server_handle: Arc<Mutex<Option<actix_web::dev::ServerHandle>>>,
    config_port: Arc<Mutex<u16>>,
    api_key: Arc<Mutex<String>>,
}

// Generer ou charger la cle API
fn get_or_create_api_key() -> String {
    let config_path = dirs::config_dir()
        .unwrap_or_default()
        .join("appcollege")
        .join("api_key");
    
    if config_path.exists() {
        std::fs::read_to_string(&config_path)
            .unwrap_or_default()
            .trim()
            .to_string()
    } else {
        use std::time::{SystemTime, UNIX_EPOCH};
        let seed = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let key = format!("{:064x}", seed);
        
        let _ = std::fs::create_dir_all(config_path.parent().unwrap());
        let _ = std::fs::write(&config_path, &key);
        
        key
    }
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

#[tauri::command]
fn obtenir_port_serveur(state: State<'_, AppState>) -> Result<u16, String> {
    let port = state.config_port.lock().map_err(|e| e.to_string())?;
    Ok(*port)
}

#[tauri::command]
fn obtenir_cle_api(state: State<'_, AppState>) -> Result<String, String> {
    let key = state.api_key.lock().map_err(|e| e.to_string())?;
    Ok(key.clone())
}

#[tauri::command]
fn changer_port_serveur(port: u16, state: State<'_, AppState>) -> Result<(), String> {
    let mut config_port = state.config_port.lock().map_err(|e| e.to_string())?;
    *config_port = port;
    // Sauvegarder dans un fichier de config
    let config_path = dirs::config_dir()
        .unwrap_or_default()
        .join("appcollege")
        .join("config.json");
    let _ = std::fs::create_dir_all(config_path.parent().unwrap());
    let config = serde_json::json!({ "port": port });
    let _ = std::fs::write(&config_path, serde_json::to_string_pretty(&config).unwrap());
    Ok(())
}

#[tauri::command]
fn relancer_serveur(state: State<'_, AppState>) -> Result<String, String> {
    let handle = state.server_handle.lock().map_err(|e| e.to_string())?;
    let port = state.config_port.lock().map_err(|e| e.to_string())?;
    if let Some(_h) = handle.as_ref() {
        // Note: arreter un serveur actix-web necessite un runtime dédié
        // Pour simplifier, on retourne juste le port actuel
        Ok(format!("Serveur actif sur le port {}", *port))
    } else {
        Ok(format!("Serveur non demarre. Port: {}", *port))
    }
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------

fn main() {
    let db_handle = db::init_db().expect("Erreur ouverture base SQLite");
    let db_http = db_handle.clone();
    let startup = Instant::now();

    // Charger la config (port)
    let config_path = dirs::config_dir()
        .unwrap_or_default()
        .join("appcollege")
        .join("config.json");
    let port: u16 = if let Ok(contenu) = std::fs::read_to_string(&config_path) {
        serde_json::from_str(&contenu)
            .map(|c: serde_json::Value| c["port"].as_u64().unwrap_or(8389) as u16)
            .unwrap_or(8389)
    } else {
        8389
    };

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

    let server_handle = Arc::new(Mutex::new(None));
    let config_port = Arc::new(Mutex::new(port));
    let api_key = Arc::new(Mutex::new(get_or_create_api_key()));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            db: db_handle,
            startup,
            server_handle: server_handle.clone(),
            config_port: config_port.clone(),
            api_key: api_key.clone(),
        })
        .setup(move |app| {
            let app_handle = app.handle().clone();
            let api_key_val = api_key.lock().unwrap().clone();
            let http_state = routes::HttpState {
                db: db_http,
                emitter: build_emitter(app_handle.clone()),
                log_emitter: build_log_emitter(app_handle),
                api_key: api_key_val,
            };

            let server_handle_clone = server_handle.clone();
            let config_port_clone = config_port.clone();

            // Demarrage du serveur HTTP dans un thread dedie
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new().unwrap();
                rt.block_on(async {
                    let data = actix_web::web::Data::new(http_state);
                    let port = *config_port_clone.lock().unwrap();
                    let srv = actix_web::HttpServer::new(move || {
                        let cors = actix_cors::Cors::default()
                            .allowed_origin_fn(|origin, _req| {
                                let origin_str = origin.to_str().unwrap_or("");
                                origin_str.starts_with("http://127.0.0.1")
                                    || origin_str.starts_with("http://localhost")
                                    || origin_str.starts_with("http://192.168.")
                                    || origin_str.starts_with("http://10.")
                                    || origin_str.starts_with("http://172.")
                            })
                            .allowed_methods(vec!["GET", "POST", "DELETE"])
                            .allowed_header(actix_web::http::header::CONTENT_TYPE);
                        let app = actix_web::App::new()
                            .wrap(cors)
                            .app_data(data.clone())
                            .route("/health", actix_web::web::get().to(routes::health))
                            .route("/scan", actix_web::web::post().to(routes::post_scan))
                            .route("/scans", actix_web::web::get().to(routes::get_scans))
                            .route("/scan/{id}", actix_web::web::delete().to(routes::delete_scan))
                            .route("/debug/log", actix_web::web::post().to(routes::post_log))
                            .route("/debug/logs", actix_web::web::get().to(routes::get_logs))
                            .route("/debug/logs", actix_web::web::delete().to(routes::delete_logs));
                        #[cfg(debug_assertions)]
                        let app = app.route("/seed", actix_web::web::post().to(routes::seed));
                        app
                    })
                    .disable_signals()
                    .bind(format!("0.0.0.0:{}", port))
                    .expect(&format!("Impossible de demarrer le serveur sur le port {}", port))
                    .run();

                    // Stocker le handle pour arreter/restart
                    let handle = srv.handle().clone();
                    {
                        let mut h = server_handle_clone.lock().unwrap();
                        *h = Some(handle);
                    }

                    srv.await.expect("Erreur serveur HTTP");
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
            forcer_focus,
            obtenir_port_serveur,
            obtenir_cle_api,
            changer_port_serveur,
            relancer_serveur
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors de l'execution du moteur d'application Tauri");
}
