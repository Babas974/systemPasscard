# ApiService.ts

## Chemin du fichier
`ApiService.ts`

## Description
Service HTTP adaptatif pour la communication avec le serveur PC. Découvre automatiquement le serveur sur le réseau local via le module Kotlin natif (scan réseau + ping natif + IP device). Gère la reconnexion avec backoff exponentiel.

## Composants/clés principaux

### Interfaces
- **`ScanResult`** : `{ statut: 'ok' | 'erreur', message, erreur? }`
- **`NetworkError`** : `{ kind: NetworkErrorKind, message, original? }`
- **`NetworkErrorKind`** : `'timeout' | 'proxy' | 'dns' | 'refused' | 'offline' | 'unknown'`

### Fonctions d'export
- **`setIP(ip)`** : Définit l'IP du serveur et la sauvegarde
- **`getIP()`** : Retourne l'IP actuelle du device
- **`getApiBaseUrl()`** : Retourne l'URL de base actuelle
- **`isConnecte()`** : État de connexion
- **`getDiscoveredPort()`** : Port découvert
- **`getBackoffMs()`** : Délai de backoff exponentiel (2s → 4s → 8s → 16s → 30s)
- **`resetBackoff()`** : Réinitialise le compteur de tentatives
- **`resolveBaseUrl()`** : Résout l'URL du serveur (cache 5s, ping natif, scan réseau)
- **`initDeviceIP()`** : Initialise l'IP du device au démarrage
- **`envoyerScan(contenu)`** : Envoie un scan au serveur (POST `/scan`) avec 2 tentatives
- **`testerConnexion()`** : Teste la connectivité au serveur
- **`supprimerToutServeur()`** : DELETE `/scans/all`
- **`supprimerParType(type)`** : DELETE `/scans/all`, `/scans/today` ou `/scans/previous`
- **`onConnectionChange(cb)`** : Abonnement aux changements de connexion
- **`formatLocalDateTime()`** : Formate la date/heure locale en `YYYY-MM-DD HH:mm:ss`

### Fonctions internes
- **`pingNative(ip)`** : Ping natif via le module Kotlin
- **`pingUrl(url, timeout)`** : Ping HTTP vers `/scans`
- **`scanNetworkNative()`** : Scan complet du réseau via le module Kotlin
- **`fetchWithTimeout(url, options, timeout)`** : Fetch avec timeout via AbortController
- **`classifyNetworkError(err)`** : Classifie les erreurs réseau en catégories

## Dépendances
- `react-native` : `NativeModules`, `Platform`
- `./Logger` : `logInfo`, `logError`
- `./StorageService` : `loadPort`, `savePort`, `loadIP`, `saveIP`
- Module natif : `NetworkModule` (pingServer, scanNetwork, getDeviceIP)

## Détails importants
- **Ports** : Scan de 8389 à 8399 (SYNC avec NetworkModule.kt et main.rs)
- **Cache** : Dernier succès de découverte mis en cache 5 secondes
- **Timeouts** : Requêtes 10s, ping natif 200ms, ping HTTP 800ms
- **Retry** : 2 tentatives pour `envoyerScan` avec délai de 300-500ms
- **Backoff** : Exponentiel de 2s à 30s après échecs
- **Découverte** : 1) IP connue → 2) IP device → 3) Scan réseau complet
- **Événements** : Système d'abonnement pour les changements de connexion
- **Erreurs proxy** : Détection spéciale des erreurs de proxy (192.168.224.1)
