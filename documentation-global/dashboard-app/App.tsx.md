# App.tsx

**Chemin du fichier :** `app/src/App.tsx`

## Description

Composant principal de l'application. Dashboard de gestion des scans (entrées HID) avec affichage en tableau, compteurs, recherche, pagination, suppression, export CSV, thème sombre/clair, notifications natives et panneau de debug secret.

## Composants/clés/fonctions/exportations

### Types/Interfaces
- **Scan** — `{ id, contenu, date_heure }` — structure d'un scan
- **Theme** — `"sombre" | "clair"`
- **Niveau** — `"info" | "data" | "warn" | "error"`
- **PredicatSuppression** — `"aujourd-hui" | "jours-precedents" | "tout"`
- **Toast** — `{ id, contenu, date }`
- **Notification** — `{ id, message, type }`

### Constantes
- **TAILLE_PAGE** : 50 — nombre de scans par page
- **CLE_THEME** : `"theme"` — clé localStorage pour le thème
- **themes** — objets de variables CSS pour chaque thème

### Fonctions utilitaires
- **appliquerTheme(theme)** — applique les variables CSS du thème au document
- **log(niveau, cat, message, setLogs)** — logger interne avec throttle (max 10/s) et dédoublonnage
- **formaterDate(dateStr)** — formate une date en { date, heure } en français

### Composant principal
- **App** — composant principal exporté par défaut
  - États principaux : `scans`, `nbAjd`, `nbTotal`, `recherche`, `page`, `theme`, `toasts`, `notifications`
  - Effets : thème, notifications natives, chargement périodique (5s), écoute events Tauri, debounce recherche, comptage pour suppression
  - Actions :
    - `charger` — récupère les scans paginés et les compteurs
    - `supprimerUn(id)` — supprime un scan par son ID
    - `confirmerSuppression` — supprime selon le prédicat sélectionné
    - `exporterCsv` — exporte les scans en CSV via dialogue natif
    - `afficherToast` / `afficherNotification` — affiche des feedbacks temporaires
  - Rendu : en-tête, compteurs, barre d'actions, tableau, modal suppression, footer, toasts, notifications, console debug secrète

## Dépendances

- `react` — hooks (useEffect, useState, useCallback, useMemo, useRef)
- `@tauri-apps/api/core` — `invoke`
- `@tauri-apps/api/event` — `listen`, `UnlistenFn`
- `@tauri-apps/plugin-notification` — notifications natives
- `@tauri-apps/plugin-dialog` — dialogue de sauvegarde CSV
- `./DebugPanel` — panneau de debug
- `./ConfigPanel` — panneau de configuration

## Détails importants

- **Mode debug secret** : 5 taps rapides sur le titre activent/désactivent les panneaux debug et config.
- **Notifications natives** : demande la permission au démarrage, envoie des notifications pour chaque nouveau scan.
- **Thème persistant** : sauvegardé dans localStorage.
- **Debounce recherche** : 250ms avant d'envoyer la requête de recherche.
- **Suppression sélective** : comptage en temps réel du nombre de scans affectés avant confirmation.
- **Toast auto-nettoyable** : les toasts disparaissent après 5 secondes.
- **Sécurité** : le footer contient un texte de sécurité (masqué dans le code lu).
- Le composant gère la pagination côté client avec `TAILLE_PAGE = 50`.
