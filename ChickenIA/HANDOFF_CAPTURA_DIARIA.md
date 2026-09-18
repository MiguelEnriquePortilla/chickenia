# Captura diaria: estado al 18/09/2026

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
