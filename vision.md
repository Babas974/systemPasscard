# Vision du Projet - Pont de Saisie Securise (HTTP + SQLite)

## Architecture Globale

```
+------------------------------------+             +------------------------------------+
|       TABLETTE ANDROID             |             |          ORDINATEUR PC             |
|                                    |             |      (Windows ou Fedora)           |
|  +------------------------------+  |             |                                    |
|  | App React Native (TS)        |  |             |  +------------------------------+  |
|  |  - Saisie Nom/Prenom         |  |             |  | Systeme d'exploitation       |  |
|  |  - Envoi HTTP POST           |  |             |  |  - Point d'acces mobile Wi-Fi |  |
|  +--------------+---------------+  |             |  +--------------+---------------+  |
|                 |                  |             |                 |                  |
|                 v                  |             |                 v                  |
|  +--------------+---------------+  |   Wi-Fi     |  +--------------+---------------+  |
|  |  ApiService.ts               |  |   HTTP      |  | Serveur HTTP (actix-web)     |  |
|  |  - fetch POST /scan          |  +------------>|  |  - POST /scan                |  |
|  |  - fetch GET /scans          |  |   Port 8389 |  |  - GET /scans                 |  |
|  |  - Test connexion            |  |             |  |  - DELETE /scan/{id}          |  |
|  +------------------------------+  |             |  +--------------+---------------+  |
|                                    |             |                 |                  |
|                                    |             |                 v                  |
|                                    |             |  +--------------+---------------+  |
|                                    |             |  | Base SQLite (scans.db)      |  |
|                                    |             |  |  - Table scans (id, contenu,|  |
|                                    |             |  |    date_heure)               |  |
|                                    |             |  +--------------+---------------+  |
|                                    |             |                 |                  |
|                                    |             |                 v                  |
|                                    |             |  +--------------+---------------+  |
|                                    |             |  | Frontend React (Tauri)      |  |
|                                    |             |  |  - Affichage des scans      |  |
|                                    |             |  |  - Suppression              |  |
|                                    |             |  |  - Compteurs (jour/total)   |  |
|                                    |             |  +------------------------------+  |
+------------------------------------+             +------------------------------------+
```

## Principe de Fonctionnement

### Flux de donnees (sens unique)

1. L'utilisateur saisit **NOM** et **Prenom** sur la tablette
2. L'app verifie la connexion au PC (toutes les 10 secondes)
3. L'utilisateur appuie sur "Valider"
4. L'app envoie une requete HTTP `POST /scan` avec `{"contenu": "NOM Prenom"}`
5. Le serveur Rust (actix-web) recoit la requete
6. Le backend insere la donnee dans la base SQLite `scans.db`
7. L'interface React rafraichit automatiquement (toutes les 5 secondes)

### Reseau isole

- Le PC cree un **point d'acces mobile** (Windows) ou un **hotspot Wi-Fi** (Linux)
- La tablette se connecte a ce reseau prive
- Communication uniquement entre les deux appareils
- Aucun acces a Internet
- Aucun port expose sur le reseau principal

---

## App 1 : appCollege (Tablette Android)

### Emplacement
```
app-nouvelle-version/appCollege/
```

### Tech Stack
| Technologie | Version | Role |
|---|---|---|
| React Native | 0.85.3 | Framework mobile |
| TypeScript | ^5.8.3 | Langage frontend |
| Target SDK | 36 | API Android |
| Min SDK | 24 (Android 7.0) | Compatibilite |
| Fetch API | Native | Communication HTTP |

### Structure des fichiers cles

```
appCollege/
  App.tsx                              # UI principale (formulaire + IP)
  ApiService.ts                        # Service HTTP (envoyerScan, testerConnexion)
  styles.ts                            # StyleSheet globale
  package.json                         # Dependances
  android/app/src/main/
    AndroidManifest.xml                # Permissions Wi-Fi uniquement
    java/com/appcollege/
      MainApplication.kt               # Point d'entree Android
      MainActivity.kt                  # Activite React Native
```

### Service HTTP : ApiService.ts

```typescript
const PC_IP = "192.168.137.1";  // IP par defaut du point d'acces
const PORT = 8389;

export const envoyerScan = async (contenu: string): Promise<ScanResult> => {
  const response = await fetch(`http://${PC_IP}:${PORT}/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contenu }),
    signal: AbortSignal.timeout(10000),  // 10s timeout
  });
  return response.json();
};
```

**Fonctions exposees** :
- `envoyerScan(contenu)` — Envoie un scan au PC
- `testerConnexion()` — Teste si le PC est joignable
- `configurerPC(ip)` — Change l'IP du PC cible

### Permissions Android
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### UI React Native (App.tsx)

1. **Indicateur de connexion** — Affiche l'IP du PC et l'etat (vert=connecte, rouge=deconnecte)
2. **Bouton "Choisir le PC"** — Modal pour configurer l'IP
3. **Champ "Nom de famille"** — Auto-capitalise
4. **Champ "Prenom"** — Auto-capitalise
5. **Bouton "Valider mon passage"** — Envoie via `envoyerScan()`
6. **Messages de feedback** — Succes (vert) ou Erreur (rouge)
7. **Verification automatique** — Toutes les 10 secondes

#### Format des donnees envoyees
```json
POST /scan
Content-Type: application/json

{
  "contenu": "DUPONT Jean"
}
```

### Compilation et Installation
```bash
cd appCollege/android
./gradlew assembleDebug

# APK genere :
# appCollege/android/app/build/outputs/apk/debug/app-debug.apk (117 MB)

# Installation sur tablette :
adb install -r app-debug.apk
```

---

## App 2 : dashboard-app (PC Desktop)

### Emplacement
```
app-nouvelle-version/dashboard-app/app/
```

### Tech Stack
| Technologie | Version | Role |
|---|---|---|
| Tauri | 2.11.2 | Framework desktop natif |
| React | 19.2.7 | Interface utilisateur |
| Rust | Edition 2021 | Backend HTTP + SQLite |
| actix-web | 4.13 | Serveur HTTP |
| rusqlite | 0.32 | Base de donnees SQLite |
| tokio | 1 | Runtime async |
| Vite | 6.4.3 | Build tool frontend |
| TypeScript | ~5.6.3 | Typage statique |

### Structure des fichiers cles

```
dashboard-app/app/
  index.html                           # Point d'entree HTML
  package.json                         # Dependances frontend
  vite.config.ts                       # Config Vite + plugin React
  tsconfig.json                        # Config TypeScript (JSX react-jsx)
  src/
    main.tsx                           # Point d'entree React
    App.tsx                            # Composant principal (tableau + suppressions)
  src-tauri/
    Cargo.toml                         # Dependances Rust (actix, rusqlite)
    tauri.conf.json                    # Config Tauri
    capabilities/default.json          # Permissions Tauri
    src/
      main.rs                          # Backend HTTP + SQLite + Tauri
      lib.rs                           # Placeholder
```

### Backend Rust : main.rs

Le backend combine **serveur HTTP** et **commandes Tauri** :

#### Base de donnees SQLite
```rust
fn init_db() -> Arc<Mutex<Connection>> {
    let conn = Connection::open("scans.db")?;
    conn.execute_batch("
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contenu TEXT NOT NULL,
            date_heure TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_scans_date ON scans(date_heure DESC);
    ")?;
    Arc::new(Mutex::new(conn))
}
```

#### Serveur HTTP (actix-web) sur port 8389
```rust
// POST /scan — Recoit un scan de la tablette
async fn route_post_scan(data, body) -> HttpResponse {
    let contenu = body.contenu.trim();
    let date_heure = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    data.lock()?.execute(
        "INSERT INTO scans (contenu, date_heure) VALUES (?1, ?2)",
        params![contenu, date_heure]
    )?;
    HttpResponse::Ok().json({"statut": "ok", "message": "..."})
}

// GET /scans — Liste tous les scans
async fn route_get_scans(data) -> HttpResponse { ... }

// DELETE /scan/{id} — Supprime un scan
async fn route_delete_scan(data, path) -> HttpResponse { ... }
```

#### Commandes Tauri (appelees depuis React)
- `lister_scans()` — Liste les 500 derniers scans
- `compter_aujourd_hui()` — Compte les scans du jour
- `compter_total()` — Compte tous les scans
- `supprimer_scan(id)` — Supprime un scan
- `supprimer_tout()` — Supprime tout
- `supprimer_aujourd_hui()` — Supprime les scans du jour
- `supprimer_precedents()` — Supprime les scans des jours precedents
- `forcer_focus()` — Force le focus de la fenetre OS

### Frontend React : App.tsx

Interface complete de gestion des scans :

```
+-----------------------------------------------+
|  Infirmerie - Mardi 4 juin 2026                |
|  [Vert] Serveur actif - port 8389              |
+-----------------------------------------------+
|  +-----------+  +-----------+                  |
|  |     5     |  |    127    |                  |
|  | Aujourd'  |  |   Total   |                  |
|  +-----------+  +-----------+                  |
+-----------------------------------------------+
|  [Supprimer des donnees]  [Actualiser]        |
+-----------------------------------------------+
|  Contenu    | Date       | Heure  | Action    |
|  DUPONT J.  | 04/06/2026 | 12:45  | Supprimer  |
|  MARTIN S.  | 04/06/2026 | 12:32  | Supprimer  |
|  DURAND L.  | 03/06/2026 | 14:21  | Supprimer  |
+-----------------------------------------------+
|  Niveau de securite : Maximum (Reseau Prive)  |
+-----------------------------------------------+
|  console [12]                                  |  <- Debug (pliable)
+-----------------------------------------------+
```

**Fonctionnement** :
- **Chargement initial** : `charger()` recupere les scans et compteurs
- **Auto-refresh** : Toutes les 5 secondes, le frontend rafraichit les donnees
- **Suppression individuelle** : Bouton "Supprimer" sur chaque ligne
- **Suppression en masse** : Modal avec 3 options (aujourd'hui, precedents, tout)
- **Console debug** : Pliable en bas, affiche les actions et erreurs

### Format de la base SQLite

**Table `scans`** :
| Colonne | Type | Description |
|---|---|---|
| id | INTEGER PRIMARY KEY | Auto-incremente |
| contenu | TEXT NOT NULL | Texte du scan (ex: "DUPONT Jean") |
| date_heure | TEXT NOT NULL | Horodatage (ex: "2026-06-04 12:45:10") |

**Fichier** : `scans.db` (cree automatiquement au lancement, mode WAL pour performance)

### Compilation et Installation
```bash
cd dashboard-app/app
pnpm install
pnpm tauri build

# Binaire genere :
# dashboard-app/app/src-tauri/target/release/app (Linux)
# dashboard-app/app/src-tauri/target/release/app.exe (Windows)

# Installation RPM (Linux) :
# dashboard-app/app/src-tauri/target/release/bundle/rpm/pont-saisie-desktop-0.1.0-1.x86_64.rpm
```

---

## Configuration du Reseau Prive

### Sur Windows (Point d'acces mobile)

1. **Parametres** → **Reseau et Internet** → **Point d'acces mobile**
2. Activer **Partager ma connexion Internet**
3. Configurer :
   - Nom : `Infirmerie`
   - Mot de passe : (optionnel)
   - Bande : `2.4 GHz`
4. L'IP du PC sera generalement `192.168.137.1`

### Sur Linux (nmcli)

```bash
# Creer un hotspot
nmcli device wifi hotspot ifname wlan0 ssid "Infirmerie" password "secret123"

# Voir l'IP
ip addr show wlan0
```

### Sur la tablette

1. **Parametres** → **Wi-Fi** → Se connecter au reseau `Infirmerie`
2. Ouvrir l'app `appCollege`
3. Cliquer sur le bouton PC → Entrer l'IP (ex: `192.168.137.1`)
4. Valider

---

## Etat Actuel du Developpement

### Fonctionnel
| Fonctionnalite | Tablet (Android) | PC (Tauri) |
|---|---|---|
| UI formulaire | Fait | Fait |
| Envoi HTTP | Fait | Fait |
| Reception HTTP | N/A | Fait |
| Stockage SQLite | N/A | Fait |
| Affichage scans | N/A | Fait |
| Suppression individuelle | N/A | Fait |
| Suppression en masse | N/A | Fait |
| Compteurs (jour/total) | N/A | Fait |
| Auto-refresh | N/A | Fait |
| Configuration IP | Fait | N/A |
| Test connexion | Fait | N/A |
| Console debug | N/A | Fait |
| Compilation | Fait | Fait |

### A faire
- Authentification par token (securite supplementaire)
- Export CSV/Excel des scans
- Graphiques statistiques
- Support multi-PC (plusieurs receveurs)
- Mode hors-ligne avec file d'attente sur tablette

---

## Commandes Utiles

### Compiler les deux apps
```bash
# App Android
cd appCollege/android && ./gradlew assembleDebug

# App Desktop
cd dashboard-app/app && pnpm tauri build
```

### Installer sur tablette
```bash
adb install -r appCollege/android/app/build/outputs/apk/debug/app-debug.apk
```

### Lancer l'app desktop (dev)
```bash
cd dashboard-app/app && pnpm tauri dev
```

### Tester le serveur HTTP manuellement
```bash
# Depuis le PC
curl http://localhost:8389/scans

# Depuis la tablette (ou autre appareil sur le meme reseau)
curl http://192.168.137.1:8389/scans

# Envoyer un scan de test
curl -X POST http://localhost:8389/scan \
  -H "Content-Type: application/json" \
  -d '{"contenu": "TEST Manuel"}'
```

### Voir les logs Android
```bash
adb logcat | grep -E "ReactNative|appCollege"
```

### Reinitialiser la base SQLite
```bash
rm dashboard-app/app/scans.db
# Le fichier sera recree au prochain lancement
```
