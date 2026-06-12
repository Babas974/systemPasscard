# TODO - appCollege + dashboard-app

## Statut
**En cours** — CI corrigée, build Android release OK, UX refonte 2 étapes OK, sécurité renforcée (ports adaptatifs, DB chiffrée, auth HTTP).

## Tâches réalisées
- CI/CD : pnpm, build.yml, lint warnings
- Build Android release : assembleRelease dans le workflow
- Icône Android : tous densities (mdpi→xxxhdpi)
- Nom app : "AppCollege" dans strings.xml
- Scan réseau dynamique : `NetworkModule.kt` (getDeviceIP + scanNetwork)
- NetworkModule.kt fix : pool de 20 threads + try/finally
- ErrorBoundary : fallback UI (bouton "Recommencer")
- Double-tap protection : lock via ref
- Fichiers .db supprimés du git + ajoutés au .gitignore
- Retry immédiat : 1 retry après 500ms dans `envoyerScan`
- Logs réseau : logInfo/logError dans ApiService
- CORS restreint : uniquement localhost/192.168.x/10.x/172.x
- `/seed` réservé au debug (`#[cfg(debug_assertions)]`)
- Port 8389 centralisé : commentaires SYNC dans ApiService.ts, NetworkModule.kt, main.rs
- Docs mises à jour : DEPLOY.md et vision.md (8080 → 8389)
- GitHub Actions : migrées v5/v6 (Node 24)
- Reconnexion Kotlin : `pingServer()` natif (200ms timeout)
- Backoff exponentiel : 2s→4s→8s→16s→30s
- File indépendante : traitée toutes les 3s même hors connexion
- Refonte UX Android : 2 étapes (Nom→Prénom/VALIDER), toast, KeyboardAvoidingView
- SettingsScreen : debug console local, tester connexion, vider historique, liste élèves
- resetBackoff() ajouté dans ApiService + appelé dans AppState handler
- Logger Android : stockage local `getLogsLocaux()` pour visibilité hors-ligne
- DebugPanel : status basé sur HTTP ok, port dynamique via `obtenir_port_serveur`
- ConfigPanel desktop : état serveur, port, relancer
- Server config : port persisté dans `~/.config/appcollege/config.json`
- Remove reqwest::blocking : health check via `fetch()` + `AbortSignal.timeout(3s)`
- Remove `tester_sante_serveur` : commande Tauri supprimée
- Fix ServerHandle : `.run()` retourne `Server`, `.handle()` sur `Server`
- Fix db_http moved : clone AVANT `http_state`
- Auto-cleanup logs supprimé : logs conservés indéfiniment en DB
- **Ports adaptatifs** : scan 8389-8399 dans Kotlin (pingServer + scanNetwork) et ApiService
- **DB chiffrée** : SQLCipher via `bundled-sqlcipher`, PRAGMA key, clé dans `~/.config/appcollege/db_key`
- **Auth HTTP** : API key dans `~/.config/appcollege/api_key`, header `X-API-Key` sur tous les endpoints sauf `/health`
- **StorageService** : loadPort/savePort ajoutés pour persister le port découvert

## Fichiers clés
- `.github/workflows/build.yml` : CI/CD
- `appCollege/App.tsx` : UX Android (2 étapes, bouton rond, toast)
- `appCollege/ApiService.ts` : ports adaptatifs 8389-8399, backoff, retry, API key header
- `appCollege/Logger.ts` : stockage local + envoi HTTP
- `appCollege/SettingsScreen.tsx` : paramètres
- `appCollege/StorageService.ts` : loadPort/savePort ajoutés
- `appCollege/android/app/src/main/java/com/appcollege/NetworkModule.kt` : ping multi-port (8389-8399)
- `dashboard-app/app/src/App.tsx` : UX desktop + ConfigPanel
- `dashboard-app/app/src/DebugPanel.tsx` : port dynamique, status HTTP
- `dashboard-app/app/src/ConfigPanel.tsx` : health check via `/debug/logs`
- `dashboard-app/app/src-tauri/src/main.rs` : backend (api_key, config_port, ServerHandle)
- `dashboard-app/app/src-tauri/src/routes.rs` : routes HTTP avec validation API key
- `dashboard-app/app/src-tauri/src/db.rs` : SQLite chiffré (SQLCipher)
- `dashboard-app/app/src-tauri/Cargo.toml` : bundled-sqlcipher, actix-web-httpauth

## Tâches en cours / À faire

### Priorité HAUTE ✅
- **Ports adaptatifs** : ✅ scanner 8389-8399 dans ApiService/NetworkModule
- **DB chiffrée** : ✅ `rusqlite` + `bundled-sqlcipher` + `PRAGMA key`
- **Auth HTTP** : ✅ API key dans `~/.config/appcollege/api_key`, header `X-API-Key`

### Priorité MOYENNE
- **CSP** : activer dans `tauri.conf.json`
- **Path traversal** : valider chemin `exporter_csv`
- **relancer_serveur** : implémenter `ServerHandle::stop()` au lieu du stub
- **Partager API key Android↔Desktop** : endpoint `/api-key` ou mécanisme de découverte

### Priorité BASSE
- **APK signing** : keystore production
- **Validation entrées** : `validator` ou `garde`

## Suppositions validées
- Port 8389 par défaut, persisté dans `~/.config/appcollege/config.json`
- Ports adaptatifs : scan 8389-8399, premier port répondant est utilisé
- API key générée au 1er démarrage, stockée dans `~/.config/appcollege/api_key`
- DB chiffrée via SQLCipher (PRAGMA key), clé dans `~/.config/appcollege/db_key`
- Health check `/health` public (pas d'auth), tous les autres endpoints protégés
- Logs jamais supprimés, stockés en DB indéfiniment
- Health check via `/debug/logs` au lieu de `/health` (double mutex deadlock)
- `reqwest::blocking` supprimé → `fetch()` navigateur (fix crash Windows)
- 2 étapes (Nom→Prénom/VALIDER) au lieu de 3 pour UX non-tech
- Bouton rond vert/rouge = état connexion + 6 taps = paramètres

## Problèmes identifiés
- ~~Aucune auth HTTP : tous les endpoints ouverts sur le LAN~~ → ✅ Résolu : API key
- ~~DB non chiffrée : noms d'élèves en clair dans `scans.db`~~ → ✅ Résolu : SQLCipher
- ~~Port 8389 hardcodé dans 3 fichiers (Android, React Native, Rust)~~ → ✅ Résolu : scan 8389-8399
- CSP désactivé dans tauri.conf.json
- Path traversal possible sur `exporter_csv`
- relancer_serveur = STUB qui ne fait rien
- API key Android↔Desktop : mécanisme de partage à implémenter
