# Captura diaria: estado vigente al 22/09/2026

## Estado vigente: 22 septiembre 2026

Leer primero [cierre de sesión y acuerdos vigentes](REPORTE_SESION_2026-09-22.md).
Rastro incorpora RECTIFICAR INVENTARIO e histórico de tres días en el dashboard.
Proteínas usa pollos completos con decimales; Producción conserva sus unidades.
La bienvenida con mascota ya fue aprobada; el icono instalado permanece igual.
Las fechas y pendientes anteriores quedan como contexto histórico.

Publicado y enviado a `main`: **`e690a4d`**. El flujo acordado vuelve a ser digital:
**Supervisión y Asistencia → Cierre de Caja / Producción Diaria / Inventario de Rastro**.
Todos los pollos deben capturarse en piezas (8 piezas = 1 entero). Rastro calcula
existencia anterior + entradas − salidas y conserva movimientos por fecha.

Ajuste visual publicado: tres accesos independientes al final, visibles en las áreas
de Jojutla; controles y formularios con modo día/noche compartido. Puntos de control
del día colapsables con preferencia guardada. Caja y Producción ya no comparten pestañas.
Verificados contraste y navegación móvil en ambos modos; 13 pruebas de captura e
inventario aprobadas. Despliegue y CSS confirmados en producción, sin capturar datos reales.

Leer primero [cierre de sesión y pendientes](REPORTE_SESION_2026-09-19.md) y
[implementación de informes digitales](INFORMES_DIGITALES.md). Las pruebas locales
pasaron y los archivos nuevos están publicados; falta comprobar el primer guardado
autenticado de Rastro en producción. La regla de piezas está aplicada a la nueva
Producción Diaria; la migración del motor antiguo de inventario sigue pendiente.

La documentación de cierre está guardada localmente; servidor de pruebas detenido.

La siguiente sesión será para ajustes concretos de Miguel. No reiniciar el diseño,
repetir preguntas ya respondidas, completar la foto del 18/09 ni activar envíos nuevos.
El sobrante Rosti del 18/09 sigue pendiente en campo numérico; quedó en aclaraciones.

---

## Histórico al 18/09/2026 — no sustituye el estado anterior

## Actualización: foto del cierre de una página

CD-01 aprobado por Miguel tras quitar el renglón adicional de totales. Para hoy 18/09/2026 usará solo esta hoja: adjunta manualmente la foto en la conversación a las 18:45 CDMX. Capturar y verificar caja y proteínas para el corte existente de las 19:00 (cron `0 1 * * *` UTC). No se creó otro envío ni importación automática. Pendiente recibir y guardar la primera foto real; no finalizar automáticamente ni garantizar inclusión de datos llegados después de generada la instantánea.

Implementación publicada en `0f7103e` para llegada cruda, tres producciones, mermas, tarjeta conjunta, monedas totales y gastos de cierre. Skills instaladas actualizadas para lectura de foto adjunta y captura autenticada. Se quitaron los accesos de formularios del dashboard, conservando resultados. Ver [CAPTURA_FOTO_CIERRE.md](CAPTURA_FOTO_CIERRE.md). Verificado en el sitio publicado: `/daily/app.js` incluye el modo foto; `/js/dashboard.js` ya no enlaza a captura y conserva gastos/resultados. Pasaron 20 pruebas de dominio/API/reportes y el recorrido visual de guardar caja y tercera producción contra API aislada. No se capturó la foto de referencia ni se enviaron reportes de prueba. Pendiente: aprobación visual del PDF de una página y primera captura autenticada con una foto real autorizada.

## Cierre de sesion: estado vigente

- Commit funcional `5cc9127`, push a main y despliegue verificado. Miguel confirmo que el formato se ve bien.
- Formatos reales: `/captura.html?mode=close` y `/captura.html?mode=production`. Guardar borrador antes de finalizar; finalizados sin reapertura.
- Dashboard autenticado con ambos resumenes. Telegram incorpora Caja y Produccion en el siguiente corte programado; guardar no envia inmediatamente.
- Verificacion publicada: captura HTTP 200 con modo production; API sin sesion HTTP 401; preview protegido de Telegram HTTP 200 con ambos estados sin captura. No se enviaron mensajes de prueba ni se insertaron registros reales.
- 25 pruebas aprobadas y build correcto. Skills instaladas actualizadas para priorizar la ficha real; CLI/MCP locales siguen siendo pruebas.
- No importar ni borrar el borrador local de Nancy del 18/09 (fondo de 5000). No tocar `../Formatos-Internos/`, ajeno a esta entrega.
- Siguiente sesion: captura real breve, verificar persistencia y dashboard, confirmar siguiente Telegram recibido. Luego definir compras por foto con confirmacion de conceptos, cantidades y costos antes de guardar; no implementado aun.
- Mantener entregas pequenas y respuestas concisas por consumo de tokens. No ampliar a nomina/servicios ni contabilidad general en esta prueba.

Detalles y limites: [CAPTURA_DIARIA_PRODUCCION.md](CAPTURA_DIARIA_PRODUCCION.md). Evidencia de cierre: [REPORTE_SESION_2026-09-18.md](REPORTE_SESION_2026-09-18.md).

## Historial del piloto (no es el estado actual)

Actualización: la entrega real está implementada; consultar CAPTURA_DIARIA_PRODUCCION.md. El texto siguiente conserva el estado histórico del piloto. No importar sus registros a producción.

Piloto local implementado de Cierre de Caja y Producción. No publicado ni conectado al dashboard remoto o Telegram financiero. Usuario pidió cerrar el alcance y reducir consumo de tokens antes de ajustar el plan.

- Skills fuentes en plugins/foodia-local/skills/cierre-caja y produccion-diaria; copias instaladas en ~/.codex/skills. Admiten cuestionario/dictado con CLI de respaldo y ficha web.
- Servicios lib/cash-close.js y lib/production-daily.js: cálculos, borradores por fecha, revisión optimista, historial y finalización inmutable. Solo environment local-test y negocio chicanito.
- UI en lib/cash-ui; servidor scripts/cash-close-web.js; iniciar con node scripts/foodia-local.js --cash-web. Escucha solo 127.0.0.1, puerto dinámico, protección Host/Origin/token. Base .local/foodia-pilot/postgres y lock compartido existentes.
- Nuevos tools MCP locales cash_get/save y production_get/save; un proceso MCP ya abierto requiere reinicio para descubrirlos. Alternativa CLI: --input archivo.json, acciones cashGet/cashSave/productionGet/productionSave.
- Siete pruebas de dominio, persistencia local y MCP aprobadas. Prueba local requiere permisos de escritura para su base aislada. No se insertaron cierres ni producción reales.
- Pantalla local abierta en http://127.0.0.1:52066; logs en work/daily-web.log de la conversación. Puerto válido mientras viva ese proceso.

Límites: un cierre consolidado por fecha, sin reapertura de finalizados; sin documentos adjuntos ni firma real; unidades de cocina pendientes de definición por usuario. Orden de producción no mueve inventario ni crea compras. No asumir que finalizado significa revisado.

Siguiente paso acordable: prueba breve con Miguel y después decidir integración remota/dashboard/Telegram. Cambios permanecen locales, sin commit/push de este piloto. No modificar los reportes de supervisión ya publicados.
