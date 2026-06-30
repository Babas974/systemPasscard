# tauri.conf.json

**Chemin du fichier :** `app/src-tauri/tauri.conf.json`

## Description

Configuration principale de Tauri. Définit les paramètres de build, la fenêtre, la sécurité et les options de bundle pour l'application desktop.

## Composants/clés/fonctions/exportations

- **productName** : `"app"` — nom de l'application
- **version** : `"0.2.1"`
- **identifier** : `"app"` — identifiant unique de l'application
- **build** :
  - `beforeDevCommand` : `"pnpm dev"` — commande lancée avant le dev
  - `devUrl` : `"http://localhost:1420"` — URL du serveur de dev
  - `beforeBuildCommand` : `"pnpm build"` — commande lancée avant le build
  - `frontendDist` : `"../dist"` — dossier du build frontend
- **app** :
  - `withGlobalTauri` : `true` — expose l'API Tauri globalement
  - `windows` : fenêtre unique 800x600
  - `security.csp` : `null` — pas de Content Security Policy
- **bundle** :
  - `active` : `true`
  - `targets` : `["rpm", "msi"]` — formats de package (Linux RPM, Windows MSI)
  - `icons` : ensemble d'icônes pour différentes tailles

## Dépendances

Aucune (fichier de configuration).

## Détails importants

- **Sécurité CSP** : désactivée (`null`), ce qui est déconseillé en production mais simplifie le développement.
- **Fenêtre** : dimensions fixes de 800x600 pixels.
- **Bundle** : cible Linux (RPM) et Windows (MSI).
- **Global Tauri** : activé pour permettre l'accès à `window.__TAURI__` depuis le frontend.
