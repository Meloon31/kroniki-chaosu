#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

MSG="${1:-Aktualizacja Kroniki Chaosu ($(date '+%Y-%m-%d %H:%M'))}"

echo "================================================="
echo "  KRONIKI CHAOSU — PUBLIKACJA AKTUALIZACJI LIVE"
echo "================================================="

echo "[1/2] Budowanie nowej wersji i generowanie version.json..."
npm run build

echo ""
echo "✓ Nowa wersja zbudowana! Wszyscy gracze podłączeni do tego serwera"
echo "  zobaczą w ciągu 5 sekund baner '✨ NOWA AKTUALIZACJA GRY DOSTĘPNA!'."

if git rev-parse --is-inside-work-tree >/dev/null 2>&1 && git remote get-url origin >/dev/null 2>&1; then
  echo ""
  echo "[2/2] Wykryto repozytorium Git — wysyłam zmiany do GitHub (Auto-Deploy Render/Railway)..."
  git add -A
  if ! git diff --cached --quiet; then
    git commit -m "$MSG"
    git push
    echo "✓ Wysłano! Render.com / Railway automatycznie zaktualizuje grę dla wszystkich znajomych."
  else
    echo "• Brak nowych zmian do wysłania w Git."
  fi
else
  echo ""
  echo "[2/2] Tryb lokalny (brak zdalnego repo Git)."
  echo "  • Jeśli udostępniasz przez './share.sh' lub Wi-Fi, gracze już widzą powiadomienie o aktualizacji."
  echo "  • Aby włączyć automatyczny deploy 24/7 w chmurze, podłącz GitHub + Render.com (zobacz UDOSTEPNIANIE.md)."
fi
