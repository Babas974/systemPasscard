# DebugPanel.tsx

**Chemin du fichier :** `app/src/DebugPanel.tsx`

## Description

Panneau de débogage en temps réel qui affiche les logs de la tablette Android. Récupère les logs via l'API HTTP `/debug/logs` et écoute les nouveaux logs via l'event Tauri `nouveau-log`.

## Composants/clés/fonctions/exportations

### Types/Interfaces
- **LogEntry** (interface exportée) — structure d'un log : `{ id, source, niveau, message, date_heure }`
- **NiveauFiltre** — type union : `"tous" | "debug" | "info" | "warn" | "error" | "fatal"`
- **Props** — propriétés du composant : `{ ouvert, surFermer, apiBaseUrl? }`

### Constantes
- **COULEURS_NIVEAU** — mapping des niveaux de log vers des couleurs CSS

### Fonctions
- **fetchLogs(port, limit)** — récupère les logs depuis le serveur HTTP local
- **deleteAllLogs(port)** — supprime tous les logs via l'API HTTP DELETE

### Composant
- **DebugPanel** — composant principal exporté par défaut
  - États : `logs`, `filtre`, `recherche`, `autoScroll`, `statut`, `totalLogs`, `port`
  - Effets : chargement périodique (5s), écoute des events Tauri, auto-scroll
  - Actions : `recharger`, `vider`, `viderAnciensLogs`
  - Rendu : panneau latéral droit (640px) avec en-tête, filtres, zone de logs, barre de statut

## Dépendances

- `react` — hooks (useEffect, useState, useRef, useCallback)
- `@tauri-apps/api/event` — `listen`, `UnlistenFn`
- `@tauri-apps/api/core` — `invoke`

## Détails importants

- **Auto-nettoyage** : les logs de niveau "info" sont automatiquement supprimés après 10 secondes.
- **Limite mémoire** : maximum 500 logs en mémoire.
- **Détection déconnexion** : affiche un message et un bouton "Réessayer" si le serveur est injoignable.
- **Port dynamique** : récupère le port via la commande Tauri `obtenir_port_serveur`.
- **Recherche temps réel** : filtre les logs par niveau et par texte.
- Le panneau est positionné en fixed à droite de l'écran avec un z-index élevé (1000).
