// db.rs
// Logique de base de donnees SQLite (utilisee par main.rs et bin/server.rs)

use chrono::Local;
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

fn echapper_like(pattern: &str) -> String {
    let mut out = String::with_capacity(pattern.len());
    for c in pattern.chars() {
        match c {
            '\\' | '%' | '_' => {
                out.push('\\');
                out.push(c);
            }
            _ => out.push(c),
        }
    }
    out
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Scan {
    pub id: i64,
    pub contenu: String,
    pub date_heure: String,
}

pub fn init_db() -> Result<Arc<Mutex<Connection>>, rusqlite::Error> {
    let conn = Connection::open("scans.db")?;
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contenu TEXT NOT NULL,
            date_heure TEXT NOT NULL
         );
         CREATE INDEX IF NOT EXISTS idx_scans_date ON scans(date_heure DESC);
         CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            niveau TEXT NOT NULL,
            message TEXT NOT NULL,
            date_heure TEXT NOT NULL
         );
         CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(date_heure DESC);
         CREATE INDEX IF NOT EXISTS idx_logs_niveau ON logs(niveau);",
    )?;
    Ok(Arc::new(Mutex::new(conn)))
}

pub fn init_db_at(path: &str) -> Result<Connection, rusqlite::Error> {
    let conn = Connection::open(path)?;
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contenu TEXT NOT NULL,
            date_heure TEXT NOT NULL
         );
         CREATE INDEX IF NOT EXISTS idx_scans_date ON scans(date_heure DESC);
         CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            niveau TEXT NOT NULL,
            message TEXT NOT NULL,
            date_heure TEXT NOT NULL
         );
         CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(date_heure DESC);
         CREATE INDEX IF NOT EXISTS idx_logs_niveau ON logs(niveau);",
    )?;
    Ok(conn)
}

pub fn inserer_scan(conn: &Connection, contenu: &str, date_heure: &str) -> rusqlite::Result<i64> {
    conn.execute(
        "INSERT INTO scans (contenu, date_heure) VALUES (?1, ?2)",
        params![contenu, date_heure],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn compter_par_date(conn: &Connection, date_prefix: &str) -> rusqlite::Result<i64> {
    let pattern = format!("{}%", date_prefix);
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM scans WHERE date_heure LIKE ?1",
        params![pattern],
        |row| row.get(0),
    )?;
    Ok(count)
}

pub fn compter_total(conn: &Connection) -> rusqlite::Result<i64> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM scans", [], |row| row.get(0))?;
    Ok(count)
}

pub fn supprimer_par_id(conn: &Connection, id: i64) -> rusqlite::Result<usize> {
    let n = conn.execute("DELETE FROM scans WHERE id = ?1", params![id])?;
    Ok(n)
}

pub fn supprimer_par_date(conn: &Connection, date_prefix: &str) -> rusqlite::Result<usize> {
    let pattern = format!("{}%", date_prefix);
    let n = conn.execute(
        "DELETE FROM scans WHERE date_heure LIKE ?1",
        params![pattern],
    )?;
    Ok(n)
}

pub fn supprimer_hors_date(conn: &Connection, date_prefix: &str) -> rusqlite::Result<usize> {
    let pattern = format!("{}%", date_prefix);
    let n = conn.execute(
        "DELETE FROM scans WHERE date_heure NOT LIKE ?1",
        params![pattern],
    )?;
    Ok(n)
}

pub fn supprimer_tout(conn: &Connection) -> rusqlite::Result<usize> {
    let n = conn.execute("DELETE FROM scans", [])?;
    Ok(n)
}

pub fn lister_scans(conn: &Connection, limit: i64) -> rusqlite::Result<Vec<Scan>> {
    let mut stmt =
        conn.prepare("SELECT id, contenu, date_heure FROM scans ORDER BY id DESC LIMIT ?1")?;
    let scans = stmt
        .query_map(params![limit], |row| {
            Ok(Scan {
                id: row.get(0)?,
                contenu: row.get(1)?,
                date_heure: row.get(2)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(scans)
}

pub fn lister_scans_pagines(
    conn: &Connection,
    page: u32,
    taille: u32,
    recherche: Option<&str>,
) -> rusqlite::Result<Vec<Scan>> {
    let taille = taille.clamp(1, 500) as i64;
    let page = page.max(1);
    let offset = ((page - 1) as i64) * taille;

    let motif = recherche.map(str::trim).filter(|s| !s.is_empty());

    let mapper = |row: &rusqlite::Row| -> rusqlite::Result<Scan> {
        Ok(Scan {
            id: row.get(0)?,
            contenu: row.get(1)?,
            date_heure: row.get(2)?,
        })
    };

    let scans: Vec<Scan> = match motif {
        Some(m) => {
            let motif_like = format!("%{}%", echapper_like(m));
            let mut stmt = conn.prepare(
                "SELECT id, contenu, date_heure FROM scans
                 WHERE contenu LIKE ?1 ESCAPE '\\' OR date_heure LIKE ?2 ESCAPE '\\'
                 ORDER BY id DESC LIMIT ?3 OFFSET ?4",
            )?;
            let resultat: Vec<Scan> = stmt
                .query_map(params![motif_like, motif_like, taille, offset], mapper)?
                .filter_map(|r| r.ok())
                .collect();
            resultat
        }
        None => {
            let mut stmt = conn.prepare(
                "SELECT id, contenu, date_heure FROM scans
                 ORDER BY id DESC LIMIT ?1 OFFSET ?2",
            )?;
            let resultat: Vec<Scan> = stmt
                .query_map(params![taille, offset], mapper)?
                .filter_map(|r| r.ok())
                .collect();
            resultat
        }
    };

    Ok(scans)
}

pub fn compter_avec_filtre(
    conn: &Connection,
    recherche: Option<&str>,
) -> rusqlite::Result<i64> {
    match recherche.map(str::trim).filter(|s| !s.is_empty()) {
        Some(m) => {
            let motif_like = format!("%{}%", echapper_like(m));
            let n: i64 = conn.query_row(
                "SELECT COUNT(*) FROM scans
                 WHERE contenu LIKE ?1 ESCAPE '\\' OR date_heure LIKE ?2 ESCAPE '\\'",
                params![motif_like, motif_like],
                |row| row.get(0),
            )?;
            Ok(n)
        }
        None => compter_total(conn),
    }
}

#[derive(Serialize, Clone, Debug)]
pub struct StatsJour {
    pub date: String,
    pub nombre: i64,
}

#[derive(Serialize, Clone, Debug)]
pub struct StatsContenu {
    pub contenu: String,
    pub nombre: i64,
}

#[derive(Serialize, Clone, Debug)]
pub struct Statistiques {
    pub par_jour: Vec<StatsJour>,
    pub top_contenus: Vec<StatsContenu>,
    pub heure_pointe: Option<u32>,
    pub heure_pointe_nombre: i64,
    pub total: i64,
}

pub fn obtenir_statistiques(conn: &Connection) -> rusqlite::Result<Statistiques> {
    let mut par_jour = Vec::with_capacity(7);
    for i in (0..7).rev() {
        let date = (Local::now() - chrono::Duration::days(i))
            .format("%Y-%m-%d")
            .to_string();
        let pattern = format!("{}%", date);
        let n: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM scans WHERE date_heure LIKE ?1",
                params![pattern],
                |row| row.get(0),
            )
            .unwrap_or(0);
        par_jour.push(StatsJour { date, nombre: n });
    }

    let mut top_contenus = Vec::with_capacity(10);
    let mut stmt = conn.prepare(
        "SELECT contenu, COUNT(*) AS n FROM scans
         GROUP BY contenu ORDER BY n DESC LIMIT 10",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(StatsContenu {
            contenu: row.get(0)?,
            nombre: row.get(1)?,
        })
    })?;
    for r in rows {
        if let Ok(c) = r {
            top_contenus.push(c);
        }
    }

    let mut stmt = conn.prepare(
        "SELECT substr(date_heure, 12, 2) AS h, COUNT(*) AS n FROM scans
         GROUP BY h ORDER BY n DESC LIMIT 1",
    )?;
    let peak = stmt
        .query_row([], |row| {
            let h: String = row.get(0)?;
            let n: i64 = row.get(1)?;
            Ok((h, n))
        })
        .ok();

    let total: i64 = conn.query_row("SELECT COUNT(*) FROM scans", [], |row| row.get(0))?;

    Ok(Statistiques {
        par_jour,
        top_contenus,
        heure_pointe: peak.as_ref().and_then(|(h, _)| h.parse::<u32>().ok()),
        heure_pointe_nombre: peak.map(|(_, n)| n).unwrap_or(0),
        total,
    })
}

pub fn generer_csv(conn: &Connection) -> rusqlite::Result<String> {
    let mut stmt =
        conn.prepare("SELECT id, contenu, date_heure FROM scans ORDER BY id ASC")?;
    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
        ))
    })?;

    let mut contenu = String::from("id,contenu,date_heure\n");
    for r in rows {
        if let Ok((id, c, dh)) = r {
            let echap_contenu = if c.contains(',') || c.contains('"') || c.contains('\n') {
                format!("\"{}\"", c.replace('"', "\"\""))
            } else {
                c
            };
            let echap_date = if dh.contains(',') {
                format!("\"{}\"", dh)
            } else {
                dh
            };
            contenu.push_str(&format!("{},{},{}\n", id, echap_contenu, echap_date));
        }
    }
    Ok(contenu)
}

pub fn date_du_jour() -> String {
    Local::now().format("%Y-%m-%d").to_string()
}

pub fn date_heure_maintenant() -> String {
    Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

pub fn date_heure_maintenant_ms() -> String {
    Local::now().format("%Y-%m-%d %H:%M:%S%.3f").to_string()
}

#[derive(Serialize, Clone, Debug)]
pub struct LogEntry {
    pub id: i64,
    pub source: String,
    pub niveau: String,
    pub message: String,
    pub date_heure: String,
}

pub fn inserer_log(
    conn: &Connection,
    source: &str,
    niveau: &str,
    message: &str,
    date_heure: &str,
) -> rusqlite::Result<i64> {
    conn.execute(
        "INSERT INTO logs (source, niveau, message, date_heure) VALUES (?1, ?2, ?3, ?4)",
        params![source, niveau, message, date_heure],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn lister_logs(conn: &Connection, limit: i64) -> rusqlite::Result<Vec<LogEntry>> {
    let mut stmt = conn.prepare(
        "SELECT id, source, niveau, message, date_heure FROM logs
         ORDER BY id DESC LIMIT ?1",
    )?;
    let logs = stmt
        .query_map(params![limit], |row| {
            Ok(LogEntry {
                id: row.get(0)?,
                source: row.get(1)?,
                niveau: row.get(2)?,
                message: row.get(3)?,
                date_heure: row.get(4)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(logs)
}

pub fn compter_logs(conn: &Connection) -> rusqlite::Result<i64> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM logs", [], |row| row.get(0))?;
    Ok(count)
}

pub fn supprimer_tous_logs(conn: &Connection) -> rusqlite::Result<usize> {
    let n = conn.execute("DELETE FROM logs", [])?;
    Ok(n)
}

pub fn supprimer_logs_anciens(conn: &Connection, garder: i64) -> rusqlite::Result<usize> {
    let n = conn.execute(
        "DELETE FROM logs WHERE id NOT IN (
            SELECT id FROM logs ORDER BY id DESC LIMIT ?1
         )",
        params![garder],
    )?;
    Ok(n)
}

// Callback emis apres chaque insertion. Le binaire Tauri y branche
// l'emission d'events Tauri, le serveur headless utilise un no-op.
pub type ScanEmitter = Arc<dyn Fn(i64, &str, &str) + Send + Sync>;

pub fn noop_emitter() -> ScanEmitter {
    Arc::new(|_, _, _| {})
}

pub type LogEmitter = Arc<dyn Fn(i64, &str, &str, &str, &str) + Send + Sync>;

pub fn noop_log_emitter() -> LogEmitter {
    Arc::new(|_, _, _, _, _| {})
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn temp_db() -> Connection {
        let path = env::temp_dir().join(format!(
            "scans_test_{}_{}.db",
            std::process::id(),
            chrono::Local::now().timestamp_nanos_opt().unwrap_or(0)
        ));
        let _ = std::fs::remove_file(&path);
        init_db_at(path.to_str().unwrap()).unwrap()
    }

    #[test]
    fn test_insertion_scan() {
        let conn = temp_db();
        let id = inserer_scan(&conn, "DUPONT Jean", "2026-06-04 10:00:00").unwrap();
        assert!(id > 0, "l'ID devrait etre superieur a 0");

        let scans = lister_scans(&conn, 10).unwrap();
        assert_eq!(scans.len(), 1);
        assert_eq!(scans[0].contenu, "DUPONT Jean");
        assert_eq!(scans[0].date_heure, "2026-06-04 10:00:00");
    }

    #[test]
    fn test_insertion_plusieurs_scans() {
        let conn = temp_db();
        let id1 = inserer_scan(&conn, "A", "2026-06-04 10:00:00").unwrap();
        let id2 = inserer_scan(&conn, "B", "2026-06-04 11:00:00").unwrap();
        assert!(id2 > id1, "les ID devraient etre croissants");

        let total = compter_total(&conn).unwrap();
        assert_eq!(total, 2);
    }

    #[test]
    fn test_comptage_par_jour() {
        let conn = temp_db();
        inserer_scan(&conn, "A", "2026-06-04 10:00:00").unwrap();
        inserer_scan(&conn, "B", "2026-06-04 11:00:00").unwrap();
        inserer_scan(&conn, "C", "2026-06-04 12:00:00").unwrap();
        inserer_scan(&conn, "D", "2026-06-03 11:00:00").unwrap();
        inserer_scan(&conn, "E", "2026-06-02 11:00:00").unwrap();

        let count_4 = compter_par_date(&conn, "2026-06-04").unwrap();
        let count_3 = compter_par_date(&conn, "2026-06-03").unwrap();
        let count_2 = compter_par_date(&conn, "2026-06-02").unwrap();
        let count_1 = compter_par_date(&conn, "2026-06-01").unwrap();

        assert_eq!(count_4, 3, "le 04 juin doit avoir 3 scans");
        assert_eq!(count_3, 1, "le 03 juin doit avoir 1 scan");
        assert_eq!(count_2, 1, "le 02 juin doit avoir 1 scan");
        assert_eq!(count_1, 0, "le 01 juin doit avoir 0 scan");
    }

    #[test]
    fn test_suppression_par_id() {
        let conn = temp_db();
        let id1 = inserer_scan(&conn, "A", "2026-06-04 10:00:00").unwrap();
        let id2 = inserer_scan(&conn, "B", "2026-06-04 11:00:00").unwrap();

        let n = supprimer_par_id(&conn, id1).unwrap();
        assert_eq!(n, 1, "doit avoir supprime 1 ligne");

        let total = compter_total(&conn).unwrap();
        assert_eq!(total, 1, "il doit rester 1 scan");

        let scans = lister_scans(&conn, 10).unwrap();
        assert_eq!(scans[0].id, id2, "le scan restant doit etre le B");
    }

    #[test]
    fn test_suppression_inexistante() {
        let conn = temp_db();
        inserer_scan(&conn, "A", "2026-06-04 10:00:00").unwrap();
        let n = supprimer_par_id(&conn, 99999).unwrap();
        assert_eq!(n, 0, "aucune ligne ne doit etre supprimee");
    }

    #[test]
    fn test_formatage_date_maintenant() {
        let date = date_heure_maintenant();
        assert_eq!(date.len(), 19, "format YYYY-MM-DD HH:MM:SS -> 19 caracteres");

        let parts: Vec<&str> = date.split(' ').collect();
        assert_eq!(parts.len(), 2, "doit contenir une date et une heure separees par un espace");

        let date_parts: Vec<&str> = parts[0].split('-').collect();
        assert_eq!(date_parts.len(), 3, "la date doit avoir 3 parties (Y-M-D)");
        for p in &date_parts {
            assert!(p.parse::<u32>().is_ok(), "chaque partie de date doit etre un nombre");
        }

        let time_parts: Vec<&str> = parts[1].split(':').collect();
        assert_eq!(time_parts.len(), 3, "l'heure doit avoir 3 parties (H:M:S)");
        for p in &time_parts {
            assert!(p.parse::<u32>().is_ok(), "chaque partie d'heure doit etre un nombre");
        }
    }

    #[test]
    fn test_formatage_date_jour() {
        let ajd = date_du_jour();
        assert_eq!(ajd.len(), 10, "format YYYY-MM-DD -> 10 caracteres");
        let parts: Vec<&str> = ajd.split('-').collect();
        assert_eq!(parts.len(), 3);
        let annee: u32 = parts[0].parse().unwrap();
        assert!(annee >= 2024, "l'annee doit etre raisonnable");
    }

    #[test]
    fn test_suppression_par_date_et_hors_date() {
        let conn = temp_db();
        inserer_scan(&conn, "A", "2026-06-04 10:00:00").unwrap();
        inserer_scan(&conn, "B", "2026-06-03 10:00:00").unwrap();
        inserer_scan(&conn, "C", "2026-06-02 10:00:00").unwrap();

        let n = supprimer_par_date(&conn, "2026-06-04").unwrap();
        assert_eq!(n, 1);
        assert_eq!(compter_total(&conn).unwrap(), 2);

        let n = supprimer_hors_date(&conn, "2026-06-03").unwrap();
        assert_eq!(n, 1, "doit supprimer le 02 juin");
        assert_eq!(compter_total(&conn).unwrap(), 1);
    }

    #[test]
    fn test_supprimer_tout() {
        let conn = temp_db();
        inserer_scan(&conn, "A", "2026-06-04 10:00:00").unwrap();
        inserer_scan(&conn, "B", "2026-06-04 11:00:00").unwrap();
        let n = supprimer_tout(&conn).unwrap();
        assert_eq!(n, 2);
        assert_eq!(compter_total(&conn).unwrap(), 0);
    }
}
