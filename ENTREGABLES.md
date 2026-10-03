# Entregables — Grupo 4 · Pruebas de una arquitectura con API Gateway

Correspondencia con el punto 12 de la guía.

| # | Entregable | Dónde está |
|---|---|---|
| 1 | Presentación | `presentacion/Presentacion-Grupo4-API-Gateway.pptx` |
| 2 | Diagrama de la arquitectura | `docs/diagrama-arquitectura.png` (fuente: `.svg`) |
| 3 | Documento con la estrategia de pruebas | `docs/estrategia-de-pruebas.docx` (también en `.md`) |
| 4 | Matriz de casos de prueba (10 casos) | `docs/matriz-casos-de-prueba.xlsx` |
| 5 | Código fuente del laboratorio | `servicios/productos/`, `servicios/pedidos/` |
| 6 | Scripts y archivos de configuración | `gateway/kong.yml`, `docker-compose.yml`, `scripts/`, `pruebas/` |
| 7 | Instrucciones de instalación y ejecución | `README.md` |
| 8 | Evidencias de las pruebas ejecutadas | `evidencias/` (reportes HTML de Newman, logs, resultado de rate limit) y `evidencias/capturas/` |
| 9 | Análisis de resultados y conclusiones | `docs/estrategia-de-pruebas.docx`, secciones 13 y 14 |
| 10 | Referencias consultadas | `docs/estrategia-de-pruebas.docx`, sección 15, y última diapositiva |

Ejecución de referencia: 2 de octubre de 2026, Windows + Docker Desktop, Kong 3.9.3. Resultado: 10 de 10 casos aprobados, 1 defecto documentado (H-01).
