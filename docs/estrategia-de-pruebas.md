# Estrategia de pruebas — Arquitectura con API Gateway

**Grupo 4** · Maria Paulina Vargas Lenis · Camilo Ospina Hernández · César Augusto Barrientos · Valeria García Ocampo
**Tema 4:** Pruebas de una arquitectura con API Gateway — enrutamiento y control centralizado de solicitudes

---

## 1. Objetivo de las pruebas

Verificar que el API Gateway funciona como **punto único de entrada**: que enruta cada solicitud al servicio correcto, que valida las solicitudes antes de que lleguen a los servicios y que responde de forma controlada cuando una ruta no existe o un servicio no está disponible o es lento. También se valida un flujo de negocio completo (crear y consultar un pedido) de extremo a extremo a través del gateway.

## 2. Componentes incluidos

| Componente | Tecnología | Responsabilidad |
|---|---|---|
| API Gateway | Kong 3.9 en modo DB-less (config. declarativa `kong.yml`) | Enrutamiento, autenticación por API key, límite de tráfico, límite de tamaño, timeouts, trazabilidad |
| Servicio Productos | Node.js 20 + Express | Catálogo de productos (consulta) |
| Servicio Pedidos | Node.js 20 + Express | Creación y consulta de pedidos; consulta a Productos para validar existencia, precio y stock |

## 3. Puntos de integración que se validan

| # | Punto de integración | Qué puede fallar |
|---|---|---|
| PI-1 | Cliente → Gateway | Solicitudes sin credencial, rutas inexistentes, exceso de tráfico |
| PI-2 | Gateway → Productos | Enrutamiento incorrecto, servicio lento (timeout) |
| PI-3 | Gateway → Pedidos | Enrutamiento incorrecto, servicio caído |
| PI-4 | Pedidos → Productos | Producto inexistente, datos inconsistentes (precio/total) |

## 4. Riesgos identificados

| Riesgo | Impacto | Caso que lo cubre |
|---|---|---|
| El gateway envía la solicitud al servicio equivocado o con la ruta mal reescrita | Alto: respuestas incorrectas | CP-01, CP-02 |
| Solicitudes no autenticadas llegan a los servicios internos | Alto: seguridad | CP-03 |
| Rutas no configuradas exponen comportamientos inesperados | Medio | CP-04 |
| Datos inválidos atraviesan el gateway y el error no se propaga correctamente al cliente | Medio | CP-05, CP-06 |
| El flujo de negocio se rompe al pasar por el gateway (p. ej. pérdida del cuerpo o de cabeceras) | Alto | CP-07 |
| La caída de un servicio tumba todo el sistema (falla en cascada) | Alto: disponibilidad | CP-08 |
| Un servicio lento deja al cliente esperando indefinidamente | Alto: rendimiento | CP-09 |
| Un cliente satura los servicios con demasiadas solicitudes | Medio | CP-10 |

## 5. Alcance y exclusiones

**Incluye:** enrutamiento, autenticación por API key, rutas inexistentes, validación de datos, propagación de errores, flujo completo de pedido, caída de servicio, timeout y límite de tráfico.

**Excluye:** pruebas de carga o estrés (son el tema 15), seguridad avanzada (OAuth/JWT, pruebas de penetración), persistencia en base de datos (los datos viven en memoria), alta disponibilidad y balanceo entre réplicas, despliegue en nube.

## 6. Ambiente necesario

- Equipo local con Docker Desktop y Node.js 20+.
- Tres contenedores en una red interna de Docker: `gateway` (puertos 8000 proxy y 8001 administración), `productos` y `pedidos` (sin puertos expuestos).
- Newman 6 + reporter htmlextra para la ejecución automatizada; Postman para la demostración visual.

## 7. Datos de prueba

Datos ficticios en memoria: API key `clave-grupo4-2026`; productos id 1 (stock 10, $180.000), id 2 (stock 25), id 3 (stock 0); id 99 inexistente. No se usa información real ni personal.

## 8. Dependencias reales y simuladas

| Dependencia | Real / simulada | Cómo |
|---|---|---|
| Kong, Productos, Pedidos | Reales | Contenedores funcionando |
| Caída de Pedidos | Falla real inducida | `docker compose stop pedidos` |
| Lentitud de Productos | Simulada (inyección de falla) | Parámetro `?demoraMs=5000` que retrasa la respuesta del servicio |
| Datos | Simulados | Arreglos en memoria |

## 9. Estrategia de integración

Se usa un enfoque **incremental ascendente (bottom-up)**: primero se verifica cada servicio aislado (health check), luego cada ruta del gateway por separado (PI-2, PI-3), después la integración entre servicios (PI-4) y al final el flujo completo como prueba de sistema. Se descartó el enfoque *big bang* porque, si todo se prueba junto y falla, no se sabe si el problema está en el gateway, en la ruta o en el servicio.

## 10. Herramientas

| Herramienta | Uso |
|---|---|
| Docker Compose | Levantar y detener componentes (inducir fallas) |
| Kong Admin API (`:8001`) | Verificar servicios, rutas y plugins cargados |
| Postman | Diseño y ejecución visual de los casos |
| Newman + htmlextra | Ejecución automatizada por línea de comandos y reporte HTML como evidencia |
| PowerShell / Bash + curl | Caso de límite de tráfico y captura de logs |

## 11. Criterios de aprobación

- **Aprobado:** el código HTTP y el cuerpo de la respuesta coinciden con el resultado esperado, y todas las aserciones del caso pasan en Newman.
- **Fallido:** cualquier aserción falla, el código HTTP es distinto al esperado o la respuesta tarda más del límite definido.
- **Criterio de salida de la suite:** 100 % de los casos automatizados aprobados, y la recuperación verificada después de las fallas inducidas.

---

## 12. Matriz de casos de prueba

Resumen (el detalle completo de cada caso está en `matriz-casos-de-prueba.xlsx`):

| ID | Nombre | Tipo | Automatizado | Resultado esperado |
|---|---|---|---|---|
| CP-01 | Enrutamiento a Productos | Integración | Sí (Newman) | 200 + lista de productos + cabecera X-Request-ID |
| CP-02 | Enrutamiento a Pedidos | Integración | Sí (Newman) | 200 + arreglo de pedidos |
| CP-03 | Solicitud sin API key | Integración (validación) | Sí (Newman) | 401 generado por Kong; el servicio nunca recibe la solicitud |
| CP-04 | Ruta no registrada | Integración | Sí (Newman) | 404 "no Route matched" |
| CP-05 | Pedido con datos inválidos | Integración (error funcional) | Sí (Newman) | 400 DATOS_INVALIDOS propagado por el gateway |
| CP-06 | Pedido de producto inexistente | Integración (error funcional) | Sí (Newman) | 422 PRODUCTO_NO_EXISTE |
| CP-07 | Flujo completo crear y consultar pedido | **Sistema** | Sí (Newman) | 201 con total 360000 y luego 200 con el mismo pedido |
| CP-08 | Servicio Pedidos no disponible | Integración (falla técnica) | Sí (Newman + script) | 502/503/504 controlado de Kong y Productos sigue en 200 |
| CP-09 | Timeout del servicio Productos | Integración (falla técnica) | Sí (Newman) | 504 en ~3 s (no espera los 5 s) |
| CP-10 | Límite de tráfico | **Sistema** | Sí (script) | Primeras ~5 solicitudes en 200 y el resto en 429 |

Cumplimiento de la guía: casos exitosos (CP-01, CP-02, CP-07), datos inválidos (CP-05), errores funcionales (CP-03, CP-04, CP-06), fallas técnicas o de integración (CP-08, CP-09) y validación del comportamiento del sistema (CP-07, CP-10).

---

## 13. Análisis de resultados

Ejecución del 2 de octubre de 2026 en Windows con Docker Desktop, Kong 3.9.3 y Newman. **10 de 10 casos aprobados**; 1 hallazgo registrado (H-01).

| ID | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|
| CP-01 | 200 OK en 264 ms; 3 productos; cabecera X-Request-ID presente | Aprobado | reporte-funcional.html |
| CP-02 | 200 OK en 169 ms; arreglo vacío (aún sin pedidos); X-Kong-Upstream-Latency presente | Aprobado | reporte-funcional.html |
| CP-03 | 401 en 20 ms, "No API key found in request"; el log de Productos no registra la solicitud | Aprobado | reporte-funcional.html + log-servicios.txt |
| CP-04 | 404, "no Route matched with those values"; sin X-Powered-By ni X-Kong-Upstream-Latency | Aprobado | reporte-funcional.html |
| CP-05 | 400 DATOS_INVALIDOS propagado por el gateway | Aprobado | reporte-funcional.html |
| CP-06 | 422 PRODUCTO_NO_EXISTE; Pedidos consultó a Productos (404) y lo tradujo | Aprobado | reporte-funcional.html + log-servicios.txt |
| CP-07 | 201 con total 360000 y estado CREADO; luego 200 con el mismo pedido | Aprobado | reporte-funcional.html |
| CP-08 | 504 en 2,09 s (connect_timeout) y Productos en 200; recuperación correcta. Ver H-01 | Aprobado (tras H-01) | reporte-servicio-caido.html + log-gateway.txt |
| CP-09 | 504 en 3,03 s; Kong cortó en el read_timeout sin esperar los 5 s | Aprobado | reporte-funcional.html |
| CP-10 | 200 ×5 y 429 ×5 | Aprobado | resultado-rate-limit.txt |

Totales de Newman: corrida funcional 9 solicitudes, 20 aserciones, 0 fallidas (3,8 s); corrida de servicio caído 2 solicitudes, 3 aserciones, 0 fallidas.

### Hallazgos y gestión de defectos

| ID | Descripción | Causa | Severidad | Tratamiento |
|---|---|---|---|---|
| H-01 | En la primera ejecución de CP-08, Kong respondió 503 "name resolution failed" en 12,08 s, por encima del criterio de 5 s | Al detener el contenedor, el DNS interno de Docker deja de resolver `pedidos`; Kong espera al resolvedor DNS antes de fallar | Media: el cliente espera 12 s ante una caída | Registrado. En la repetición respondió 504 en 2,09 s (IP en caché, corta el connect_timeout). Mejora propuesta: ajustar los tiempos del resolvedor DNS de Kong |
| H-02 | En un bucle manual de CP-10 salió 200 ×5, 429 ×3, 200 ×2 | El bucle con curl.exe tardó más de 1 s y abrió una nueva ventana de conteo | No es defecto | Se usa el script automatizado, que envía las 10 solicitudes dentro del mismo segundo |
| H-03 | El log del gateway muestra solicitudes ajenas (`/notifications/unread-count` → 404) | Otra aplicación abierta en el navegador (localhost:3000) llamaba al puerto 8000 | No es defecto del laboratorio | Cerrar otras aplicaciones antes de la demo. Muestra que Kong rechaza con 404 cualquier ruta no configurada |

### Interpretación

- **El gateway valida en el borde.** En CP-03 y CP-04 la respuesta no trae `X-Kong-Upstream-Latency` y el servicio no registra la solicitud: Kong respondió sin consultar a nadie.
- **Errores de negocio vs. errores del gateway.** Los 400 y 422 (CP-05, CP-06) los genera el servicio y el gateway solo los propaga; los 401, 404, 429, 503 y 504 los genera Kong.
- **Las fallas quedan aisladas.** Con Pedidos caído, Productos siguió respondiendo 200 (CP-08).
- **Los timeouts convierten una espera en un error rápido.** CP-09 cortó en 3 s, y CP-08 en 2 s cuando la IP estaba en caché. H-01 muestra que la resolución DNS es un tiempo que la configuración del laboratorio no controlaba.
- **Tráfico interno vs. externo.** En el log de Productos, las consultas que hace Pedidos aparecen con `consumidor=-`: no pasan por el gateway. El gateway controla el tráfico que entra desde afuera (norte-sur); la comunicación entre servicios (este-oeste) va por la red interna.

## 14. Conclusiones

1. El API Gateway cumple su función de punto único de entrada: enrutó correctamente a los dos servicios y reescribió las rutas (CP-01, CP-02, CP-07).
2. Los controles transversales (autenticación, límite de tráfico, timeouts, trazabilidad) quedaron en un solo archivo de configuración y no en el código de cada servicio.
3. Las validaciones del gateway ocurren antes de llegar a los servicios, y eso se pudo verificar con los logs, no solo con el código de respuesta.
4. El gateway aísla las fallas, pero el tiempo de respuesta ante una caída depende de detalles de infraestructura como el DNS (H-01). Por eso las fallas técnicas se deben probar más de una vez.
5. El gateway es también un punto único de falla. En producción necesitaría réplicas, monitoreo y pruebas de carga, que quedaron fuera del alcance.

## 15. Referencias

- Kong Inc. *Kong Gateway documentation — DB-less and declarative configuration.* https://docs.konghq.com/gateway/latest/production/deployment-topologies/db-less-and-declarative-config/
- Kong Inc. *Key Authentication plugin.* https://docs.konghq.com/hub/kong-inc/key-auth/
- Kong Inc. *Rate Limiting plugin.* https://docs.konghq.com/hub/kong-inc/rate-limiting/
- Postman. *Newman — command-line collection runner.* https://learning.postman.com/docs/collections/using-newman-cli/command-line-integration-with-newman/
- Richardson, C. *Pattern: API Gateway / Backends for Frontends.* https://microservices.io/patterns/apigateway.html
- ISTQB. *Certified Tester Foundation Level Syllabus v4.0* (niveles de prueba: integración y sistema).
- Jaramillo Patiño, C. A. *Guía para la exposición y laboratorio: Estrategias de pruebas de integración y de sistema.* ITM, 2026.
