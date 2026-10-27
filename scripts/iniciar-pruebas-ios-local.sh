#!/usr/bin/env bash
set -euo pipefail

mobile_path="${1:-}"
mac_ip="${2:-}"
backend_path="$(cd "$(dirname "$0")/.." && pwd)"

if [[ "$(uname)" != "Darwin" ]]; then
  echo "Este script debe ejecutarse en un Mac."
  exit 1
fi

if [[ -z "$mobile_path" || ! -d "$mobile_path" ]]; then
  echo "Uso: bash scripts/iniciar-pruebas-ios-local.sh /ruta/a/obd-mobile-app [IP_DEL_MAC]"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Falta Docker Desktop. Instálalo y ábrelo antes de ejecutar este script."
  exit 1
fi

if ! command -v flutter >/dev/null 2>&1; then
  echo "Falta Flutter. Instálalo junto con Xcode y vuelve a ejecutar este script."
  exit 1
fi

if [[ ! -f "$backend_path/.env.docker" ]]; then
  echo "Falta .env.docker. Copia .env.docker.example como .env.docker y configura solo el secreto local."
  exit 1
fi

if [[ -z "$mac_ip" ]]; then
  default_interface="$(route -n get default 2>/dev/null | awk '/interface:/{print $2; exit}')"
  if [[ -n "$default_interface" ]]; then
    mac_ip="$(ipconfig getifaddr "$default_interface" 2>/dev/null || true)"
  fi
fi

if [[ -z "$mac_ip" ]]; then
  echo "No se pudo detectar la IP local del Mac. Indícala como segundo argumento."
  echo "Ejemplo: bash scripts/iniciar-pruebas-ios-local.sh /ruta/a/obd-mobile-app 192.168.1.20"
  exit 1
fi

cd "$backend_path"
API_HOST_BINDING=0.0.0.0 docker compose --env-file .env.docker -f compose.local.yaml up --build --detach

health_url="http://127.0.0.1:8081/health"
for attempt in {1..20}; do
  if curl --fail --silent "$health_url" >/dev/null; then
    break
  fi

  if [[ "$attempt" == "20" ]]; then
    echo "El backend Docker no respondió. Revisa: docker compose -f compose.local.yaml logs api"
    exit 1
  fi

  sleep 1
done

echo "Backend local listo en http://$mac_ip:8081"
echo "Verifica que el iPhone y el Mac estén en la misma red Wi-Fi y permite el puerto 8081 si macOS pregunta por el firewall."

cd "$mobile_path"
flutter pub get
flutter run \
  --dart-define=APP_ENV=development \
  --dart-define=API_BASE_URL="http://$mac_ip:8081"
