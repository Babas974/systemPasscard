# Guide d'installation - Pont de Saisie Securise

> Application de saisie pour l'infirmerie d'un college : une tablette Android envoie
> les passages via HTTP, un PC les recoit et les stocke dans SQLite. **100% natif, aucun serveur externe.**

---

## Table des matieres

1. [Architecture](#architecture)
2. [Installation Windows (Tauri + hotspot integre)](#installation-windows-tauri--hotspot-integre)
3. [Installation Fedora (Tauri + hotspot nmcli)](#installation-fedora-tauri--hotspot-nmcli)
4. [Configuration du point d'acces](#configuration-du-point-dacces)
5. [Compilation de l'app Android (APK)](#compilation-de-lapp-android-apk)
6. [Tests avec curl](#tests-avec-curl)
7. [Endpoints HTTP](#endpoints-http)
8. [Troubleshooting](#troubleshooting)

---

## Architecture

```
+----------------------+      Wi-Fi prive       +-----------------------+
|   TABLETTE ANDROID   |   <----------------->   |   PC (Windows/Linux)  |
|                      |       HTTP :8080        |                       |
|  appCollege          |                         |  App native Tauri     |
|  (React Native)      |   POST /scan            |  + serveur HTTP       |
|                      |   GET  /scans           |  + SQLite (scans.db)  |
|  Saisie Nom/Prenom   |   DELETE /scan/{id}     |                       |
+----------------------+                         +-----------------------+
```

- **Tablette** : app native Android (.apk)
- **PC** : application native Tauri (compilée en .exe / .rpm / .AppImage)
- **Aucun serveur externe** : tout est embarque dans l'app PC
- **Aucun acces Internet** : tout transite par le reseau prive cree par le PC

---

## Installation Windows (Tauri + hotspot integre)

### Prerequis

| Logiciel | Version recommandee |
|---|---|
| Windows | 10 / 11 |
| [Rust](https://rustup.rs) | stable (>= 1.80) |
| [Node.js](https://nodejs.org) | >= 22 |
| [pnpm](https://pnpm.io) | >= 9 |
| WebView2 | preinstalle sur Windows 10/11 |
| Visual Studio Build Tools | 2022 avec "Desktop C++" |

### Etapes

```powershell
# 1. Cloner / telecharger le projet
cd C:\projets
git clone <repo> pont-saisie
cd pont-saisie\app-nouvelle-version

# 2. Installer les dependances frontend
cd dashboard-app\app
pnpm install

# 3. Compiler en mode release (genere .msi + .exe)
pnpm tauri build

# 4. Installer le .msi genere
#    -> dashboard-app\app\src-tauri\target\release\bundle\msi\pont-saisie-desktop_*.msi
```

Le binaire executable est dans :
```
dashboard-app\app\src-tauri\target\release\app.exe
```

Double-cliquer sur `app.exe` : la fenetre s'ouvre et le serveur HTTP demarre automatiquement sur le port 8080.

---

## Installation Fedora (Tauri + hotspot nmcli)

### Prerequis

```bash
sudo dnf install -y rust cargo nodejs npm webkit2gtk4.1-devel \
    openssl-devel curl wget

# pnpm
npm install -g pnpm@9

# Toolchain de compilation
sudo dnf groupinstall -y "Development Tools" "C Development Tools and Libraries"
```

### Etapes

```bash
git clone <repo> pont-saisie
cd pont-saisie/app-nouvelle-version

cd dashboard-app/app
pnpm install
pnpm tauri build          # produit .rpm + .AppImage + binaire

# Installation via le RPM
sudo dnf install ./src-tauri/target/release/bundle/rpm/pont-saisie-desktop-*.x86_64.rpm
```

Le binaire est : `dashboard-app/app/src-tauri/target/release/app`

---

## Configuration du point d'acces

### Windows (parametres)

1. **Parametres** → **Reseau et Internet** → **Point d'acces mobile**
2. Activer **Partager ma connexion Internet**
3. Configurer :
   - Nom : `Infirmerie`
   - Mot de passe : 8 caracteres min (ex. `infirmerie2026`)
   - Bande : `2.4 GHz` (meilleure portee)
4. L'IP du PC sera generalement `192.168.137.1`

Alternative en ligne de commande (admin) :
```cmd
netsh wlan set hostednetwork mode=allow ssid=Infirmerie key=infirmerie2026
netsh wlan start hostednetwork
```

### Fedora / Linux (NetworkManager)

```bash
# Lister les interfaces Wi-Fi
nmcli device status

# Creer le hotspot
nmcli device wifi hotspot ifname wlan0 ssid Infirmerie password infirmerie2026

# Voir l'IP
ip -4 addr show wlan0
#   -> typiquement 10.42.0.1

# Verifier
nmcli connection show --active
```

### macOS

1. **Preferences systeme** → **Partage**
2. Cocher **Partage Internet**
3. Partager la connexion depuis : Ethernet
4. Vers : Wi-Fi
5. **Options Wi-Fi** : definir nom et mot de passe
6. IP generale : `192.168.2.1`

### Tablette Android

1. **Parametres** → **Wi-Fi**
2. Se connecter au reseau `Infirmerie` (mot de passe defini ci-dessus)
3. Ouvrir l'app `appCollege`
4. Bouton **"Choisir le PC"** → entrer l'IP affichee par le PC (ex. `192.168.137.1`)
5. Valider

L'indicateur de l'app passe au vert "PC connecte".

---

## Compilation de l'app Android (APK)

### Prerequis

- JDK 17 (`apt install openjdk-17-jdk` ou via Android Studio)
- Android SDK (installation via Android Studio recommandee)
- Variable d'environnement `ANDROID_HOME` pointant vers le SDK

### Build

```bash
cd app-nouvelle-version/appCollege
pnpm install            # ou npm install

cd android
./gradlew assembleDebug
# APK genere : android/app/build/outputs/apk/debug/app-debug.apk
```

### Installation sur tablette

```bash
# Via ADB (tablette connectee en USB avec debug active)
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Plusieurs tablettes
adb devices
adb -s <serial> install -r app-debug.apk
```

---

## Tests avec curl

> **Important** : `curl` permet de tester le serveur HTTP embarque dans l'app Tauri **sans tablette**. Pratique pour valider l'installation.

### Verifier la sante du serveur

```bash
curl http://192.168.137.1:8080/health
# {"statut":"ok",...}
```

### Lister les scans

```bash
curl http://192.168.137.1:8080/scans | jq
```

### Envoyer un scan de test

```bash
curl -X POST http://192.168.137.1:8080/scan \
  -H "Content-Type: application/json" \
  -d '{"contenu": "DUPONT Jean"}'
# {"statut":"ok","message":"Scan enregistre: DUPONT Jean"}
```

### Supprimer un scan

```bash
curl -X DELETE http://192.168.137.1:8080/scan/5
# {"statut":"ok"}
```

### Inserer 20 scans de test (seed)

```bash
curl -X POST http://192.168.137.1:8080/seed
# {"statut":"ok","inseres":20}
```

### Verifier l'app desktop

Apres lancement, ouvrir l'app Tauri : les scans apparaissent dans le tableau et les compteurs (Aujourd'hui / Total) sont mis a jour automatiquement toutes les 5 secondes.

---

## Endpoints HTTP

| Methode | Chemin            | Corps / Param                | Reponse |
|---------|-------------------|------------------------------|---------|
| GET     | `/health`         | -                            | `{"statut":"ok",...}` |
| POST    | `/scan`           | `{"contenu": "NOM Prenom"}`  | `{"statut":"ok",...}` |
| GET     | `/scans`          | -                            | `[{id, contenu, date_heure}, ...]` (max 500) |
| DELETE  | `/scan/{id}`      | -                            | `{"statut":"ok"}` |
| POST    | `/seed`           | -                            | `{"statut":"ok","inseres":N}` |

---

## Troubleshooting

### La tablette ne voit pas le PC

- Verifier que le hotspot est bien actif sur le PC
- Verifier que la tablette est bien connectee au reseau `Infirmerie`
- Verifier que le pare-feu Windows / Linux n'bloque pas le port 8080 :
  - Windows : `netsh advfirewall firewall add rule name="Pont Saisie 8080" dir=in action=allow protocol=TCP localport=8080`
  - Fedora : `sudo firewall-cmd --permanent --add-port=8080/tcp && sudo firewall-cmd --reload`
- Tester depuis le PC : `curl http://localhost:8080/health`

### L'app Tauri ne compile pas (Linux)

```bash
# Erreur liee a webkit2gtk
sudo dnf install webkit2gtk4.1-devel libsoup3-devel \
  javascriptcoregtk4.1-devel libgtk-3-devel
```

### Le serveur HTTP ne demarre pas : port 8080 occupe

```bash
# Identifier le processus
# Linux / Fedora
sudo lsof -i :8080
sudo ss -tlnp | grep 8080

# Windows
netstat -ano | findstr :8080
taskkill /PID <pid> /F
```

Fermer l'application qui occupe le port, ou bien changer la configuration interne du projet (variable d'environnement `PORT` au lancement).

### Les scans ne s'affichent pas dans l'app Tauri

- Verifier que le fichier `scans.db` est cree au lancement
- Cliquer sur **Actualiser** dans l'app
- Verifier l'heure systeme : les scans sont filtres par date locale
- En dernier recours : supprimer le fichier `scans.db` et redemarrer l'app (la base sera recreee vide)

### `pnpm tauri build` echoue sur un appareil avec peu de RAM

Le compilateur Rust utilise beaucoup de memoire. Solutions :
- Fermer les applications lourdes
- Compiler en debug puis release separement
- Utiliser `sccache` pour le cache de compilation

```bash
cargo install sccache
export RUSTC_WRAPPER=sccache
```

### Tests Rust : `cargo test` bloque

Si `cargo test` reste bloque sur le build initial :
- Verifier la connexion Internet (telechargement des crates)
- Reessayer apres quelques minutes (crates.io peut etre lent)
- Configurer un mirror : `~/.cargo/config.toml`
  ```toml
  [source.crates-io]
  replace-with = "tuna"
  [source.tuna]
  registry = "sparse+https://mirrors.tunghua.edu.cn/crates.io-index/"
  ```

---

## Scripts utiles

A la racine du projet :

| Script           | Description |
|------------------|-------------|
| `start-all.sh`   | Demarre l'app desktop, detecte l'IP, affiche les instructions hotspot |
| `build-all.sh`   | Compile l'app Tauri + l'APK Android, affiche les chemins des artefacts |

Tests :
```bash
# Tests Rust
cd dashboard-app/app/src-tauri
cargo test --lib

# Tests React (Vitest)
cd dashboard-app/app
pnpm test

# Build complet + tests
./build-all.sh
```
