# Cierre diario por foto · 18/09/2026

Propuesta CD-01 de una página carta horizontal, basada en la hoja fotografiada que usa el equipo. Miguel confirmó conservar resultados en dashboard/reportes, quitar solo los accesos de captura del dashboard y separar gastos de efectivo físico. La propuesta PDF aún requiere su revisión visual.

La habilidad cierre-caja (y el encaminamiento desde subir-gastos) lee la foto adjunta en conversación y utiliza la ficha real autenticada. No hay OCR automático del servidor ni lectura automática de WhatsApp. No se guarda el binario de la foto: se conserva nombre y SHA-256 en cada captura. Un archivo ilegible se aclara; vacío no es cero.

## Datos nuevos compatibles con capturas anteriores

- Caja: `photo` opcional con format/sourceFile/sourceSha256/coinsTotal/cardTotal. Conteo por billetes y monedas en total; tarjeta conjunta sin inventar crédito o débito. `expenses` conserva el total de gastos, con detalle opcional en movements. `toDeliver` siempre contado menos retained; gastos y primer turno no se suman a efectivo físico.
- Proteínas: `photo` opcional con referencia, quienes entregaron/recibieron y horas. `receivedRaw` y `done3` opcionales por renglón; `losses` por producto, estado, tipo, cantidad, unidad y motivo. El modo foto calcula solo Cruji/Rosti/costilla sin borrar ni desactivar cocina. Totales de producción no suman apertura ni llegadas.
- Una foto se guarda en dos borradores (caja y producción) con revisión optimista y trazabilidad. No hay transacción conjunta: verificar y comunicar el resultado de cada guardado. No crear compras, transferencias o movimientos Poster desde esta hoja. No duplicar gastos al completar detalles.

## Pantalla y reportes

La ficha recibe `format=photo`, `sha256` y `source`, además de date y mode. No acepta cambiar automáticamente de foto sobre un registro con otra huella. El dashboard conserva resultados pero no enlaza a formularios. Incluye gastos/tarjeta/transferencia y totales de pollo/costilla; el resumen de reportes usa los mismos datos. No se envían mensajes al guardar.

Los borradores anteriores continúan con su esquema y validación. Los finalizados permanecen de solo lectura. La foto simplificada no incluye todos los datos necesarios para finalizar: receptor, hora, referencia y autorizaciones pueden necesitar aclaración. No anunciar caja cuadrada si no hay datos para calcular la diferencia.

## Validación local

Pruebas de dominio y API, regresiones de reportes, y recorrido de interfaz contra respuestas aisladas (sin insertar datos reales). Comprobar publicación antes de usar con una foto operativa; ver HANDOFF_CAPTURA_DIARIA.md para el estado de despliegue.
