[CmdletBinding()]
param(
  [string]$FlutterPath = "C:\src\flutter",
  [switch]$SkipSoftwareInstall
)

$ErrorActionPreference = "Stop"

function Get-ExecutablePath {
  param([string]$CommandName, [string[]]$FallbackPaths = @())

  $command = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  foreach ($fallbackPath in $FallbackPaths) {
    if (Test-Path -LiteralPath $fallbackPath) {
      return $fallbackPath
    }
  }

  return $null
}

function Install-WithWinget {
  param([string]$PackageId, [string]$DisplayName)

  Write-Host "Instalando o comprobando $DisplayName..." -ForegroundColor Cyan
  & winget install --id $PackageId --exact --silent --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo instalar $DisplayName. Revisa la conexión a internet o ejecuta PowerShell como administrador."
  }
}

if ($env:OS -ne "Windows_NT") {
  throw "Este preparador funciona solamente en Windows."
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  throw "Falta winget. Actualiza App Installer desde Microsoft Store y vuelve a ejecutar este archivo."
}

if (-not $SkipSoftwareInstall) {
  Install-WithWinget -PackageId "Git.Git" -DisplayName "Git"
  Install-WithWinget -PackageId "Docker.DockerDesktop" -DisplayName "Docker Desktop"
  Install-WithWinget -PackageId "Google.AndroidStudio" -DisplayName "Android Studio"
}

$gitPath = Get-ExecutablePath -CommandName "git.exe" -FallbackPaths @(
  (Join-Path $env:ProgramFiles "Git\cmd\git.exe"),
  (Join-Path ${env:ProgramFiles(x86)} "Git\cmd\git.exe")
)
if (-not $gitPath) {
  throw "No se encontró Git. Cierra y abre PowerShell, o vuelve a ejecutar el preparador."
}

$flutterExecutable = Join-Path $FlutterPath "bin\flutter.bat"
if (-not (Test-Path -LiteralPath $flutterExecutable)) {
  Write-Host "Descargando Flutter estable en $FlutterPath..." -ForegroundColor Cyan
  $flutterParent = Split-Path -Parent $FlutterPath
  New-Item -ItemType Directory -Force $flutterParent | Out-Null
  & $gitPath clone --branch stable --depth 1 https://github.com/flutter/flutter.git $FlutterPath
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo descargar Flutter. Revisa la conexión a internet y vuelve a ejecutar el preparador."
  }
}

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$flutterBin = Join-Path $FlutterPath "bin"
if ($userPath -notlike "*$flutterBin*") {
  [Environment]::SetEnvironmentVariable("Path", "$flutterBin;$userPath", "User")
}
$env:Path = "$flutterBin;$env:Path"

$androidSdkPath = Join-Path $env:LOCALAPPDATA "Android\Sdk"
if (Test-Path -LiteralPath $androidSdkPath) {
  & $flutterExecutable config --android-sdk $androidSdkPath
} else {
  Write-Host "Android Studio se instaló, pero todavía debe completar su asistente inicial para descargar el SDK de Android." -ForegroundColor Yellow
  Write-Host "Ábrelo una vez, conserva la instalación Standard y vuelve a ejecutar este preparador." -ForegroundColor Yellow
}

$dockerDesktopPath = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
if (Test-Path -LiteralPath $dockerDesktopPath) {
  Start-Process -FilePath $dockerDesktopPath
  Write-Host "Docker Desktop se abrió. Acepta sus términos y espera a que indique que está listo." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Preparación terminada." -ForegroundColor Green
Write-Host "Siguiente paso obligatorio: ejecuta 'flutter doctor --android-licenses' y acepta las licencias de Android." -ForegroundColor Yellow
Write-Host "Después conecta el celular, activa Depuración USB y ejecuta iniciar-pruebas-locales.ps1 desde obd-platform." -ForegroundColor Green
