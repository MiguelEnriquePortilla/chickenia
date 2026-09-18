# Captura diaria: estado al 18/09/2026

## Actualización: foto del cierre de una página

Implementación local preparada y probada para llegada cruda, tres producciones, mermas, tarjeta conjunta, monedas totales y gastos de cierre. Skills actualizadas para lectura de foto adjunta y captura autenticada. Se quitaron los accesos de formularios del dashboard, conservando resultados. Ver [CAPTURA_FOTO_CIERRE.md](CAPTURA_FOTO_CIERRE.md). No se capturó la foto usada como referencia ni se enviaron reportes de prueba. Estado de publicación de esta actualización: pendiente de verificar.

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
