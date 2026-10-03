# Ejecuta TODA la suite de pruebas del laboratorio (Windows / PowerShell)
# Uso (desde la raíz del proyecto):  .\scripts\ejecutar-pruebas.ps1
$ErrorActionPreference = "Continue"

Write-Host "`n=== 0. Verificando que el laboratorio esté arriba ===" -ForegroundColor Cyan
docker compose ps

Write-Host "`n=== 1. Casos funcionales y timeout (CP-01 a CP-07, CP-09) ===" -ForegroundColor Cyan
npm run test:funcional

Write-Host "`n=== 2. Falla técnica: se detiene el servicio Pedidos (CP-08) ===" -ForegroundColor Yellow
docker compose stop pedidos
Start-Sleep -Seconds 3
npm run test:falla

Write-Host "`n=== 3. Recuperación: se vuelve a encender Pedidos ===" -ForegroundColor Cyan
docker compose start pedidos
Start-Sleep -Seconds 3

Write-Host "`n=== 4. Límite de tráfico (CP-10) ===" -ForegroundColor Cyan
.\scripts\prueba-rate-limit.ps1

Write-Host "`n=== 5. Logs del gateway (evidencia) ===" -ForegroundColor Cyan
docker compose logs gateway --tail 40 | Out-File -Encoding utf8 evidencias\log-gateway.txt
docker compose logs productos pedidos --tail 40 | Out-File -Encoding utf8 evidencias\log-servicios.txt
Write-Host "Reportes HTML y logs guardados en la carpeta evidencias\" -ForegroundColor Green
