# Logger.ts

## Chemin du fichier
`Logger.ts`

## Description
Service de logging complet avec stockage local (AsyncStorage + fichier disque) et envoi HTTP périodique vers le PC serveur. Supporte les niveaux debug, info, warn, error et fatal.

## Composants/clés principaux

### Types
- **`NiveauLog`** : `'debug' | 'info' | 'warn' | 'error' | 'fatal'`
- **`LogEntry`** : `{ source, niveau, message, timestamp, envoye }`

### Fonctions principales
- **`log(source, niveau, message)`** : Fonction principale de logging
- **`logInfo(source, message)`** : Raccourci pour niveau info
- **`logWarn(source, message)`** : Raccourci pour niveau warning
- **`logError(source, message, err?)`** : Log d'erreur avec détails d'exception
- **`logFatal(source, message, err?)`** : Log d'erreur fatale

### Gestion du buffer local
- **`getLogsLocaux(limit)`** : Retourne les N derniers logs du buffer
- **`getNbErreursLocales()`** : Compte les erreurs et fatals
- **`clearLogsLocaux()`** : Vide le buffer local et la queue

### Envoi HTTP
- **`startLogFlusher(intervalMs)`** : Démarre l'envoi périodique (défaut 3s)
- **`stopLogFlusher()`** : Arrête l'envoi périodique

### Autre
- **`installGlobalErrorHandler(source)`** : Installe un gestionnaire global d'erreurs non capturées

## Dépendances
- `react-native` : `NativeModules`, `Platform`
- `./ApiService` : `getApiBaseUrl`, `isConnecte`, `formatLocalDateTime`
- `./StorageService` : `loadLogs`, `saveLogs`, `LogEntryPersist`, `clearLogs`
- Module natif : `NetworkModule` (pour `appendLogEntry` — écriture disque temps réel)

## Détails importants
- **Buffer local** : Max 500 logs en mémoire, persistés via AsyncStorage avec debounce 2s
- **Écriture disque** : Sur Android, chaque log est écrit en temps réel dans un fichier `.log` via le module Kotlin natif
- **Envoi HTTP** : POST vers `/debug/log` avec timeout 3s et retry 1 fois
- **Flush immédiat** : Les niveaux ERROR et FATAL sont envoyés immédiatement si connecté
- **Backoff** : Arrête l'envoi après 3 échecs consécutifs (réseau indisponible)
- **File d'attente** : Max 200 logs en attente d'envoi
- **Console native** : Les logs sont aussi écrits via `console.debug/info/warn/error`
- **Handler global** : Capture les erreurs React non capturées via `ErrorUtils`
