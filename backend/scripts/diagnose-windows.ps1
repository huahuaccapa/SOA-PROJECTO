$ErrorActionPreference = "Continue"

Write-Host "=== CONTENEDORES ===" -ForegroundColor Cyan
docker compose ps

Write-Host "\n=== PUERTOS 3000, 3306 Y 3307 ===" -ForegroundColor Cyan
netstat -ano | Select-String ":3000|:3306|:3307"

Write-Host "\n=== MYSQL ===" -ForegroundColor Cyan

Write-Host "\n=== AUTH SERVICE ===" -ForegroundColor Cyan
docker compose logs --tail=80 auth-service

Write-Host "\n=== API GATEWAY ===" -ForegroundColor Cyan
docker compose logs --tail=80 api-gateway

Write-Host "\n=== PRUEBA API ===" -ForegroundColor Cyan
try {
    Invoke-RestMethod "http://localhost:3000/health" | ConvertTo-Json -Depth 5
} catch {
    Write-Host "No responde http://localhost:3000/health" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
