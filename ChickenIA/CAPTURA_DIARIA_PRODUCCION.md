# Caja y producción: operación real

Actualización 18/09: el modo de foto CD-01 y gastos de cierre está publicado; ver [CAPTURA_FOTO_CIERRE.md](CAPTURA_FOTO_CIERRE.md). El dashboard ya no ofrece enlaces a los formularios, pero conserva resultados. Las compras de inventario siguen siendo un flujo separado; gastos de caja no crean compras automáticamente.

18 de septiembre de 2026. Entrega autorizada por Miguel: marca, captura real, dashboard y Telegram. Compras y gasto corriente siguen fuera de esta entrega.

## Uso

Abrir /captura.html?mode=close o /captura.html?mode=production y entrar con la sesión habitual de ChickenIA. El parámetro date selecciona el día; por omisión usa CDMX. La pantalla distingue Operación real del piloto local. Guardar borrador permite retomar; finalizar queda de solo lectura. Una captura finalizada con diferencias no significa caja cuadrada ni firma de Supervisión.

El dashboard muestra los dos módulos para la fecha seleccionada y permite abrirlos. Caja requiere manager; producción permite manager, kitchen y processor. El acceso compartido del piloto web existente continúa vigente: los nombres declarados no equivalen a identidad individual verificada.

## Persistencia y separación

Tablas nuevas cash_close_daily_live y production_daily_live, con historial por revisión. No se importan registros de las tablas locales *_pilot. Jojutla Mercado es la única sucursal cubierta; no es multiempresa ni multisucursal. Un documento consolidado por fecha. El primer turno es una entrega dentro del cierre diario.

La escritura usa revisión optimista y conserva historial. Repetir una versión vieja devuelve conflicto: recuperar y comparar antes de reintentar. El dinero se almacena en centavos; null significa desconocido. Producción conserva unidades y separar orden/hecho/crudo/cocido. No mueve inventario ni registra compras.

## API

Se reutiliza /api/inventory, sin nuevas funciones serverless: daily-get, daily-save, daily-calculate y daily-overview. Todas requieren sesión. Escrituras requieren JSON y origen del mismo host. La vista pública /api/summary excluye el bloque financiero de snapshots de Telegram.

## Telegram

Los cinco cortes existentes incorporan caja y producción en la imagen. Sin registros dicen «sin captura»; borradores son provisionales. La foto incluye los datos de ese momento; el botón abre el dashboard actualizado. No hay envío inmediato al guardar/finalizar y no se duplican cortes históricos. El cron usa solo datos reales de Jojutla ID 1. Sin tablas nuevas aún, informa «sin captura» y sigue enviando supervisión.

## Skills

Las skills instaladas indican que las capturas reales se realizan en la ficha autenticada. Los MCP de foodia-local y la CLI continúan siendo solo de pruebas; no se habilitó OAuth remoto nuevo. No sustituir silenciosamente una captura real por una local.

## Verificación y continuidad

Tests: npm run test:daily y npm run test:telegram, más regresiones de acceso/inventario. Build genera public/captura.html y public/daily/{app.js,style.css}; fuentes en lib/cash-ui.

Siguiente validación con Miguel: capturar una jornada real, guardar borradores, comprobar dashboard y siguiente corte. No crear datos ficticios en producción. Pendiente futuro: reapertura controlada de finalizados, adjuntos, compras por foto y gastos corrientes.
