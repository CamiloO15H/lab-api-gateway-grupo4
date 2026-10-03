#!/usr/bin/env bash
# Ejecuta TODA la suite de pruebas (macOS / Linux / Git Bash)
# Uso: ./scripts/ejecutar-pruebas.sh
echo -e "\n=== 1. Casos funcionales y timeout (CP-01 a CP-07, CP-09) ==="
npm run test:funcional
echo -e "\n=== 2. Falla técnica: se detiene Pedidos (CP-08) ==="
docker compose stop pedidos && sleep 3
npm run test:falla
echo -e "\n=== 3. Recuperación ==="
docker compose start pedidos && sleep 3
echo -e "\n=== 4. Límite de tráfico (CP-10) ==="
./scripts/prueba-rate-limit.sh
docker compose logs gateway --tail 40 > evidencias/log-gateway.txt
docker compose logs productos pedidos --tail 40 > evidencias/log-servicios.txt
echo "Reportes y logs en evidencias/"
