[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$MobilePath
)

$backendPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$dockerEnvPath = Join-Path $backendPath ".env.docker"

if (-not (Test-Path -LiteralPath $dockerEnvPath)) {
  throw "Falta .env.docker. Copia .env.docker.example como .env.docker y configura solo el secreto local."
}

if (-not (Test-Path -LiteralPath $MobilePath)) {
  throw "No se encontró el proyecto móvil en: $MobilePath"
}

Push-Location $backendPath
try {
  docker compose --env-file .env.docker -f compose.local.yaml up --build --detach

  $healthUrl = "http://127.0.0.1:8081/health"
  $isHealthy = $false
  for ($attempt = 1; $attempt -le 20; $attempt += 1) {
    try {
      $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
      if ($health.status -eq "ok") {
        $isHealthy = $true
        break
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  if (-not $isHealthy) {
    throw "El backend Docker no respondió en $healthUrl. Revisa: docker compose -f compose.local.yaml logs api"
  }
} finally {
  Pop-Location
}

$connectedDevice = adb devices | Select-String "`tdevice$"
if (-not $connectedDevice) {
  throw "No hay un celular Android autorizado. Activa depuración USB y acepta la autorización en el teléfono."
}

adb reverse tcp:8081 tcp:8081

Push-Location (Resolve-Path $MobilePath)
try {
  flutter run --dart-define=APP_ENV=development --dart-define=API_BASE_URL=http://127.0.0.1:8081
} finally {
  Pop-Location
}
