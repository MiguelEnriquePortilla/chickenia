# Cierre de entrega: fudIA local y movimientos de inventario

Fecha: 15 de septiembre de 2026. Entorno validado: local-test. Este reporte complementa el del 14 de septiembre; no confirma operación en Neon ni acceso desde ChatGPT remoto.

## Resultado

El plugin visible es **fudIA local - pruebas**, con identificador técnico `foodia-local@personal`. Incluye `fudia-pruebas`, `subir-gastos` y `movimientos-inventario`. Se puede conversar o dictar mediante la entrada de voz de la aplicación. La skill recibe la transcripción; no activa el micrófono ni cambia el modelo. La conexión remota continúa pendiente de OAuth; Lilian y Android quedan fuera de este piloto.

`subir-gastos` captura compras, cantidades, precios, pagos informados y recepción de proveedor. `movimientos-inventario` opera solicitudes de sucursal a CEDIS, envíos, recepciones parciales, devoluciones de tránsito y cierre, sin costos. Ambas usan borradores y folios, no escriben SQL arbitrario.

## Implementación y reglas

- MCP con siete herramientas: foodia_session, foodia_inventory, foodia_prepare, foodia_commit, foodia_purchases, foodia_lists y foodia_movements.
- Se expusieron las operaciones existentes request, send, receive, transitReturn y closeRequest; se conservaron sus validaciones y escritura atómica.
- Solicitar no modifica saldos. Enviar descuenta CEDIS y deja mercancía en tránsito. Recibir suma sucursal. Recibir una parte no da por recibida la totalidad.
- La hoja conserva producto, existencia anterior, entradas recibidas y solicitudes L–D. «Existencia nueva» es lo que llegó, no saldo total. Las solicitudes diarias no acreditan entrega. No se inventan firmas, costos, saldos iniciales ni equivalencias.
- Se priorizan kg donde estén definidos; no se convierten registros históricos en porciones/bultos. Máximos y mínimos de compra son orientadores, y se pueden agregar productos.
- La solicitud solo admite hoy o fechas futuras. La consulta actual filtra por fecha solicitada y conserva abiertas y hasta 50 cerradas: no es un histórico completo de movimientos por fecha física.

## Incidente de conexión resuelto

El piloto original mantenía PGlite abierto durante toda la sesión MCP. Otra tarea fallaba al arrancar y no exponía herramientas. Los registros confirmaron «La base local ya está abierta»; no era un problema del nombre del prompt.

Se cambió a apertura/cierre bajo bloqueo exclusivo por llamada, con cola dentro de cada proceso y espera de hasta 15 segundos entre procesos. Sesión y descubrimiento no requieren abrir la base. Se conserva la escritura atómica y el reintento del mismo borrador. La consola y varias tareas pueden compartir la misma base por turnos.

Tras actualizar, quedó vivo el proceso antiguo 10156, iniciado a las 12:30. Se verificó su comando exacto, se cerró exclusivamente ese MCP y se retiró owner.lock solo después de confirmar que el proceso había terminado. No se borró la base. Dos clientes MCP simultáneos consultaron sesión, catálogo y solicitudes satisfactoriamente; Miguel confirmó después las cuatro consultas desde su tarea.

Una terminación abrupta puede dejar owner.lock. No eliminarlo a ciegas: identificar el dueño y comprobar que ya no usa la base antes de retirarlo. No matar procesos Node ajenos ni borrar postgres para solucionar conexión.

## Prueba guiada con Miguel

Se crearon insumos de prueba por kg, precisión 0.001, conservando el catálogo previo:

| Producto | Identificador | Inicial CEDIS | Enviado/recibido | Final CEDIS | Final sucursal |
| --- | --- | --- | --- | --- | --- |
| Papa Alfa | a67f3a8a-ec8f-4c0b-a13a-8563851b8e84 | 20 kg | 15 kg | 5 kg | 15 kg |
| Zanahoria entera | d9d2c1c2-2d53-4c65-ba3a-06563a736287 | 10 kg | 7 kg | 3 kg | 7 kg |

Se inicializó sucursal en cero antes de recibir. Primero llegaron 13 kg de papa y 7 kg de zanahoria; luego los 2 kg restantes de papa, sin volver a recibir lo anterior. No se registraron compras ni costos en este recorrido.

| Paso | Folio |
| --- | --- |
| Solicitud | eb8c8905-ae8b-45c4-8077-d5814cc923b4 |
| Inicial CEDIS | 9295e559-884f-4670-a819-3252c19673ed |
| Envío | 6c2687de-6717-48b5-afbc-6cd289ddf7cb |
| Inicial sucursal | a2a9949d-edf8-4cb7-b40e-00f4ad990828 |
| Recepción parcial | d7d4e5c9-ff04-4665-ba4f-e1b1de5ad022 |
| Recepción restante | 7c60f24f-2fed-438a-9c41-c986cfd06573 |
| Cierre | 5a8bef5f-c146-470a-bf98-4e0a85c39990 |

**Verificación final:** Miguel registró el cierre con motivo «Prueba local completada: todo lo enviado fue recibido». La consulta local de solo lectura posterior devuelve versión 9, solicitud `closed`, recibido completo y tránsito cero; closedAt 2026-09-15T19:58:43.315Z. Flujo completo terminado, incluido cierre administrativo. Los saldos anteriores fueron confirmados por Miguel sin cambios tras cerrar; el estado de solicitud y recepción se volvió a consultar directamente.

## Evidencia técnica

- Suite de 31 pruebas aprobada al añadir movimientos.
- Prueba HTTP con cliente MCP: solicitud, envío, recepción parcial, reintento idempotente, rechazo de sobrerecepción, devolución y cierre; costos de compras sin cambios.
- Después del arreglo de conexiones: tres pruebas locales/HTTP aprobadas, incluyendo dos clientes simultáneos, consola con MCP abierto, doble commit del mismo borrador, recuperación después de una operación inválida y persistencia tras reinicio.
- Plugin y skills validados; verificación manual posterior del usuario satisfactoria. No se verificó OAuth interactivo ni Android.
- Commits enviados a main: 4cbd97c (nombre fudIA), cef77db (skills y movimientos), 3ff71e2 (conexiones concurrentes). Entrega base: 5b9e53e y documentación 34aa0de.

## Dónde queda guardado

Código, skills y documentos: carpeta ChickenIA del repositorio 02-OPERACION, versionados en GitHub. Fuente instalada del plugin: C:/Users/hp/plugins/foodia-local; caché personal bajo C:/Users/hp/.codex/plugins/cache/personal/foodia-local. El plugin apunta al ejecutor del proyecto; no es una copia autónoma de la aplicación.

Datos locales: `.local/foodia-pilot/postgres`, excluidos por .gitignore. **GitHub no respalda esta base.** Los datos de producción siguen en Neon; este piloto no los modifica. No se creó carpeta en Drive ni respaldo adicional. No hace falta Drive para continuar, pero si se desea un respaldo de datos debe hacerse con la base cerrada o mediante una exportación consistente; no sincronizar la carpeta de PostgreSQL en uso.

Siguiente sesión: [handoff para reportes precisos](HANDOFF_FUDIA_REPORTES_2026-09-15.md).
