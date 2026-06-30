# NoPersistCookieJarContainer.kt

## Chemin du fichier
`android/app/src/main/java/com/appcollege/NoPersistCookieJarContainer.kt`

## Description
Implémentation d'un `CookieJarContainer` qui ne stocke aucun cookie. Utilisé pour empêcher OkHttp de conserver les cookies entre les requêtes vers le serveur local.

## Composants/clés principaux

### Classe
- **`NoPersistCookieJarContainer`** : Implémente `CookieJarContainer` (React Native)

### Méthodes
- **`saveFromResponse(url, cookies)`** : Ne fait rien — ignore les cookies reçus
- **`loadForRequest(url)`** : Retourne toujours une liste vide — n'envoie jamais de cookies
- **`setCookieJar(cookieJar)`** : Ne fait rien
- **`removeCookieJar()`** : Ne fait rien

## Dépendances
- `com.facebook.react.modules.network.CookieJarContainer`
- `okhttp3.Cookie`, `okhttp3.CookieJar`, `okhttp3.HttpUrl`

## Détails importants
- **Sécurité** : Empêche la persistance de cookies de session entre requêtes
- **Réseau local** : Adapté pour une app communiquant uniquement avec un serveur local
