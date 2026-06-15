// DebugPanel.tsx
// Panneau de logs en temps-reel : recupere les logs de la tablette via
// /debug/logs, ecoute les nouveaux logs via l'event Tauri "nouveau-log".

import React, { useEffect, useState, useRef, useCallback } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export interface LogEntry {
  id: number;
  source: string;
  niveau: string;
  message: string;
  date_heure: string;
}

type NiveauFiltre = "tous" | "debug" | "info" | "warn" | "error" | "fatal";

interface Props {
  ouvert: boolean;
  surFermer: () => void;
  apiBaseUrl?: string;
}

const COULEURS_NIVEAU: Record<string, string> = {
  debug: "#7c8da0",
  info: "#4a9eff",
  warn: "#f5a623",
  error: "#ff5e57",
  fatal: "#ff2d55",
};

const fetchLogs = async (port: number = 8389, limit: number = 200): Promise<{ logs: LogEntry[]; total: number; ok: boolean }> => {
  try {
    const url = `http://localhost:${port}/debug/logs?limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { logs: [], total: 0, ok: false };
    const data = await res.json();
    return { logs: (data.logs || []) as LogEntry[], total: data.total || 0, ok: true };
  } catch {
    return { logs: [], total: 0, ok: false };
  }
};

const deleteAllLogs = async (port: number = 8389): Promise<number> => {
  try {
    const res = await fetch(`http://localhost:${port}/debug/logs`, {
      method: "DELETE",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.supprimes || 0;
  } catch {
    return 0;
  }
};

const styles: Record<string, React.CSSProperties> = {
  conteneur: {
    position: "fixed",
    top: 0,
    right: 0,
    width: "640px",
    maxWidth: "90vw",
    height: "100vh",
    backgroundColor: "var(--surface)",
    borderLeft: "1px solid var(--bordure)",
    boxShadow: "-4px 0 12px rgba(0,0,0,0.15)",
    display: "flex",
    flexDirection: "column",
    zIndex: 1000,
  },
  enTete: {
    padding: "12px 16px",
    borderBottom: "1px solid var(--bordure)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "var(--surface-elevee)",
  },
  titre: { fontSize: "15px", fontWeight: 700, margin: 0 },
  actions: { display: "flex", gap: "6px" },
  btnIcone: {
    padding: "4px 10px",
    background: "transparent",
    border: "1px solid var(--bordure)",
    borderRadius: "4px",
    color: "var(--texte)",
    cursor: "pointer",
    fontSize: "12px",
  },
  filtres: {
    padding: "8px 16px",
    borderBottom: "1px solid var(--bordure)",
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  badgeNiveau: {
    padding: "2px 6px",
    borderRadius: "3px",
    color: "#fff",
    fontSize: "10px",
    fontWeight: 700,
    minWidth: "38px",
    textAlign: "center",
  },
  zoneLogs: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 12px",
    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
    fontSize: "12px",
    lineHeight: 1.4,
  },
  ligneLog: {
    display: "flex",
    gap: "8px",
    padding: "4px 0",
    borderBottom: "1px solid var(--bordure)",
  },
  timestamp: {
    color: "var(--texte-secondaire)",
    fontSize: "11px",
    whiteSpace: "nowrap",
  },
  source: {
    color: "var(--accent)",
    fontWeight: 600,
    minWidth: "80px",
  },
  message: {
    flex: 1,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  messageErreur: {
    color: "var(--danger)",
  },
  messageWarn: {
    color: "var(--warn)",
  },
  messageNormal: {
    color: "var(--texte)",
  },
  etatVide: {
    color: "var(--texte-secondaire)",
    textAlign: "center",
    padding: "20px",
    fontStyle: "italic",
  },
  statutBar: {
    padding: "6px 16px",
    borderTop: "1px solid var(--bordure)",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    color: "var(--texte-secondaire)",
    backgroundColor: "var(--surface-elevee)",
  },
};

export default function DebugPanel({ ouvert, surFermer }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filtre, setFiltre] = useState<NiveauFiltre>("tous");
  const [recherche, setRecherche] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [statut, setStatut] = useState<"connecte" | "deconnecte" | "inconnu">(
    "inconnu",
  );
  const zoneRef = useRef<HTMLDivElement>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);

  const [totalLogs, setTotalLogs] = useState(0);
  const [port, setPort] = useState(8389);

  const recharger = useCallback(async () => {
    const result = await fetchLogs(port, 200);
    if (result.ok) {
      setLogs((prev) => {
        const byId = new Map<number, LogEntry>();
        for (const l of result.logs) byId.set(l.id, l);
        for (const l of prev) if (!byId.has(l.id)) byId.set(l.id, l);
        return Array.from(byId.values())
          .sort((a, b) => b.id - a.id)
          .slice(0, 500);
      });
    }
    setTotalLogs(result.total);
    setStatut(result.ok ? "connecte" : "deconnecte");
  }, [port]);

  // Charger le port au montage
  useEffect(() => {
    if (!ouvert) return;
    invoke<number>("obtenir_port_serveur").then(setPort).catch(() => {});
  }, [ouvert]);

  useEffect(() => {
    if (!ouvert) return;
    recharger();
    const interval = setInterval(recharger, 5000);
    return () => clearInterval(interval);
  }, [ouvert, recharger]);

  useEffect(() => {
    if (!ouvert) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const setup = async () => {
      try {
        const unlisten = await listen<LogEntry>("nouveau-log", (event) => {
          if (cancelled) return;
          const entry = event.payload;
          setLogs((prev) => {
            const next = [entry, ...prev];
            return next.slice(0, 500);
          });
          // Info : auto-supprimer apres 10s
          if (entry.niveau === "info") {
            const timer = setTimeout(() => {
              setLogs((prev) => prev.filter((l) => l.id !== entry.id));
            }, 10000);
            timers.push(timer);
          }
        });
        if (cancelled) {
          unlisten();
        } else {
          unlistenRef.current = unlisten;
        }
      } catch (e) {
        console.warn("listen nouveau-log a echoue:", e);
      }
    };
    setup();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    };
  }, [ouvert]);

  useEffect(() => {
    if (autoScroll && zoneRef.current) {
      zoneRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  const vider = async () => {
    await deleteAllLogs(port);
    setLogs([]);
    setTotalLogs(0);
  };

  const viderAnciensLogs = async () => {
    try {
      const nb = await invoke<number>("vider_anciens_logs");
      alert(`${nb} ancien(s) log(s) supprime(s)`);
    } catch (e) {
      console.warn("vider_anciens_logs a echoue:", e);
    }
  };

  const logsFiltres = logs.filter((l) => {
    if (filtre !== "tous" && l.niveau !== filtre) return false;
    if (recherche) {
      const r = recherche.toLowerCase();
      return (
        l.message.toLowerCase().includes(r) ||
        l.source.toLowerCase().includes(r) ||
        l.niveau.toLowerCase().includes(r)
      );
    }
    return true;
  });

  if (!ouvert) return null;

  return (
    <div style={styles.conteneur}>
      <div style={styles.enTete}>
        <h3 style={styles.titre}>
          Debug — {logs.length} log{logs.length > 1 ? "s" : ""}
        </h3>
        <div style={styles.actions}>
          <button style={styles.btnIcone} onClick={recharger} title="Recharger">
            ↻
          </button>
          <button style={styles.btnIcone} onClick={vider} title="Vider les logs DB (error/fatal)">
            🗑
          </button>
          <button style={styles.btnIcone} onClick={viderAnciensLogs} title="Supprimer les fichiers logs avant hier">
            📁
          </button>
          <button
            style={styles.btnIcone}
            onClick={() => setAutoScroll(!autoScroll)}
            title="Auto-scroll en haut"
          >
            {autoScroll ? "📌" : "📍"}
          </button>
          <button style={styles.btnIcone} onClick={surFermer} title="Fermer">
            ✕
          </button>
        </div>
      </div>

      <div style={styles.filtres}>
        {(["tous", "debug", "info", "warn", "error", "fatal"] as const).map(
          (n) => (
            <button
              key={n}
              onClick={() => setFiltre(n)}
              style={{
                ...styles.btnIcone,
                backgroundColor: filtre === n ? "var(--accent)" : "transparent",
                color: filtre === n ? "#fff" : "var(--texte)",
              }}
            >
              {n}
            </button>
          ),
        )}
        <input
          type="text"
          placeholder="Rechercher..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          style={{
            ...styles.btnIcone,
            flex: 1,
            minWidth: "120px",
            cursor: "text",
          }}
        />
      </div>

      <div ref={zoneRef} style={styles.zoneLogs}>
        {logsFiltres.length === 0 ? (
          <div style={styles.etatVide}>
            {statut === "deconnecte" 
              ? "Serveur injoignable. Verifiez que le serveur tourne sur le port 8389."
              : "Aucun log. Les logs de l'app Android apparaitront ici en temps-reel."}
            {statut === "deconnecte" && (
              <button 
                style={{ ...styles.btnIcone, marginTop: "12px", padding: "8px 16px" }}
                onClick={recharger}
              >
                Reessayer
              </button>
            )}
          </div>
        ) : (
          logsFiltres.map((l) => {
            const couleurMsg =
              l.niveau === "fatal" || l.niveau === "error"
                ? styles.messageErreur
                : l.niveau === "warn"
                ? styles.messageWarn
                : styles.messageNormal;
            return (
              <div key={l.id} style={styles.ligneLog}>
                <span
                  style={{
                    ...styles.badgeNiveau,
                    backgroundColor: COULEURS_NIVEAU[l.niveau] || "#888",
                  }}
                >
                  {l.niveau.toUpperCase()}
                </span>
                <span style={styles.timestamp}>{l.date_heure}</span>
                <span style={styles.source}>[{l.source}]</span>
                <span style={{ ...styles.message, ...couleurMsg }}>
                  {l.message}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div style={styles.statutBar}>
        <span>
          Statut: <strong style={{ color: statut === "connecte" ? "var(--succes)" : "var(--danger)" }}>
            {statut === "connecte" ? "Connecte" : "Serveur injoignable"}
          </strong>
        </span>
        <span>Affiches: {logsFiltres.length} / {logs.length} | Total serveur: {totalLogs}</span>
      </div>
    </div>
  );
}
