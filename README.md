# systemPasscard

**Application de scan de badges de passages infirmerie** pour établissements scolaires.

## Architecture

- **Tablette Android** (`appCollege/`) — App React Native qui scanne les badges via caméra, envoie les données au serveur PC via WiFi hotspot privé
- **PC Serveur** (`dashboard-app/`) — Dashboard Tauri/Actix-web qui reçoit, stocke et affiche les scans en temps réel

## Fonctionnalités

- Scan de badges par caméra (React Native Camera Kit)
- Communication HTTP locale via hotspot WiFi (192.168.137.x)
- Détection automatique du serveur sur le réseau local
- Dashboard temps réel avec statistiques et historique
- Export CSV et gestion des scans (suppression par date)
- Logs JSON structurés exportables depuis la tablette
- Reconnexion automatique avec backoff exponentiel

## Environnement

- Réseau scolaire avec proxy (`192.168.224.1:3129`) et Cortex XDR
- Contournement proxy pour trafic local (192.168.x, 10.x, 172.16-31.x)
- SQLite pour le stockage côté serveur
- HTTPS non requis (hotspot WiFi direct)

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Tablette | React Native 0.85, Kotlin natif |
| Serveur | Rust (Tauri 2, Actix-web 4, rusqlite) |
| Dashboard | React, Vite |
| Base de données | SQLite (WAL mode) |
| Réseau | OkHttp, hotspot WiFi privé |

## Documentation

La documentation technique détaillée de chaque fichier source est disponible dans `documentation-global/`.

## Sécurité

- Contournement sélectif du proxy uniquement pour les IPs locales
- CookieJar désactivé (pas de persistance SQLite côté client)
- CORS restreint aux plages réseau privées
- Network security config pour cleartext HTTP local

---

*Projet de gestion de passages infirmerie pour établissements scolaires — communication tablette ↔ PC via réseau local isolé.*
