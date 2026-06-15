#!/bin/bash
# stress.sh — Test de charge agressif pour le serveur + app Android
# Lance avec: bash stress.sh [port]

PORT=${1:-8389}
URL="http://localhost:$PORT"
RAPPORT=0
ECHECS=0

echo "=== Stress Test — $URL ==="
echo ""

# Verifier que le serveur est up
echo "[1/5] Verification du serveur..."
if curl -s --max-time 2 "$URL/health" > /dev/null 2>&1; then
  echo "  Serveur OK"
else
  echo "  Serveur injoignable sur le port $PORT"
  exit 1
fi

# --- Test 1 : Envois massifs de scans ---
echo ""
echo "[2/5] Envoi massif de 500 scans (50 en parallele)..."
for i in $(seq 1 500); do
  PAYLOAD=$(printf '{"contenu":"Crash %d %s"}' "$i" "$(printf 'X%.0s' {1..1000})")
  curl -s -o /dev/null -w "%{http_code}" -X POST "$URL/scan" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" &

  # Limiter a 50 en parallele
  if (( i % 50 == 0 )); then
    wait
    echo "  ... $i/500 envoyes"
  fi
done
wait
echo "  Scans termines"

# --- Test 2 : Logs en rafale ---
echo ""
echo "[3/5] Envoi massif de 1000 logs (error/fatal/warn/debug/info)..."
NIVEAUX=("error" "fatal" "warn" "debug" "info")
for i in $(seq 1 1000); do
  NIV="${NIVEAUX[$((i % 5))]}"
  PAYLOAD=$(printf '{"source":"StressTest","niveau":"%s","message":"Flood %d %s"}' "$NIV" "$i" "$(printf 'Y%.0s' {1..500})")
  curl -s -o /dev/null -X POST "$URL/debug/log" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" &

  if (( i % 100 == 0 )); then
    wait
    echo "  ... $i/1000 envoyes"
  fi
done
wait
echo "  Logs termines"

# --- Test 3 : JSON corrompu / fuzzing ---
echo ""
echo "[4/5] Fuzzing — payloads corrompus..."
FUZZ_PAYLOADS=(
  ''
  '{}'
  '{"a":}'
  '{"contenu": null}'
  '{"contenu": 12345}'
  '{"contenu": "'$(printf '\xff\xfe%.0s' {1..100})'"}'
  '{"contenu":"'$(printf 'A%.0s' {1..50000})'"}'
  '<html><body>not json</body></html>'
  '{"contenu":"ok","extra":'$(printf '[1,2,3,'%.0s {1..100})'1]}'
  'null'
  'undefined'
  '[]'
  '{"source":"","message":""}'
  '{"niveau":"INJECTED\",\"message\":\"--DROP TABLE scans;--"}'
)

for payload in "${FUZZ_PAYLOADS[@]}"; do
  curl -s -o /dev/null -X POST "$URL/scan" \
    -H "Content-Type: application/json" \
    -d "$payload" 2>/dev/null
  curl -s -o /dev/null -X POST "$URL/debug/log" \
    -H "Content-Type: application/json" \
    -d "$payload" 2>/dev/null
done
echo "  ${#FUZZ_PAYLOADS[@]} payloads testes"

# --- Test 4 : Verification post-stress ---
echo ""
echo "[5/5] Verification post-stress..."
sleep 1
HEALTH=$(curl -s --max-time 3 "$URL/health" 2>/dev/null)
if echo "$HEALTH" | python3 -m json.tool > /dev/null 2>&1; then
  echo "  Serveur toujours vivant !"
  echo "  $HEALTH" | python3 -m json.tool 2>/dev/null
else
  echo "  !!! SERVEUR DOWN !!!"
  exit 1
fi

echo ""
echo "=== Termine ==="
