# NetworkModule.kt

## Chemin du fichier
`android/app/src/main/java/com/appcollege/NetworkModule.kt`

## Description
Module React Native natif en Kotlin fournisant des fonctionnalités réseau et de logging : récupération de l'IP device, ping de serveur, scan réseau, écriture de logs sur disque et partage de fichiers.

## Composants/clés principaux

### Classe
- **`NetworkModule`** : Module React Native (`ReactContextBaseJavaModule`)
- **NAME** : `"NetworkModule"`

### Constantes
- **PORT_MIN** : 8389 (SYNC avec ApiService.ts, main.rs)
- **PORT_MAX** : 8399 (SYNC avec ApiService.ts, main.rs)
- **TIMEOUT_MS** : 500ms (timeout de scan)
- **PING_TIMEOUT_MS** : 200ms (timeout de ping)

### Méthodes React Native

#### Réseau
- **`getDeviceIP(promise)`** : Retourne l'IPv4 locale du device (non loopback)
- **`pingServer(ip, promise)`** : Teste les ports 8389-8399 sur une IP, retourne le port ouvert (0 si aucun)
- **`scanNetwork(promise)`** : Scan parallèle de 254 IPs sur le même /24 avec pool de 20 threads, retourne `IP:port`

#### Logging
- **`writeLogFile(content, extension, promise)`** : Écrit un fichier log avec timestamp
- **`appendLogEntry(line)`** : Ajoute une ligne au log du jour (fichier `appcollege_yyyyMMdd.log`)
- **`getCurrentLogFile(promise)`** : Retourne le chemin du fichier log du jour
- **`shareLogFile(filePath, promise)`** : Partage un fichier via Intent.ACTION_SEND avec FileProvider

### Fonction interne
- **`getLocalIPAddress()`** : Parcourt les interfaces réseau pour trouver une IP IPv4 non loopback
- **`getLogDir()`** : Retourne/crée le dossier `Documents/appcollege-logs/`

## Dépendances
- `com.facebook.react.bridge.*` : ReactApplicationContext, ReactMethod, Promise
- `com.facebook.react.module.annotations.ReactModule`
- `android.net.wifi.WifiManager`
- `android.content.Intent`
- `androidx.core.content.FileProvider`
- `java.net.*` : Socket, NetworkInterface, Inet4Address
- `java.util.concurrent.*` : Executors, CountDownLatch, ConcurrentLinkedQueue

## Détails importants
- **Scan réseau** : Utilise un pool de 20 threads pour scanner 254 IPs en parallèle, timeout max 5s
- **Ping** : Teste chaque port individuellement avec un timeout de 200ms par connexion
- **Logs disque** : Écrit en temps réel dans `Documents/appcollege-logs/appcollege_yyyyMMdd.log`
- **Partage** : Utilise `FileProvider` pour un partage sécurisé via Intent Android
- **Thread safety** : Utilise `ConcurrentLinkedQueue` pour le scan parallèle
- **Timeout** : Le scan complet a un timeout de 5 secondes via `CountDownLatch`
