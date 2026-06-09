// routes.rs
// Handlers HTTP partages entre le binaire Tauri (main.rs) et le serveur headless (bin/server.rs)

use crate::db;
use actix_web::{web, HttpResponse};
use rusqlite::{params, Connection};
use serde::Deserialize;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct HttpState {
    pub db: Arc<Mutex<Connection>>,
    pub emitter: db::ScanEmitter,
    pub log_emitter: db::LogEmitter,
}

#[derive(Deserialize)]
pub struct ScanRequest {
    pub contenu: String,
}

pub async fn post_scan(
    data: web::Data<HttpState>,
    body: web::Json<ScanRequest>,
) -> HttpResponse {
    let contenu = body.contenu.trim().to_string();
    if contenu.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "erreur": "Le contenu est vide"
        }));
    }

    let date_heure = db::date_heure_maintenant();

    let inserted_id = match data.db.lock() {
        Ok(conn) => match db::inserer_scan(&conn, &contenu, &date_heure) {
            Ok(id) => Some(id),
            Err(e) => {
                return HttpResponse::InternalServerError().json(serde_json::json!({
                    "erreur": e.to_string()
                }));
            }
        },
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "erreur": e.to_string()
            }));
        }
    };

    if let Some(id) = inserted_id {
        (data.emitter)(id, &contenu, &date_heure);
    }

    HttpResponse::Ok().json(serde_json::json!({
        "statut": "ok",
        "message": format!("Scan enregistre: {}", contenu)
    }))
}

#[derive(Deserialize)]
pub struct ScansQuery {
    pub page: Option<u32>,
    pub taille: Option<u32>,
    pub recherche: Option<String>,
}

pub async fn get_scans(
    data: web::Data<HttpState>,
    query: web::Query<ScansQuery>,
) -> HttpResponse {
    let page = query.page.unwrap_or(1).max(1);
    let taille = query.taille.unwrap_or(500).clamp(1, 5000);
    let recherche = query.recherche.as_deref();

    match data.db.lock() {
        Ok(conn) => match db::lister_scans_pagines(&conn, page, taille, recherche) {
            Ok(scans) => {
                let json_scans: Vec<serde_json::Value> = scans
                    .into_iter()
                    .map(|s| {
                        serde_json::json!({
                            "id": s.id,
                            "contenu": s.contenu,
                            "date_heure": s.date_heure
                        })
                    })
                    .collect();
                HttpResponse::Ok().json(json_scans)
            }
            Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                "erreur": e.to_string()
            })),
        },
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "erreur": e.to_string()
        })),
    }
}

pub async fn delete_scan(
    data: web::Data<HttpState>,
    path: web::Path<i64>,
) -> HttpResponse {
    let id = path.into_inner();
    match data.db.lock() {
        Ok(conn) => match db::supprimer_par_id(&conn, id) {
            Ok(_) => HttpResponse::Ok().json(serde_json::json!({"statut": "ok"})),
            Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                "erreur": e.to_string()
            })),
        },
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "erreur": e.to_string()
        })),
    }
}

pub async fn health(data: web::Data<HttpState>) -> HttpResponse {
    let total: i64 = data
        .db
        .lock()
        .ok()
        .and_then(|conn| conn.query_row("SELECT COUNT(*) FROM scans", [], |r| r.get(0)).ok())
        .unwrap_or(0);

    let ajd = db::date_du_jour();
    let pattern = format!("{}%", ajd);
    let nb_ajd: i64 = data
        .db
        .lock()
        .ok()
        .and_then(|conn| {
            conn.query_row(
                "SELECT COUNT(*) FROM scans WHERE date_heure LIKE ?1",
                params![pattern],
                |r| r.get(0),
            )
            .ok()
        })
        .unwrap_or(0);

    // Memoire du processus courant (RSS en Ko) sur Linux/macOS.
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    let memoire_ko: Option<u64> = std::fs::read_to_string("/proc/self/statm")
        .ok()
        .and_then(|s| s.split_whitespace().nth(1)?.parse::<u64>().ok())
        .map(|pages| pages * 4096 / 1024);
    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    let memoire_ko: Option<u64> = None;

    HttpResponse::Ok().json(serde_json::json!({
        "statut": "ok",
        "service": "pont-saisie-server",
        "version": env!("CARGO_PKG_VERSION"),
        "scans": {
            "total": total,
            "aujourd_hui": nb_ajd
        },
        "memoire_ko": memoire_ko
    }))
}

#[derive(Deserialize)]
pub struct LogRequest {
    pub source: String,
    pub niveau: Option<String>,
    pub message: String,
    pub envoyer_a_tous: Option<bool>,
}

pub async fn post_log(
    data: web::Data<HttpState>,
    body: web::Json<LogRequest>,
) -> HttpResponse {
    let source = body.source.trim();
    let message = body.message.trim();
    if source.is_empty() || message.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "erreur": "source et message sont requis"
        }));
    }
    let niveau = body
        .niveau
        .as_deref()
        .unwrap_or("info")
        .to_lowercase();
    let date_heure = db::date_heure_maintenant_ms();

    let inserted_id = match data.db.lock() {
        Ok(conn) => match db::inserer_log(&conn, source, &niveau, message, &date_heure) {
            Ok(id) => Some(id),
            Err(e) => {
                return HttpResponse::InternalServerError().json(serde_json::json!({
                    "erreur": e.to_string()
                }));
            }
        },
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "erreur": e.to_string()
            }));
        }
    };

    if let Some(id) = inserted_id {
        (data.log_emitter)(id, source, &niveau, message, &date_heure);
    }

    HttpResponse::Ok().json(serde_json::json!({
        "statut": "ok",
        "id": inserted_id.unwrap_or(0)
    }))
}

#[derive(Deserialize)]
pub struct LogsQuery {
    pub limit: Option<i64>,
    pub niveau: Option<String>,
}

pub async fn get_logs(
    data: web::Data<HttpState>,
    query: web::Query<LogsQuery>,
) -> HttpResponse {
    let limit = query.limit.unwrap_or(200).clamp(1, 5000);
    let niveau = query.niveau.as_deref();

    match data.db.lock() {
        Ok(conn) => {
            let logs = if let Some(n) = niveau {
                let stmt = conn.prepare(
                    "SELECT id, source, niveau, message, date_heure FROM logs WHERE niveau = ?1 ORDER BY id DESC LIMIT ?2",
                );
                match stmt {
                    Ok(mut s) => {
                        let result: Vec<db::LogEntry> = s
                            .query_map(params![n, limit], |row| {
                                Ok(db::LogEntry {
                                    id: row.get(0)?,
                                    source: row.get(1)?,
                                    niveau: row.get(2)?,
                                    message: row.get(3)?,
                                    date_heure: row.get(4)?,
                                })
                            })
                            .ok()
                            .map(|rows| rows.filter_map(|r| r.ok()).collect())
                            .unwrap_or_default();
                        result
                    }
                    Err(_) => Vec::new(),
                }
            } else {
                db::lister_logs(&conn, limit).unwrap_or_default()
            };

            let total: i64 = db::compter_logs(&conn).unwrap_or(0);

            HttpResponse::Ok().json(serde_json::json!({
                "logs": logs,
                "total": total
            }))
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "erreur": e.to_string()
        })),
    }
}

pub async fn delete_logs(data: web::Data<HttpState>) -> HttpResponse {
    match data.db.lock() {
        Ok(conn) => match db::supprimer_tous_logs(&conn) {
            Ok(n) => HttpResponse::Ok().json(serde_json::json!({
                "statut": "ok",
                "supprimes": n
            })),
            Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                "erreur": e.to_string()
            })),
        },
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "erreur": e.to_string()
        })),
    }
}

pub async fn seed(data: web::Data<HttpState>) -> HttpResponse {
    let prenoms = [
        "Lea", "Lucas", "Hugo", "Emma", "Manon", "Theo", "Chloe", "Nathan", "Camille", "Julien",
    ];
    let noms = [
        "MARTIN", "BERNARD", "DUBOIS", "THOMAS", "ROBERT", "PETIT", "DURAND", "LEROY", "MOREAU",
        "SIMON",
    ];
    let motifs = [
        "Mal de tete",
        "Fatigue",
        "Mal de ventre",
        "Petite blessure",
        "Vertiges",
        "Autre",
    ];

    match data.db.lock() {
        Ok(conn) => {
            let mut inserted = 0;
            let now = chrono::Local::now();
            for i in 0..20 {
                let nom = noms[i % noms.len()];
                let prenom = prenoms[(i + 3) % prenoms.len()];
                let motif = motifs[i % motifs.len()];
                let contenu = format!("{} {} - {}", nom, prenom, motif);
                let jours_offset = (i / 4) as i64;
                let date = now - chrono::Duration::days(jours_offset);
                let date_heure = date.format("%Y-%m-%d %H:%M:%S").to_string();
                if db::inserer_scan(&conn, &contenu, &date_heure).is_ok() {
                    inserted += 1;
                }
            }
            HttpResponse::Ok().json(serde_json::json!({
                "statut": "ok",
                "inseres": inserted,
                "message": format!("{} scans de test inseres (sur les 5 derniers jours)", inserted)
            }))
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "erreur": e.to_string()
        })),
    }
}
