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

## 13. Análisis de resultados *(completar después de ejecutar)*

| ID | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|
| CP-01 | | | reporte-funcional.html |
| CP-02 | | | reporte-funcional.html |
| CP-03 | | | reporte-funcional.html + log-servicios.txt (no aparece la solicitud) |
| CP-04 | | | reporte-funcional.html |
| CP-05 | | | reporte-funcional.html |
| CP-06 | | | reporte-funcional.html |
| CP-07 | | | reporte-funcional.html |
| CP-08 | Código real observado: ___ | | reporte-servicio-caido.html + log-gateway.txt |
| CP-09 | Tiempo real observado: ___ ms | | reporte-funcional.html |
| CP-10 | 200: ___ / 429: ___ | | resultado-rate-limit.txt |

**Preguntas guía para la interpretación:**
- En CP-03, ¿por qué es importante que el log de Productos **no** muestre la solicitud? (El gateway protege a los servicios: la validación ocurre en el borde.)
- En CP-08, ¿qué código devolvió Kong y qué significa? (502 = respuesta inválida o conexión rechazada; 503 = no pudo resolver o no hay destino disponible; 504 = no respondió a tiempo.)
- En CP-09, ¿qué pasaría sin `read_timeout`? (El cliente quedaría esperando lo que tarde el servicio; con muchos clientes se agotan conexiones.)
- ¿Qué defectos o hallazgos encontraron durante el montaje y cómo los corrigieron? (Registrar aquí cualquier falla real: es parte de la gestión de defectos.)

## 14. Conclusiones *(borrador para ajustar con los resultados reales)*

1. El gateway centraliza controles transversales (autenticación, límite de tráfico, timeouts, trazabilidad) que de otro modo tendría que implementar cada servicio.
2. Las validaciones del gateway ocurren **antes** de llegar a los servicios, lo que se evidencia en los logs (CP-03, CP-04).
3. El gateway aísla las fallas: la caída de Pedidos no afectó a Productos (CP-08).
4. Los timeouts configurados convierten una espera indefinida en un error rápido y controlado (CP-09).
5. El gateway es también un punto único de falla: en producción necesitaría réplicas y monitoreo; eso quedó fuera del alcance.

## 15. Referencias

- Kong Inc. *Kong Gateway documentation — DB-less and declarative configuration.* https://docs.konghq.com/gateway/latest/production/deployment-topologies/db-less-and-declarative-config/
- Kong Inc. *Key Authentication plugin.* https://docs.konghq.com/hub/kong-inc/key-auth/
- Kong Inc. *Rate Limiting plugin.* https://docs.konghq.com/hub/kong-inc/rate-limiting/
- Postman. *Newman — command-line collection runner.* https://learning.postman.com/docs/collections/using-newman-cli/command-line-integration-with-newman/
- Richardson, C. *Pattern: API Gateway / Backends for Frontends.* https://microservices.io/patterns/apigateway.html
- ISTQB. *Certified Tester Foundation Level Syllabus v4.0* (niveles de prueba: integración y sistema).
- Jaramillo Patiño, C. A. *Guía para la exposición y laboratorio: Estrategias de pruebas de integración y de sistema.* ITM, 2026.
