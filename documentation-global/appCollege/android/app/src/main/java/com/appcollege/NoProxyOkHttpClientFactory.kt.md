# NoProxyOkHttpClientFactory.kt

## Chemin du fichier
`android/app/src/main/java/com/appcollege/NoProxyOkHttpClientFactory.kt`

## Description
Fabrique d'OkHttpClient personnalisée qui contourne le proxy système pour les adresses réseau local. Assure que les requêtes vers le serveur PC ne passent pas par un proxy.

## Composants/clés principaux

### Classe
- **`NoProxyOkHttpClientFactory`** : Implémente `OkHttpClientFactory` (React Native)

### Méthode principale
- **`createNewNetworkModuleClient()`** : Crée un OkHttpClient configuré

### Configuration du client
- **Timeouts** : read 30s, write 30s, connect 15s
- **retryOnConnectionFailure** : `true`
- **Protocoles** : HTTP/1.1 et HTTP/2
- **proxy** : `Proxy.NO_PROXY` par défaut
- **ProxySelector personnalisé** : Détecte les adresses locales

### Fonction interne
- **`isLocalAddress(host)`** : Vérifie si une adresse est locale
  - `localhost`, `127.0.0.1`, `::1`
  - `192.168.*`
  - `10.*`
  - `172.16-31.*`

### CookieJar
- Utilise `NoPersistCookieJarContainer` avec `CookieJar.NO_COOKIES`

## Dépendances
- `com.facebook.react.modules.network.OkHttpClientFactory`
- `com.facebook.react.modules.network.OkHttpClientProvider`
- `okhttp3.*`
- `java.net.Proxy`, `java.net.ProxySelector`
- `NoPersistCookieJarContainer`

## Détails importants
- **Proxy local** : Les adresses privées (192.168.x, 10.x, 172.16-31.x) contournent le proxy
- **Proxy externe** : Les adresses publiques utilisent le proxy système s'il existe
- **Sécurité cookies** : Aucun cookie n'est stocké ou envoyé
- **Résolution de problème** : Corrige les erreurs de proxy (192.168.224.1) qui bloquaient les communications locales
