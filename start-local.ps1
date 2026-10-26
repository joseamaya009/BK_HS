param(
    [switch]$BuildBackend,
    [switch]$SkipMigrations,
    [switch]$StartFrontend
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$dbRoot = Join-Path $projectRoot 'BD_HS'
$backendRoot = Join-Path $projectRoot 'BK_HS'
$frontendRoot = Join-Path $projectRoot 'FT_HS'

if (-not (Test-Path (Join-Path $backendRoot '.env'))) {
    throw "Falta BK_HS/.env. Copia BK_HS/.env.local.example a BK_HS/.env y configura DB_PASSWORD/JWT_SECRET."
}

$databaseScript = Join-Path $dbRoot 'scripts\start-local.ps1'
if (-not (Test-Path $databaseScript)) {
    throw "Falta el script de preparación de BD_HS: $databaseScript"
}

$databaseArgs = @()
if ($SkipMigrations) {
    $databaseArgs += '-SkipMigrations'
}

& $databaseScript @databaseArgs

if ($BuildBackend) {
    Write-Host 'Construyendo y levantando backend local...'
    docker compose --env-file (Join-Path $backendRoot '.env') -p hidro_smart_backend -f (Join-Path $backendRoot 'docker-compose.yml') up -d --build
} else {
    Write-Host 'Levantando backend local...'
    docker compose --env-file (Join-Path $backendRoot '.env') -p hidro_smart_backend -f (Join-Path $backendRoot 'docker-compose.yml') up -d
}

Write-Host 'Servicios locales:'
Write-Host '  PostgreSQL: localhost:5433'
Write-Host '  Backend:    http://localhost:3000'
Write-Host '  Health:     http://localhost:3000/health'

if ($StartFrontend) {
    if (-not (Test-Path (Join-Path $frontendRoot '.env'))) {
        throw "Falta FT_HS/.env. Copia FT_HS/.env.example a FT_HS/.env y configura la URL de API."
    }

    Write-Host 'Construyendo y levantando frontend local...'
    docker compose --env-file (Join-Path $frontendRoot '.env') -p hidro_smart_frontend -f (Join-Path $frontendRoot 'docker-compose.yml') up -d --build
    Write-Host '  Frontend:   http://localhost:5173'
}
