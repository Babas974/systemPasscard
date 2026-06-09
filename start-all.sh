#!/usr/bin/env bash
# start-all.sh
# Script de demarrage complet :
#   - detecte (ou demande) l'IP du PC
#   - affiche les instructions pour le point d'acces mobile
#   - lance l'app desktop Tauri en arriere-plan
#   - affiche l'IP a utiliser dans la tablette
#
# Compatible bash >=4 et zsh.

set -euo pipefail

# -- Detection OS ---------------------------------------------------------
detect_os() {
    case "$(uname -s 2>/dev/null || echo Windows)" in
        Linux*)   echo "linux" ;;
        Darwin*)  echo "macos" ;;
        MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
        *)        echo "unknown" ;;
    esac
}

# -- Detection IP --------------------------------------------------------
detect_ip() {
    local os="$1"
    case "$os" in
        linux)
            # Premier IPv4 non-loopback
            ip -4 -o addr show 2>/dev/null \
                | awk '{print $4}' \
                | cut -d/ -f1 \
                | grep -v '^127\.' \
                | head -1 || true
            ;;
        macos)
            ifconfig 2>/dev/null \
                | awk '/inet /{print $2}' \
                | grep -v '^127\.' \
                | head -1 || true
            ;;
        windows)
            # ipconfig contient des entetes localises FR/EN
            ipconfig 2>/dev/null \
                | grep -Eo '([0-9]{1,3}\.){3}[0-9]{1,3}' \
                | grep -v '^127\.' \
                | grep -v '^0\.' \
                | head -1 || true
            ;;
    esac
}

# -- Affichage instructions hotspot -------------------------------------
print_hotspot_instructions() {
    local os="$1"
    echo "============================================================"
    echo "  CONFIGURATION DU POINT D'ACCES MOBILE"
    echo "============================================================"
    case "$os" in
        linux)
            cat <<'EOF'
  Sur Fedora / NetworkManager :

    # Verifier que NetworkManager est actif
    systemctl status NetworkManager

    # Creer un hotspot Wi-Fi (remplacer wlan0 par ton interface)
    nmcli device wifi hotspot ifname wlan0 ssid Infirmerie password infirmerie2026

    # Voir l'IP attribuee
    ip -4 addr show wlan0

  L'IP du PC sera generalement  10.42.0.1
EOF
            ;;
        macos)
            cat <<'EOF'
  Sur macOS :
    1. Preferences systeme -> Partage
    2. Cocher "Partage Internet"
    3. Source : Ethernet (ou autre), Vers : Wi-Fi
    4. Options Wi-Fi -> definir nom et mot de passe

  L'IP du PC sera generalement  192.168.2.1
EOF
            ;;
        windows)
            cat <<'EOF'
  Sur Windows :
    1. Parametres -> Reseau et Internet -> Point d'acces mobile
    2. Activer "Partager ma connexion Internet"
    3. Nom du reseau : Infirmerie
    4. Mot de passe : (8 caracteres minimum recommande)

  OU en ligne de commande (admin) :
    netsh wlan set hostednetwork mode=allow ssid=Infirmerie key=infirmerie2026
    netsh wlan start hostednetwork

  L'IP du PC sera generalement  192.168.137.1
EOF
            ;;
        *)
            echo "  OS non reconnu : configure le hotspot manuellement."
            ;;
    esac
    echo "============================================================"
}

# -- Programme principal -------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
cd "$SCRIPT_DIR"

OS=$(detect_os)
DETECTED_IP=$(detect_ip "$OS")

echo ""
echo "============================================================"
echo "  PONT DE SAISIE - Demarrage"
echo "============================================================"
echo ""

if [ -n "$DETECTED_IP" ]; then
    echo "IP detectee automatiquement : $DETECTED_IP"
    printf "Appuie sur Entree pour utiliser cette IP, ou tape une autre IP : "
    read -r USER_IP
    if [ -n "$USER_IP" ]; then
        IP="$USER_IP"
    else
        IP="$DETECTED_IP"
    fi
else
    echo "Impossible de detecter l'IP automatiquement."
    printf "Entre l'IP du PC (ex : 192.168.137.1) : "
    read -r IP
fi

if [ -z "${IP:-}" ]; then
    echo "ERREUR : aucune IP fournie. Abandon." >&2
    exit 1
fi

echo ""
print_hotspot_instructions "$OS"
echo ""
printf "Appuie sur Entree quand le point d'acces est active et la tablette connectee... "
read -r _

echo ""
echo "============================================================"
echo "  TABLETTE : utiliser l'IP  $IP  (port 8389)"
echo "  Endpoint health :  http://$IP:8389/health"
echo "============================================================"
echo ""

# -- Lancement de l'app desktop en arriere-plan -------------------------
DASHBOARD_DIR="$SCRIPT_DIR/dashboard-app/app"

if [ ! -d "$DASHBOARD_DIR" ]; then
    echo "ERREUR : dossier introuvable : $DASHBOARD_DIR" >&2
    exit 1
fi

cd "$DASHBOARD_DIR"

if [ ! -d "node_modules" ]; then
    echo "Installation des dependances Node (pnpm install)..."
    if command -v pnpm >/dev/null 2>&1; then
        pnpm install
    elif command -v npm >/dev/null 2>&1; then
        npm install
    else
        echo "ERREUR : ni pnpm ni npm trouve." >&2
        exit 1
    fi
fi

LOG_FILE="$DASHBOARD_DIR/app.log"
PID_FILE="$DASHBOARD_DIR/.app.pid"

echo "Demarrage de l'app desktop en arriere-plan..."
echo "  Logs : $LOG_FILE"
echo ""

# Nettoyage d'un eventuel PID obsolete
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE" 2>/dev/null || true)
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
        echo "Un processus existe deja (PID $OLD_PID). Arret..."
        kill "$OLD_PID" 2>/dev/null || true
        sleep 1
    fi
    rm -f "$PID_FILE"
fi

case "$OS" in
    windows)
        # cmd.exe start /B lance en arriere-plan ; redirige les logs
        cmd.exe //c "start /B pnpm tauri dev > app.log 2>&1" >/dev/null 2>&1 || \
            nohup pnpm tauri dev > "$LOG_FILE" 2>&1 &
        ;;
    *)
        nohup pnpm tauri dev > "$LOG_FILE" 2>&1 &
        echo $! > "$PID_FILE"
        ;;
esac

# Petit delai pour laisser le serveur demarrer
sleep 3

# Verification rapide
if command -v curl >/dev/null 2>&1; then
    if curl -fsS "http://localhost:8389/health" >/dev/null 2>&1; then
        echo "Serveur HTTP joignable sur http://localhost:8389"
    else
        echo "ATTENTION : le serveur HTTP ne repond pas encore. Verifie les logs :"
        echo "  tail -f $LOG_FILE"
    fi
fi

echo ""
echo "Pour arreter :"
case "$OS" in
    windows) echo "  - Ferme la fenetre Tauri, ou : taskkill /F /IM app.exe" ;;
    *)
        if [ -f "$PID_FILE" ]; then
            echo "  kill \$(cat $PID_FILE)"
        else
            echo "  - Ferme la fenetre Tauri, ou pkill -f 'tauri dev'"
        fi
        ;;
esac
echo ""
echo "Tu peux maintenant ouvrir l'app sur la tablette avec l'IP : $IP"
