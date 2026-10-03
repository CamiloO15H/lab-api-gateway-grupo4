# CP-10: envía 10 solicitudes seguidas; el gateway permite 5 por segundo.
# Resultado esperado: las primeras ~5 responden 200 y las demás 429.
$resultados = @()
1..10 | ForEach-Object {
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:8000/api/productos" -Headers @{ apikey = "clave-grupo4-2026" } -UseBasicParsing
    $codigo = $r.StatusCode
  } catch {
    $codigo = [int]$_.Exception.Response.StatusCode
  }
  $resultados += $codigo
  Write-Host "Solicitud $_ -> $codigo"
}
$ok = ($resultados | Where-Object { $_ -eq 200 }).Count
$bloq = ($resultados | Where-Object { $_ -eq 429 }).Count
"CP-10 | $(Get-Date -Format s) | 200: $ok | 429: $bloq | secuencia: $($resultados -join ',')" | Tee-Object -FilePath evidencias\resultado-rate-limit.txt
if ($bloq -gt 0) { Write-Host "CP-10 APROBADO: el gateway limitó el tráfico" -ForegroundColor Green }
else { Write-Host "CP-10 FALLIDO: ninguna solicitud fue limitada" -ForegroundColor Red }
