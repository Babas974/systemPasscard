#!/usr/bin/env bash
# build-all.sh
# Compile l'app Android (APK) puis l'app desktop Tauri (Linux + Windows possible)
# et affiche les chemins des binaires generes.
#
# Compatible bash >=4 et zsh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
cd "$SCRIPT_DIR"

DASHBOARD_DIR="$SCRIPT_DIR/dashboard-app/app"
ANDROID_DIR="$SCRIPT_DIR/appCollege/android"

# Couleurs
G='\033[0;32m'
Y='\033[1;33m'
R='\033[0;31m'
B='\033[0;34m'
N='\033[0m'

log()  { printf "${B}[build-all]${N} %s\n" "$*"; }
ok()   { printf "${G}[build-all] OK${N}  %s\n" "$*"; }
warn() { printf "${Y}[build-all] WARN${N} %s\n" "$*"; }
err()  { printf "${R}[build-all] ERR${N}  %s\n" "$*" >&2; }

require_cmd() {
    if ! command -v "$1" >/dev/null 2>&1; then
        err "$1 introuvable dans le PATH. Installe-le puis reessaie."
        exit 1
    fi
}

# -- Verification rapide ------------------------------------------------
log "Verification des prerequis..."
require_cmd node
require_cmd cargo
require_cmd rustc

HAS_PNPM=false
HAS_NPM=false
if command -v pnpm >/dev/null 2>&1; then HAS_PNPM=true; fi
if command -v npm  >/dev/null 2>&1; then HAS_NPM=true;  fi
if [ "$HAS_PNPM" = false ] && [ "$HAS_NPM" = false ]; then
    err "ni pnpm ni npm trouve."
    exit 1
fi
PKM="pnpm"
[ "$HAS_PNPM" = false ] && PKM="npm"
log "Gestionnaire de paquets : $PKM"

# Java/Android
if [ -d "$ANDROID_DIR" ]; then
    if ! command -v java >/dev/null 2>&1; then
        warn "Java n'est pas dans le PATH. La compilation Android va surement echouer."
    fi
fi

# -- 1. Build app desktop ------------------------------------------------
echo ""
log "========== 1/2 APP DESKTOP (Tauri) =========="
if [ ! -d "$DASHBOARD_DIR" ]; then
    err "Dossier introuvable : $DASHBOARD_DIR"
    exit 1
fi

cd "$DASHBOARD_DIR"

if [ ! -d "node_modules" ]; then
    log "Installation des dependances frontend..."
    $PKM install
fi

log "Compilation Tauri (cela peut prendre plusieurs minutes)..."
$PKM tauri build 2>&1 | tail -40 || {
    err "La compilation Tauri a echoue."
    exit 1
}

# Detection des artefacts
log "Recherche des artefacts..."
DESKTOP_BIN=$(find src-tauri/target/release -maxdepth 1 -type f \( -name "app" -o -name "app.exe" \) 2>/dev/null | head -1)
DESKTOP_BUNDLES=$(find src-tauri/target/release/bundle -mindepth 2 -maxdepth 2 -type f 2>/dev/null | grep -E '\.(rpm|deb|msi|appimage|dmg)$' || true)

# -- 2. Build app Android -----------------------------------------------
echo ""
log "========== 2/2 APP ANDROID =========="
cd "$SCRIPT_DIR"

ANDROID_APK=""
if [ -d "$ANDROID_DIR" ]; then
    cd "$ANDROID_DIR"

    if [ ! -d "node_modules" ] && [ -f "../package.json" ]; then
        log "Installation des dependances appCollege..."
        cd ..
        $PKM install
        cd "$ANDROID_DIR"
    fi

    log "Compilation Gradle (./gradlew assembleDebug)..."
    if [ -x "./gradlew" ]; then
        ./gradlew assembleDebug 2>&1 | tail -30 || {
            warn "La compilation Android a echoue (voir sortie ci-dessus)."
        }
    else
        warn "gradlew non executable. Lance : chmod +x $ANDROID_DIR/gradlew"
    fi

    ANDROID_APK=$(find app/build/outputs/apk -name "*.apk" 2>/dev/null | head -1 || true)
else
    warn "Dossier Android introuvable : $ANDROID_DIR"
fi

# -- Resume --------------------------------------------------------------
echo ""
echo "============================================================"
echo "  RESUME DES ARTEFACTS"
echo "============================================================"

if [ -n "$DESKTOP_BIN" ]; then
    ok "Binaire desktop  : $DASHBOARD_DIR/$DESKTOP_BIN"
    ls -lh "$DASHBOARD_DIR/$DESKTOP_BIN" 2>/dev/null | awk '{print "                taille: "$5}'
else
    warn "Binaire desktop introuvable (verifie les logs Tauri)."
fi

if [ -n "$DESKTOP_BUNDLES" ]; then
    ok "Bundles d'installation :"
    echo "$DESKTOP_BUNDLES" | while read -r f; do
        echo "                $f"
    done
else
    warn "Aucun bundle d'installation trouve."
fi

if [ -n "$ANDROID_APK" ]; then
    ok "APK Android      : $ANDROID_DIR/$ANDROID_APK"
    ls -lh "$ANDROID_DIR/$ANDROID_APK" 2>/dev/null | awk '{print "                taille: "$5}'
    echo ""
    echo "  Installation : adb install -r $ANDROID_DIR/$ANDROID_APK"
else
    warn "APK Android introuvable (la compilation Gradle a peut-etre echoue)."
fi

echo "============================================================"
echo "  Build termine."
echo "============================================================"
