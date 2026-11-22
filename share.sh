#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PORT="${PORT:-3001}"

echo "=========================================="
echo "  KRONIKI CHAOSU — UDOSTĘPNIANIE ONLINE"
echo "=========================================="

if [ ! -d "dist" ] || [ ! -d "dist-server" ]; then
  echo "[1/3] Budowanie projektu..."
  npm run build
fi

# Start server if port is not already listening
if ! lsof -i :"$PORT" >/dev/null 2>&1; then
  echo "[2/3] Uruchamianie serwera gry na porcie $PORT..."
  PORT="$PORT" node dist-server/server/index.js &
  SERVER_PID=$!
  trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
  sleep 2
else
  echo "[2/3] Serwer już działa na porcie $PORT."
fi

echo "[3/3] Tworzenie publicznego linku HTTPS dla znajomych..."
echo ""

if command -v cloudflared >/dev/null 2>&1; then
  echo "Używam Cloudflare Quick Tunnel (bez konta, pełne WebSockets)!"
  echo "Skopiuj wygenerowany adres https://....trycloudflare.com i wyślij znajomym!"
  echo "W grze kliknij '🔗 KOPIUJ LINK DLA ZNAJOMYCH', aby wysłać bezpośrednie zaproszenie do pokoju."
  echo ""
  cloudflared tunnel --url "http://localhost:$PORT"
else
  echo "Wskazówka: zainstaluj 'brew install cloudflared' dla jeszcze szybszego tunelu bez ekranu potwierdzenia."
  echo "Uruchamiam darmowy tunel przez npx localtunnel..."
  echo ""
  npx --yes localtunnel --port "$PORT"
fi
