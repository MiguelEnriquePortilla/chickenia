# Acceso local

Proyecto: `C:/Users/hp/Desktop/CHICANITO/02-OPERACION/ChickenIA`.
Node: `C:/Users/hp/AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe`.

Usa apply_patch para preparar un JSON en work/ de la conversación:

```json
{"action":"productionGet","date":"2026-09-17"}
```

Desde el proyecto ejecuta:

```powershell
& 'C:/Users/hp/AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe' scripts/foodia-local.js --input 'RUTA_ABSOLUTA_DEL_JSON'
```

Devuelve data, catalog, revision y totals. Para guardar usa action=productionSave, date, revision recibida, data completo y finalize=false. El catálogo define IDs y unidades. Líneas: previousRaw/previousCooked, plan1/done1, plan2/done2, closingCooked/closingRaw. Las cantidades son humanas (kg, litros, porciones, piezas o pollos), no milésimas. Las unidades previas y finales de crudo se obtienen de catalog.rawUnit.

La ficha compartida se abre con `scripts/foodia-local.js --cash-web`; el servidor imprime un URL de 127.0.0.1. Usa proceso oculto y elige la pestaña Producción. Reutiliza la ficha abierta si existe. No depende de una sesión de Neon ni de credenciales de producción. No borres la base ni sus locks.

Para campos adicionales consulta lib/production-daily.js. No regeneres el catálogo al guardar ni descartes renglones no mencionados. Los datos se conservan en la misma base local que las otras skills de foodIA.
