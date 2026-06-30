# vite.config.ts

**Chemin du fichier :** `app/vite.config.ts`

## Description

Configuration Vite pour le build et le serveur de développement de l'application frontend React. Intègre également la configuration Vitest pour les tests unitaires.

## Composants/clés/fonctions/exportations

- **export default** — configuration Vite asynchrone retournée via `defineConfig`
- **plugins** : `react()` — plugin React pour le JSX/TSX
- **server** :
  - `port: 1420` — port fixe du serveur de dev
  - `strictPort: true` — échoue si le port est déjà utilisé
  - `host` — utilise `TAURI_DEV_HOST` si défini (pour le dev distant)
  - `hmr` — configuration du Hot Module Replacement via WebSocket
  - `watch.ignored` — ignore le dossier `src-tauri/`
- **test** :
  - `environment: "jsdom"` — environnement de test DOM
  - `globals: true` — fonctions globales (describe, it, expect)
  - `setupFiles` — fichier de configuration des tests

## Dépendances

- `vite` — outil de build
- `@vitejs/plugin-react` — plugin React

## Détails importants

- Le port 1420 est le port par défaut pour le dev server Tauri.
- Le HMR utilise le protocole WebSocket quand `TAURI_DEV_HOST` est défini (utile pour le dev sur appareil physique).
- Le dossier `src-tauri/` est exclu du watchers pour éviter les recompilations inutiles.
