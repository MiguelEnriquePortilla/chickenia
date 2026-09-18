# Acceso local

Proyecto: `C:/Users/hp/Desktop/CHICANITO/02-OPERACION/ChickenIA`.
Node disponible: `C:/Users/hp/AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe`.

Prepara un JSON en `work/` del espacio de la conversación con apply_patch. Ejemplo de consulta (sustituye fecha):

```json
{"action":"cashGet","date":"2026-09-17"}
```

Ejecuta el comando desde el proyecto:

```powershell
& 'C:/Users/hp/AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe' scripts/foodia-local.js --input 'RUTA_ABSOLUTA_DEL_JSON'
```

Para guardar, usa `action:cashSave`, la misma `date`, `revision` recibida, `data` completo con cambios autorizados y `finalize:false`. No envíes totales calculados dentro de data. `cashGet` devuelve todos los campos, incluidos null, y `totals.missing`. Consulta `lib/cash-close.js` solo si hace falta aclarar campos.

Campos principales: cash.opening=caja chica; cash.cashSales=cobros antes de devoluciones; otherIn=entradas; refunds=devoluciones; expenses=gastos; firstTurn=entrega primer turno; withdrawals=otros retiros; otherCoins=monedas fuera del desglose; retained=dinero dejado; delivered=entregado. counts.b1000/b500/b200/b100/b50/b20 son billetes; m20/m10/m5/m2/m1/m050 son monedas. payments usa cash/credit/debit/transfer/other con expected y confirmed. Todos los importes en centavos.

Para abrir la ficha, inicia `scripts/foodia-local.js --cash-web` desde el proyecto, en proceso oculto, y lee el URL 127.0.0.1 del log. Usa una instancia ya abierta cuando el usuario la tenga; no lances servidores repetidos. La base persistente es `.local/foodia-pilot/postgres`; cada operación toma y libera el lock existente. No borrar locks sin comprobar el proceso dueño.

Ante error, conservar el borrador y comunicar el motivo. Nunca cargar credenciales de producción ni cambiar FOODIA_TEST_INSTANCE para ocultar un conflicto.
