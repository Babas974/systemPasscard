// ConfigPanel.tsx
// Panneau de configuration pour l'admin non-technique.
// Permet de voir l'etat du serveur, changer le port, relancer le serveur.

import React, { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Props {
  ouvert: boolean;
  surFermer: () => void;
}

const styles: Record<string, React.CSSProperties> = {
  conteneur: {
    position: "fixed",
    top: 0,
    right: 0,
    width: "400px",
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
  contenu: {
    flex: 1,
    padding: "16px",
    overflowY: "auto",
  },
  section: {
    marginBottom: "20px",
  },
  sectionTitre: {
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--texte-secondaire)",
    marginBottom: "8px",
    textTransform: "uppercase" as const,
  },
  statutLigne: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px",
    backgroundColor: "var(--surface-elevee)",
    borderRadius: "6px",
    marginBottom: "8px",
  },
  statutDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
  },
  statutTexte: {
    fontSize: "14px",
    fontWeight: 600,
  },
  champ: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  label: {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--texte-secondaire)",
    minWidth: "80px",
  },
  input: {
    flex: 1,
    padding: "8px 12px",
    border: "1px solid var(--bordure)",
    borderRadius: "4px",
    backgroundColor: "var(--surface)",
    color: "var(--texte)",
    fontSize: "14px",
  },
  bouton: {
    padding: "8px 16px",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
  },
  boutonPrimaire: {
    backgroundColor: "var(--accent)",
    color: "#fff",
  },
  boutonSecondaire: {
    backgroundColor: "var(--bordure)",
    color: "var(--texte)",
  },
  boutonDanger: {
    backgroundColor: "var(--danger)",
    color: "#fff",
  },
  ligneBoutons: {
    display: "flex",
    gap: "8px",
    marginTop: "12px",
  },
  infoTexte: {
    fontSize: "12px",
    color: "var(--texte-secondaire)",
    fontStyle: "italic",
    marginTop: "8px",
  },
};

export default function ConfigPanel({ ouvert, surFermer }: Props) {
  const [port, setPort] = useState(8389);
  const [nouveauPort, setNouveauPort] = useState("8389");
  const [statutServeur, setStatutServeur] = useState<"actif" | "inactif" | "inconnu">("inconnu");
  const [message, setMessage] = useState<string | null>(null);

  const chargerConfig = useCallback(async () => {
    try {
      const p = await invoke<number>("obtenir_port_serveur");
      setPort(p);
      setNouveauPort(String(p));
      
      // Health check via /debug/logs (plus fiable que /health)
      try {
        const res = await fetch(`http://localhost:${p}/debug/logs?limit=1`, { signal: AbortSignal.timeout(3000) });
        setStatutServeur(res.ok ? "actif" : "inactif");
      } catch {
        setStatutServeur("inactif");
      }
    } catch (e) {
      console.warn("Erreur chargement config:", e);
    }
  }, []);

  useEffect(() => {
    if (ouvert) {
      chargerConfig();
      const interval = setInterval(chargerConfig, 5000);
      return () => clearInterval(interval);
    }
  }, [ouvert, chargerConfig]);

  const handleChangerPort = async () => {
    const p = parseInt(nouveauPort, 10);
    if (isNaN(p) || p < 1024 || p > 65535) {
      setMessage("Port invalide (1024-65535)");
      return;
    }
    try {
      await invoke("changer_port_serveur", { port: p });
      setPort(p);
      setMessage(`Port change en ${p}. Redemarrez l'application.`);
    } catch (e) {
      setMessage("Erreur: " + String(e));
    }
  };

  const handleRelancer = async () => {
    try {
      const resultat = await invoke<string>("relancer_serveur");
      setMessage(resultat);
      chargerConfig();
    } catch (e) {
      setMessage("Erreur: " + String(e));
    }
  };

  const handleViderAnciensLogs = async () => {
    try {
      const nb = await invoke<number>("vider_anciens_logs");
      setMessage(`${nb} fichier(s) log(s) ancien(s) supprime(s)`);
    } catch (e) {
      setMessage("Erreur: " + String(e));
    }
  };

  if (!ouvert) return null;

  return (
    <div style={styles.conteneur}>
      <div style={styles.enTete}>
        <h3 style={styles.titre}>Configuration</h3>
        <button
          style={{ ...styles.bouton, ...styles.boutonSecondaire }}
          onClick={surFermer}
        >
          Fermer
        </button>
      </div>

      <div style={styles.contenu}>
        {/* Etat du serveur */}
        <div style={styles.section}>
          <div style={styles.sectionTitre}>Etat du serveur</div>
          <div style={styles.statutLigne}>
            <div
              style={{
                ...styles.statutDot,
                backgroundColor:
                  statutServeur === "actif"
                    ? "#22c55e"
                    : statutServeur === "inactif"
                    ? "#ef4444"
                    : "#94a3b8",
              }}
            />
            <span style={styles.statutTexte}>
              {statutServeur === "actif"
                ? "Actif"
                : statutServeur === "inactif"
                ? "Inactif"
                : "Inconnu"}
            </span>
          </div>
          <div style={styles.infoTexte}>
            Le serveur tourne sur le port {port}
          </div>
        </div>

        {/* Configuration du port */}
        <div style={styles.section}>
          <div style={styles.sectionTitre}>Port du serveur</div>
          <div style={styles.champ}>
            <span style={styles.label}>Port:</span>
            <input
              style={styles.input}
              type="number"
              value={nouveauPort}
              onChange={(e) => setNouveauPort(e.target.value)}
              min="1024"
              max="65535"
            />
          </div>
          <div style={styles.ligneBoutons}>
            <button
              style={{ ...styles.bouton, ...styles.boutonPrimaire }}
              onClick={handleChangerPort}
            >
              Appliquer
            </button>
            <button
              style={{ ...styles.bouton, ...styles.boutonSecondaire }}
              onClick={handleRelancer}
            >
              Relancer le serveur
            </button>
          </div>
          <div style={styles.infoTexte}>
            Pour changer le port, modifiez la valeur et cliquez "Appliquer".
            Puis redemarrez l'application.
          </div>
        </div>

        {/* Actions rapides */}
        <div style={styles.section}>
          <div style={styles.sectionTitre}>Actions rapides</div>
          <div style={styles.ligneBoutons}>
            <button
              style={{ ...styles.bouton, ...styles.boutonSecondaire }}
              onClick={chargerConfig}
            >
              Actualiser
            </button>
            <button
              style={{ ...styles.bouton, ...styles.boutonDanger }}
              onClick={handleViderAnciensLogs}
            >
              Vider les anciens logs
            </button>
          </div>
          <div style={styles.infoTexte}>
            Supprime les fichiers logs anterieurs a hier.
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div
            style={{
              ...styles.statutLigne,
              backgroundColor: message.includes("Erreur")
                ? "rgba(239, 68, 68, 0.1)"
                : "rgba(34, 197, 94, 0.1)",
            }}
          >
            <span style={{ fontSize: "13px" }}>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
