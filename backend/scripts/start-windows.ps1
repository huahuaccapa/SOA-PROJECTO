$ErrorActionPreference = "Stop"

Write-Host "[Byteverse] Verificando Docker Desktop..." -ForegroundColor Cyan
docker info | Out-Null

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Se creó .env desde .env.example" -ForegroundColor Yellow
}

Write-Host "[Byteverse] Deteniendo contenedores anteriores sin borrar datos..." -ForegroundColor Cyan
docker compose down --remove-orphans

Write-Host "[Byteverse] Construyendo e iniciando servicios..." -ForegroundColor Cyan
docker compose up -d --build

Write-Host "[Byteverse] Estado de los servicios:" -ForegroundColor Green
docker compose ps

Write-Host "\nAPI Gateway: http://localhost:3000/health" -ForegroundColor Green
Write-Host "MySQL externo: localhost:3307 | interno Docker: mysql:3306" -ForegroundColor Green
