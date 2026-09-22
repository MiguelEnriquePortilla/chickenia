# Captura de pollo en pollos — 22/09/2026

Miguel indicó que **TODO pollo se captura en pollos completos con decimales**,
ya no en piezas. Incluye Cruji/Rostizado, crudo, marinado, cocinado, producción,
sobrantes, mermas, conteos, entradas, traslados y ventas. Medio = 0.5, cuarto =
0.25; hasta tres decimales. Costilla permanece en kg y los insumos conservan
sus propias unidades. Esta regla sustituye cualquier instrucción anterior.

## Pantallas y cálculos

- Producción Diaria y captura por foto: catálogo de ambos pollos en `pollos`.
  Todas las tandas, pedidos de preparación, llegadas, sobrantes y mermas aceptan
  decimales. El total producido suma Cruji + Rosti, sin multiplicar por ocho.
- Cierre de Caja consulta las proteínas usando ese mismo catálogo.
- Dashboard y nuevos reportes de Telegram muestran producción en pollos.
  Los cortes ya enviados permanecen como evidencia histórica.
- Inventario general: existencias, solicitudes, envíos, recepciones, preparación,
  conteos, conciliación, historial/CSV y venta se presentan y capturan en pollos.
  La venta elige producto y cantidad de pollos; ya no pide número de piezas.
- Supervisión: controles cuantitativos de pollo, incluidos móviles, usan pollos.
  Las cantidades y metas antiguas expresadas en piezas se convierten al mostrar.
- Inventario de Proteínas ya usaba pollos decimales; se conserva esa regla.

## Compatibilidad de registros

No se ejecuta una conversión masiva ni se reescribe la evidencia histórica.
`production-daily.chickens()` normaliza las revisiones al leer: `chickenUnit=piezas`
divide entre ocho todos los campos de pollo; la versión inicial sin marcador
solo convierte el Cruji cocido que entonces se capturaba en piezas. Las capturas
nuevas guardan `chickenUnit=pollos`. La conversión es idempotente. Las revisiones
finalizadas siguen bloqueadas y las revisiones originales se conservan.

En inventario general, `inv_state` e `inv_events` mantienen su unidad interna
histórica para CRUJI cocinado. `lib/chicken-units.js` adapta la API solicitada
con `chickenUnit=pollos`: divide saldos/eventos/pendientes/conteos al mostrar,
y convierte los comandos de vuelta a la unidad interna al guardar. Todos los
formularios de `js/inventory.js` usan ese contrato explícito. No llamar a la
adaptación dos veces. Reversiones y conciliaciones trabajan con el evento original.
El contrato sin parámetro sigue disponible para integraciones antiguas.

Supervisión conserva IDs y valores históricos: las actividades con unidad interna
`piezas` se exponen como pollos mediante `areas`/`checks`; el guardado convierte
de vuelta según la actividad. El cliente manda `quantity_unit=pollos`; una
pantalla antigua sin esa unidad debe recargarse antes de capturar pollo.
Los controles que ya eran pollos no se dividen. Las piezas de insumos no cambian.

## Splash: revisión limitada solicitada

La imagen cuadrada previa corresponde al splash nativo de Android, que toma
el icono de `manifest.json`. La bienvenida propia utiliza únicamente
`icons/welcome-mascot.png`. No se encontró otro splash antiguo en la página.
Se conservan icono, manifest, bienvenida y sus tiempos; no seguir investigando
este punto sin una nueva indicación de Miguel.

## Pruebas y continuación

`test/chicken-units.test.js` cubre históricos, decimales, idempotencia,
conservación de saldos, reversión, conteos y unidades de supervisión.
`test/chicken_units_browser.py` usa APIs reales y PostgreSQL aislado para
Producción/mermas/dashboard, freír/vender CRUJI y supervisión con recarga.
No se capturaron datos de prueba en producción.

Leer este documento junto con `REPORTE_SESION_2026-09-22.md`: Rastro conserva
su botón de rectificación y el dashboard conserva sus tres días. El grafo de
código está en `graphify-out/`. La próxima sesión es para ajustes puntuales.
