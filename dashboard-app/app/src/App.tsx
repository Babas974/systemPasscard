import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { save } from "@tauri-apps/plugin-dialog";
import DebugPanel from "./DebugPanel";
import ConfigPanel from "./ConfigPanel";

interface Scan {
  id: number;
  contenu: string;
  date_heure: string;
}

interface StatsJour {
  date: string;
  nombre: number;
}

interface StatsContenu {
  contenu: string;
  nombre: number;
}

interface Statistiques {
  par_jour: StatsJour[];
  top_contenus: StatsContenu[];
  heure_pointe: number | null;
  heure_pointe_nombre: number;
  total: number;
}

type Theme = "sombre" | "clair";
type Niveau = "info" | "data" | "warn" | "error";
type PredicatSuppression = "aujourd-hui" | "jours-precedents" | "tout";
type Toast = { id: number; contenu: string; date: string };

const TAILLE_PAGE = 50;
const CLE_THEME = "theme";

const historiqueLogs: { message: string; niveau: Niveau; timestamp: number }[] = [];
let logsDerniereSeconde = 0;
let timerResetLogs = 0;
let prochaineToastId = 1;

const styles: Record<string, React.CSSProperties> = {
  conteneur: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  enTete: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    borderBottom: "1px solid var(--bordure)",
  },
  titrePrincipal: { fontSize: "18px", fontWeight: 700, margin: 0 },
  sousTitre: { fontSize: "13px", color: "var(--texte-secondaire)", marginTop: 2 },
  compteurs: { display: "flex", gap: "12px", padding: "16px 24px", flexWrap: "wrap" },
  compteur: {
    flex: 1,
    minWidth: 120,
    backgroundColor: "var(--surface)",
    border: "1px solid var(--bordure)",
    borderRadius: "8px",
    padding: "16px",
    textAlign: "center",
  },
  chiffre: { fontSize: "28px", fontWeight: 700, color: "var(--accent)" },
  libelle: { fontSize: "13px", color: "var(--texte-secondaire)", marginTop: 4 },
  actions: { display: "flex", gap: "8px", padding: "0 24px", flexWrap: "wrap", alignItems: "center" },
  btn: {
    padding: "8px 14px",
    border: "1px solid var(--bordure)",
    borderRadius: "6px",
    backgroundColor: "var(--surface)",
    color: "var(--texte)",
    fontSize: "13px",
    cursor: "pointer",
  },
  btnDanger: {
    padding: "8px 14px",
    border: "1px solid var(--bordure-danger)",
    borderRadius: "6px",
    backgroundColor: "var(--surface)",
    color: "var(--danger)",
    fontSize: "13px",
    cursor: "pointer",
  },
  rechercheWrap: { flex: 1, minWidth: 200 },
  recherche: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid var(--bordure)",
    borderRadius: "6px",
    backgroundColor: "var(--surface)",
    color: "var(--texte)",
    fontSize: "13px",
    boxSizing: "border-box",
  },
  table: {
    margin: "16px 24px",
    backgroundColor: "var(--surface)",
    border: "1px solid var(--bordure)",
    borderRadius: "8px",
    overflow: "hidden",
  },
  tableInner: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "10px 14px",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "uppercase",
    color: "var(--texte-secondaire)",
    borderBottom: "1px solid var(--bordure)",
    backgroundColor: "var(--entete-table)",
  },
  td: { padding: "10px 14px", fontSize: "14px", borderBottom: "1px solid var(--bordure)" },
  supprimerBtn: {
    padding: "4px 10px",
    border: "1px solid var(--bordure-danger)",
    borderRadius: "4px",
    backgroundColor: "transparent",
    color: "var(--danger)",
    fontSize: "12px",
    cursor: "pointer",
  },
  pagination: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 24px 16px",
    gap: 8,
  },
  paginationInfo: { fontSize: 12, color: "var(--texte-secondaire)" },
  piedPage: {
    marginTop: "auto",
    borderTop: "1px solid var(--bordure)",
    padding: "16px 24px",
    textAlign: "center",
  },
  texteSecurite: {
    fontSize: "12px",
    color: "var(--texte-secondaire)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin: 0,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  modalContenu: {
    backgroundColor: "var(--surface)",
    border: "1px solid var(--bordure)",
    borderRadius: "8px",
    padding: "24px",
    maxWidth: "420px",
    width: "90%",
  },
  modalTitre: { fontSize: "16px", fontWeight: 600, marginBottom: "8px", color: "var(--texte)" },
  modalSousTitre: { fontSize: 13, color: "var(--texte-secondaire)", marginBottom: 16 },
  optionSuppression: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px",
    border: "1px solid var(--bordure)",
    borderRadius: "6px",
    marginBottom: "8px",
    cursor: "pointer",
    fontSize: "14px",
    color: "var(--texte)",
  },
  optionSuppressionGauche: { display: "flex", alignItems: "center" },
  badge: {
    backgroundColor: "var(--accent-fond)",
    color: "var(--accent)",
    fontSize: 12,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 10,
  },
  boutonsModal: { display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "16px" },
  statsSection: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 12,
    padding: "0 24px 16px",
  },
  statsCarte: {
    backgroundColor: "var(--surface)",
    border: "1px solid var(--bordure)",
    borderRadius: 8,
    padding: 14,
  },
  statsTitre: { fontSize: 13, fontWeight: 600, color: "var(--texte-secondaire)", marginBottom: 10, textTransform: "uppercase" },
  statsBarreLigne: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontSize: 12 },
  statsBarreLabel: { width: 70, color: "var(--texte-secondaire)", flexShrink: 0 },
  statsBarreTrack: { flex: 1, height: 8, backgroundColor: "var(--entete-table)", borderRadius: 4, overflow: "hidden" },
  statsBarreRemplie: { height: "100%", backgroundColor: "var(--accent)", borderRadius: 4 },
  statsBarreValeur: { width: 32, textAlign: "right", color: "var(--texte)" },
  statsLigne: { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", borderBottom: "1px solid var(--bordure)" },
  statsLigneDernier: { borderBottom: "none" },
  statsValeurForte: { fontSize: 22, fontWeight: 700, color: "var(--accent)" },
  toggle: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    border: "1px solid var(--bordure)",
    borderRadius: 6,
    backgroundColor: "var(--surface)",
    color: "var(--texte)",
    fontSize: 13,
    cursor: "pointer",
  },
  toastsWrap: {
    position: "fixed",
    right: 16,
    bottom: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    zIndex: 200,
    pointerEvents: "none",
  },
  toast: {
    backgroundColor: "var(--surface)",
    border: "1px solid var(--bordure)",
    borderLeft: "3px solid var(--accent)",
    borderRadius: 6,
    padding: "10px 14px",
    minWidth: 220,
    maxWidth: 320,
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
    pointerEvents: "auto",
  },
  toastContenu: { fontSize: 13, fontWeight: 600, color: "var(--texte)" },
  toastDate: { fontSize: 11, color: "var(--texte-secondaire)", marginTop: 2 },
  debugBarre: {
    flexShrink: 0,
    backgroundColor: "var(--debug-fond)",
    borderTop: "1px solid var(--bordure)",
    padding: "6px 16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    userSelect: "none",
  },
  debugLabel: { fontSize: "12px", fontWeight: 600, color: "var(--debug-label)", fontFamily: "monospace" },
  debugBadge: {
    backgroundColor: "var(--debug-badge-fond)",
    color: "var(--debug-badge)",
    fontSize: "10px",
    padding: "1px 7px",
    borderRadius: "8px",
  },
  debugPanel: {
    height: 0,
    overflow: "hidden",
    backgroundColor: "var(--debug-fond)",
    transition: "height 0.25s ease",
  },
  debugPanelOuvert: { height: "200px" },
  debugContenu: {
    height: "100%",
    overflowY: "auto",
    padding: "0",
    margin: "0",
    fontFamily: "monospace",
    fontSize: "12px",
    lineHeight: 1.7,
    color: "var(--debug-texte)",
  },
};

const themes: Record<Theme, Record<string, string>> = {
  sombre: {
    "--fond": "#0f172a",
    "--surface": "#1e293b",
    "--entete-table": "#0f172a",
    "--bordure": "#475569",
    "--bordure-danger": "#ef4444",
    "--texte": "#f1f5f9",
    "--texte-secondaire": "#cbd5e1",
    "--accent": "#60a5fa",
    "--accent-fond": "rgba(96,165,250,0.2)",
    "--danger": "#f87171",
    "--debug-fond": "#020617",
    "--debug-label": "#64748b",
    "--debug-badge-fond": "#334155",
    "--debug-badge": "#94a3b8",
    "--debug-texte": "#94a3b8",
  },
  clair: {
    "--fond": "#f8fafc",
    "--surface": "#ffffff",
    "--entete-table": "#f1f5f9",
    "--bordure": "#d1d5db",
    "--bordure-danger": "#dc2626",
    "--texte": "#0f172a",
    "--texte-secondaire": "#475569",
    "--accent": "#2563eb",
    "--accent-fond": "rgba(37,99,235,0.15)",
    "--danger": "#dc2626",
    "--debug-fond": "#f1f5f9",
    "--debug-label": "#334155",
    "--debug-badge-fond": "#cbd5e1",
    "--debug-badge": "#1e293b",
    "--debug-texte": "#1e293b",
  },
};

function appliquerTheme(theme: Theme) {
  const vars = themes[theme];
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.dataset.theme = theme;
}

function log(niveau: Niveau, cat: string, message: string, setLogs: React.Dispatch<React.SetStateAction<string>>) {
  const maintenant = Date.now();
  if (maintenant - timerResetLogs > 1000) { logsDerniereSeconde = 0; timerResetLogs = maintenant; }
  if (logsDerniereSeconde >= 10) return;
  const doublon = historiqueLogs.some(e => e.message === message && (maintenant - e.timestamp) < 2000);
  if (doublon) return;
  historiqueLogs.push({ message, niveau, timestamp: maintenant });
  if (historiqueLogs.length > 50) historiqueLogs.shift();
  logsDerniereSeconde++;
  const now = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  setLogs(prev => prev + `\n[${now}] [${cat}] ${message}`);
}

function formaterDate(dateStr: string) {
  const d = new Date(dateStr.replace(" ", "T"));
  return {
    date: d.toLocaleDateString("fr-FR"),
    heure: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
  };
}

function formaterDateCourte(dateStr: string) {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function App() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [nbAjd, setNbAjd] = useState(0);
  const [nbTotal, setNbTotal] = useState(0);
  const [recherche, setRecherche] = useState("");
  const [rechercheEnvoyee, setRechercheEnvoyee] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalSuppression, setModalSuppression] = useState(false);
  const [selection, setSelection] = useState<PredicatSuppression>("aujourd-hui");
  const [nbAffectes, setNbAffectes] = useState<number | null>(null);
  const [stats, setStats] = useState<Statistiques | null>(null);
  const [debugOuvert, setDebugOuvert] = useState(false);
  const [configOuvert, setConfigOuvert] = useState(false);
  const [logs, setLogs] = useState("");
  const [theme, setTheme] = useState<Theme>(() => {
    const stocke = localStorage.getItem(CLE_THEME);
    return stocke === "clair" || stocke === "sombre" ? stocke : "sombre";
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [permissionNotif, setPermissionNotif] = useState<boolean | null>(null);
  const [debugSecret, setDebugSecret] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);
  const derniersIds = useRef<Set<number>>(new Set());
  const rechercheTimer = useRef<number | null>(null);

  // Application du thème
  useEffect(() => {
    appliquerTheme(theme);
    localStorage.setItem(CLE_THEME, theme);
  }, [theme]);

  // Mode debug secret : 5 taps sur le titre
  const handleTitreTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTime > 1000) {
      setLastTapTime(now);
      return;
    }
    setLastTapTime(now);
    setDebugSecret((d) => !d);
  }, [lastTapTime]);



  // Permission notifications natives
  useEffect(() => {
    (async () => {
      try {
        let granted = await isPermissionGranted();
        if (!granted) {
          const res = await requestPermission();
          granted = res === "granted";
        }
        setPermissionNotif(granted);
        log("info", "notif", `Notifications natives: ${granted ? "OK" : "refusées"}`, setLogs);
      } catch (e) {
        setPermissionNotif(false);
        log("warn", "notif", `Init notif impossible: ${e}`, setLogs);
      }
    })();
  }, []);

  const afficherToast = useCallback((contenu: string, date: string) => {
    const id = prochaineToastId++;
    setToasts(prev => [...prev, { id, contenu, date }]);
    window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const charger = useCallback(async () => {
    try {
      const [s, ca, ct, st] = await Promise.all([
        invoke<Scan[]>("lister_scans_pagines", { page, taille: TAILLE_PAGE, recherche: rechercheEnvoyee || null }),
        invoke<number>("compter_aujourd_hui"),
        invoke<number>("compter_total"),
        invoke<Statistiques>("obtenir_statistiques"),
      ]);
      setScans(s);
      setNbAjd(ca);
      setNbTotal(ct);
      setStats(st);
      const nouveauTotal = rechercheEnvoyee ? s.length : ct;
      const pages = Math.max(1, Math.ceil(nouveauTotal / TAILLE_PAGE));
      setTotalPages(pages);
      // Mémoriser les IDs connus pour détecter les nouveaux scans
      derniersIds.current = new Set(s.map(sc => sc.id));
    } catch (e) {
      log("error", "db", `Erreur chargement: ${e}`, setLogs);
    }
  }, [page, rechercheEnvoyee]);

  // Chargement initial + rechargement périodique
  useEffect(() => {
    charger();
    const interval = setInterval(charger, 5000);
    return () => clearInterval(interval);
  }, [charger]);

  // Écoute des événements Tauri pour les nouveaux scans (notification instantanée)
  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    (async () => {
      try {
        unlisten = await listen<Scan>("nouveau-scan", (event) => {
          const scan = event.payload;
          afficherToast(scan.contenu, scan.date_heure);
          log("info", "event", `Nouveau scan recu via event: ${scan.contenu}`, setLogs);
          if (permissionNotif) {
            try {
              sendNotification({
                title: "Nouveau scan",
                body: `${scan.contenu} — ${scan.date_heure}`,
              });
            } catch (e) {
              log("warn", "notif", `Envoi notif native échoué: ${e}`, setLogs);
            }
          }
          charger();
        });
      } catch (e) {
        log("warn", "event", `listen('nouveau-scan') impossible: ${e}`, setLogs);
      }
    })();
    return () => { if (unlisten) unlisten(); };
  }, [afficherToast, charger, permissionNotif]);

  // Debounce de la recherche
  useEffect(() => {
    if (rechercheTimer.current !== null) {
      window.clearTimeout(rechercheTimer.current);
    }
    rechercheTimer.current = window.setTimeout(() => {
      setPage(1);
      setRechercheEnvoyee(recherche.trim());
    }, 250);
    return () => {
      if (rechercheTimer.current !== null) window.clearTimeout(rechercheTimer.current);
    };
  }, [recherche]);

  // Comptage des scans affectés quand la sélection change
  useEffect(() => {
    if (!modalSuppression) {
      setNbAffectes(null);
      return;
    }
    (async () => {
      try {
        const n = await invoke<number>("compter_avec_predicat", { predicat: selection });
        setNbAffectes(n);
      } catch (e) {
        log("error", "db", `Erreur comptage: ${e}`, setLogs);
        setNbAffectes(null);
      }
    })();
  }, [selection, modalSuppression]);

  const supprimerUn = async (id: number) => {
    try {
      await invoke("supprimer_scan", { id });
      log("info", "db", `Scan #${id} supprime`, setLogs);
      await charger();
    } catch (e) {
      log("error", "db", `Erreur suppression: ${e}`, setLogs);
    }
  };

  const confirmerSuppression = async () => {
    try {
      if (selection === "tout") await invoke("supprimer_tout");
      else if (selection === "aujourd-hui") await invoke("supprimer_aujourd_hui");
      else if (selection === "jours-precedents") await invoke("supprimer_precedents");
      log("info", "db", `Suppression: ${selection} (${nbAffectes ?? "?"} scans)`, setLogs);
      setModalSuppression(false);
      await charger();
    } catch (e) {
      log("error", "db", `Erreur: ${e}`, setLogs);
    }
  };

  const exporterCsv = async () => {
    try {
      const chemin = await save({
        title: "Enregistrer le CSV",
        defaultPath: `scans-${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });
      if (!chemin) {
        log("info", "csv", "Export annulé par l'utilisateur", setLogs);
        return;
      }
      const cheminFinal = await invoke<string>("exporter_csv", { chemin });
      log("info", "csv", `CSV exporté: ${cheminFinal}`, setLogs);
    } catch (e) {
      log("error", "csv", `Erreur export CSV: ${e}`, setLogs);
    }
  };

  const libellesPredicats: Record<PredicatSuppression, string> = useMemo(() => ({
    "aujourd-hui": "Aujourd'hui",
    "jours-precedents": "Les jours précédents",
    "tout": "Tout supprimer",
  }), []);

  const maxJour = useMemo(() => stats ? Math.max(1, ...stats.par_jour.map(j => j.nombre)) : 1, [stats]);

  const conteneurStyle: React.CSSProperties = {
    ...styles.conteneur,
    backgroundColor: "var(--fond)",
    color: "var(--texte)",
  };

  const plageTexte = useMemo(() => {
    if (scans.length === 0) return "0";
    const debut = (page - 1) * TAILLE_PAGE + 1;
    const fin = debut + scans.length - 1;
    const total = rechercheEnvoyee ? scans.length : nbTotal;
    if (rechercheEnvoyee) return `${debut}–${fin} (filtré)`;
    return `${debut}–${fin} / ${total}`;
  }, [page, scans.length, nbTotal, rechercheEnvoyee]);

  return (
    <div style={conteneurStyle}>
      {/* En-tête */}
      <header style={styles.enTete}>
        <div
          onClick={handleTitreTap}
          style={{ cursor: "pointer", userSelect: "none" }}
          title="Cliquer 5 fois pour le mode debug"
        >
          <h1 style={styles.titrePrincipal}>Passage aujourd&apos;hui</h1>
          <p style={styles.sousTitre}>
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            style={styles.toggle}
            onClick={() => setTheme(t => t === "sombre" ? "clair" : "sombre")}
            title={theme === "sombre" ? "Passer en thème clair" : "Passer en thème sombre"}
          >
            {theme === "sombre" ? "☾" : "☀"} {theme === "sombre" ? "Sombre" : "Clair"}
          </button>
        </div>
      </header>

      {/* Compteurs */}
      <div style={styles.compteurs}>
        <div style={styles.compteur}>
          <div style={styles.chiffre}>{nbAjd}</div>
          <div style={styles.libelle}>Aujourd&apos;hui</div>
        </div>
        <div style={styles.compteur}>
          <div style={styles.chiffre}>{nbTotal}</div>
          <div style={styles.libelle}>Total</div>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div style={styles.statsSection}>
          <div style={styles.statsCarte}>
            <div style={styles.statsTitre}>Scans — 7 derniers jours</div>
            {stats.par_jour.map((j) => (
              <div key={j.date} style={styles.statsBarreLigne}>
                <span style={styles.statsBarreLabel}>{formaterDateCourte(j.date)}</span>
                <span style={styles.statsBarreTrack}>
                  <span
                    style={{
                      ...styles.statsBarreRemplie,
                      width: `${Math.round((j.nombre / maxJour) * 100)}%`,
                    }}
                  />
                </span>
                <span style={styles.statsBarreValeur}>{j.nombre}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        <div style={styles.rechercheWrap}>
          <input
            type="search"
            placeholder="Rechercher (contenu ou date, ex. 2026-06-04)…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            style={styles.recherche}
            aria-label="Rechercher dans les scans"
          />
        </div>
        <button style={styles.btn} onClick={exporterCsv}>Exporter CSV</button>
        <button style={styles.btn} onClick={() => { setPage(1); charger(); }}>Actualiser</button>
        <button style={styles.btnDanger} onClick={() => setModalSuppression(true)}>
          Supprimer des données
        </button>
      </div>

      {/* Tableau */}
      <div style={styles.table}>
        <table style={styles.tableInner}>
          <thead>
            <tr>
              <th style={styles.th}>Contenu</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Heure</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {scans.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ ...styles.td, textAlign: "center", color: "var(--texte-secondaire)", padding: "40px 14px" }}>
                  {rechercheEnvoyee ? "Aucun résultat pour cette recherche." : "Aucun scan enregistré."}
                </td>
              </tr>
            ) : (
              scans.map((s) => {
                const { date, heure } = formaterDate(s.date_heure);
                return (
                  <tr key={s.id}>
                    <td style={styles.td}><strong>{s.contenu}</strong></td>
                    <td style={styles.td}>{date}</td>
                    <td style={styles.td}>{heure}</td>
                    <td style={styles.td}>
                      <button style={styles.supprimerBtn} onClick={() => supprimerUn(s.id)}>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={styles.pagination}>
        <span style={styles.paginationInfo}>
          Page {page} / {totalPages} — {plageTexte}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            style={{ ...styles.btn, opacity: page <= 1 ? 0.5 : 1 }}
            onClick={() => setPage(1)}
            disabled={page <= 1}
          >« Premier</button>
          <button
            style={{ ...styles.btn, opacity: page <= 1 ? 0.5 : 1 }}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
          >‹ Précédent</button>
          <button
            style={{ ...styles.btn, opacity: page >= totalPages ? 0.5 : 1 }}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >Suivant ›</button>
          <button
            style={{ ...styles.btn, opacity: page >= totalPages ? 0.5 : 1 }}
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
          >Dernier »</button>
        </div>
      </div>

      {/* Modal suppression */}
      {modalSuppression && (
        <div style={styles.modalOverlay} onClick={() => setModalSuppression(false)}>
          <div style={styles.modalContenu} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitre}>Supprimer des données</h3>
            <p style={styles.modalSousTitre}>
              Cette action est irréversible. Le nombre indiqué sera supprimé.
            </p>
            {(["aujourd-hui", "jours-precedents", "tout"] as PredicatSuppression[]).map((v) => (
              <label key={v} style={styles.optionSuppression}>
                <span style={styles.optionSuppressionGauche}>
                  <input
                    type="radio"
                    name="suppression"
                    value={v}
                    checked={selection === v}
                    onChange={() => setSelection(v)}
                    style={{ marginRight: 8 }}
                  />
                  {libellesPredicats[v]}
                </span>
                {nbAffectes !== null && selection === v && (
                  <span style={styles.badge}>{nbAffectes}</span>
                )}
              </label>
            ))}
            <div style={styles.boutonsModal}>
              <button style={styles.btn} onClick={() => setModalSuppression(false)}>Annuler</button>
              <button
                style={styles.btnDanger}
                onClick={confirmerSuppression}
                disabled={nbAffectes === 0}
              >
                Supprimer {nbAffectes !== null ? `(${nbAffectes})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pied de page */}
      <footer style={styles.piedPage}>
      </footer>

      {/* Toasts de nouveaux scans */}
      <div style={styles.toastsWrap} aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} style={styles.toast}>
            <div style={styles.toastContenu}>📥 {t.contenu}</div>
            <div style={styles.toastDate}>{t.date}</div>
          </div>
        ))}
      </div>

      {/* Console debug (accessible via 5 taps sur le titre) */}
      {debugSecret && (
        <>
          <div style={styles.debugBarre} onClick={() => setDebugOuvert(!debugOuvert)}>
            <span style={styles.debugLabel}>console</span>
            <span style={styles.debugBadge}>{logs.split("\n").length - 1}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--texte-secondaire)" }}>
              {debugOuvert ? "▼" : "▲"}
            </span>
          </div>
          <div style={styles.debugBarre} onClick={() => setConfigOuvert(!configOuvert)}>
            <span style={styles.debugLabel}>config</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--texte-secondaire)" }}>
              {configOuvert ? "▼" : "▲"}
            </span>
          </div>
          <DebugPanel
            ouvert={debugOuvert}
            surFermer={() => setDebugOuvert(false)}
          />
          <ConfigPanel
            ouvert={configOuvert}
            surFermer={() => setConfigOuvert(false)}
          />
        </>
      )}
    </div>
  );
}
