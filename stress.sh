#!/bin/bash
# stress.sh — Test de charge agressif pour le serveur
# Usage: bash stress.sh [port] [paralisme]
# Arret:  bash stress.sh kill

PORT=${1:-8389}
PARAL=${2:-20}
URL="http://localhost:$PORT"
PIDFILE="/tmp/stress-server-$PORT.pid"

# --- Kill propre ---
if [ "$1" = "kill" ]; then
  if [ -f "$PIDFILE" ]; then
    kill -- -$(cat "$PIDFILE") 2>/dev/null
    rm -f "$PIDFILE"
    echo "Stress tue."
  else
    echo "Aucun stress en cours (PID absent)."
    # Fallback : tuer tous les curl vers ce port
    pkill -f "curl.*localhost:$PORT" 2>/dev/null
    echo "Curl residuels tues."
  fi
  exit 0
fi

# Capturer Ctrl+C proprement
cleanup() {
  echo ""
  echo "Arret en cours..."
  kill -- -$$ 2>/dev/null
  rm -f "$PIDFILE"
  echo "Termine."
  exit 0
}
trap cleanup INT TERM

# Creer un groupe de processus pour kill facile
set -m
echo $$ > "$PIDFILE"

echo "=== Stress Test — $URL (paralisme: $PARAL) ==="
echo "PID: $$ — Pour arreter: bash stress.sh kill"
echo ""

# Verifier que le serveur est up
echo "[1/5] Verification du serveur..."
if curl -s --max-time 2 "$URL/health" > /dev/null 2>&1; then
  echo "  Serveur OK"
else
  echo "  Serveur injoignable sur le port $PORT"
  rm -f "$PIDFILE"
  exit 1
fi

# --- Test 1 : Scans massifs ---
echo ""
echo "[2/5] Envoi massif de 500 scans..."
for i in $(seq 1 500); do
  PAYLOAD=$(printf '{"contenu":"Crash %d %s","date_heure":"%s"}' "$i" "$(printf 'X%.0s' {1..1000})" "$(date -Iseconds)")
  curl -s -o /dev/null -X POST "$URL/scan" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" &

  if (( i % $PARAL == 0 )); then
    wait
    echo "  ... $i/500"
  fi
done
wait
echo "  Scans OK"

# --- Test 2 : Logs en rafale ---
echo ""
echo "[3/5] Envoi massif de 1000 logs..."
NIVEAUX=("error" "fatal" "warn" "debug" "info")
for i in $(seq 1 1000); do
  NIV="${NIVEAUX[$((i % 5))]}"
  PAYLOAD=$(printf '{"source":"StressTest","niveau":"%s","message":"Flood %d %s","date_heure":"%s"}' "$NIV" "$i" "$(printf 'Y%.0s' {1..500})" "$(date -Iseconds)")
  curl -s -o /dev/null -X POST "$URL/debug/log" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" &

  if (( i % $PARAL == 0 )); then
    wait
    echo "  ... $i/1000"
  fi
done
wait
echo "  Logs OK"

# --- Test 3 : Fuzzing ---
echo ""
echo "[4/5] Fuzzing — payloads corrompus..."
FUZZ=(
  ''
  '{}'
  '{"a":}'
  '{"contenu": null}'
  '<html>not json</html>'
  'null'
  'undefined'
  '[]'
  '{"source":"","message":""}'
)
for payload in "${FUZZ[@]}"; do
  curl -s -o /dev/null -X POST "$URL/scan" -H "Content-Type: application/json" -d "$payload" 2>/dev/null
  curl -s -o /dev/null -X POST "$URL/debug/log" -H "Content-Type: application/json" -d "$payload" 2>/dev/null
done
echo "  ${#FUZZ[@]} payloads testes"

# --- Test 4 : Verification ---
echo ""
echo "[5/5] Verification post-stress..."
sleep 1
HEALTH=$(curl -s --max-time 3 "$URL/health" 2>/dev/null)
if echo "$HEALTH" | python3 -m json.tool > /dev/null 2>&1; then
  echo "  Serveur vivant !"
  echo "  $HEALTH" | python3 -m json.tool 2>/dev/null
else
  echo "  !!! SERVEUR DOWN !!!"
fi

rm -f "$PIDFILE"
echo ""
echo "=== Termine ==="
