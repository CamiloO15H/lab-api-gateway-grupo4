#!/usr/bin/env bash
# CP-10: 10 solicitudes seguidas; el gateway permite 5 por segundo.
codigos=()
for i in $(seq 1 10); do
  c=$(curl -s -o /dev/null -w "%{http_code}" -H "apikey: clave-grupo4-2026" http://localhost:8000/api/productos)
  echo "Solicitud $i -> $c"; codigos+=("$c")
done
ok=$(printf "%s\n" "${codigos[@]}" | grep -c 200); bloq=$(printf "%s\n" "${codigos[@]}" | grep -c 429)
echo "CP-10 | $(date -Iseconds) | 200: $ok | 429: $bloq | secuencia: ${codigos[*]}" | tee evidencias/resultado-rate-limit.txt
[ "$bloq" -gt 0 ] && echo "CP-10 APROBADO" || echo "CP-10 FALLIDO"
