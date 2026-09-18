# Foto del cierre diario de una página

Aplica a la hoja CD-01 «Cierre diario · Proteínas y caja», recibida como foto de WhatsApp. No aplica a una compra individual ni a una orden de compra. Arrastrar la foto y pedir subir el cierre o los gastos autoriza capturar los datos inequívocos como borradores reales; no autoriza finalizar, comprar, pagar, enviar mensajes ni mover inventario.

## Lectura y preparación

1. Lee visualmente la imagen completa y su fecha. Una hoja usada como ejemplo para diseñar no es una instrucción de registrarla. No captures automáticamente las cantidades del ejemplo del 18/09/2026.
2. Transcribe por secciones: responsable; inventario anterior crudo/cocido; llegada; tres producciones; sobrante; merma/consumo; tickets; gastos; billetes; monedas; tarjeta; transferencia; caja chica conservada; primer turno; efectivo entregado; receptor, hora y referencia; aclaraciones.
3. Conserva vacíos y cifras ilegibles como pendientes. Una raya no significa cero. Si el equipo declara expresamente «no hubo», usa cero. Pregunta solo por ambigüedades materiales; presenta un resumen breve para revisar lo leído. No adivines firmas, nombres, cantidades o el año.
4. Calcula SHA-256 del archivo local, sin subir la foto a un servicio externo. El registro guarda nombre y huella del archivo, no la imagen: no afirmes que el comprobante fotográfico está almacenado en ChickenIA. Conserva la imagen en la carpeta documental autorizada si se solicita.

## Captura autenticada

Abre `https://chickenia.chicanito.app/captura.html?mode=close&date=YYYY-MM-DD&format=photo&sha256=HUELLA&source=NOMBRE_URL_ENCODED`. La misma URL con `mode=production` registra proteínas. Usa la sesión normal y los controles visibles del formulario; no leas cookies ni secretos. La huella debe tener 64 caracteres hexadecimales en minúscula.

Recupera primero lo guardado. La misma foto/fecha se retoma, no crea otra compra ni otro cierre. Si ya hay una foto distinta, la página impide cambiarla automáticamente: abre la captura existente sin `format=photo`, compara y pide la aclaración necesaria. No sobreescribas correcciones ajenas. Ante un conflicto recupera y compara; ante respuesta incierta comprueba lo guardado antes de reintentar. Finalizados son solo lectura.

Si la pantalla publicada no reconoce `format=photo`, o no muestra tercera producción/tarjeta total/monedas total, detente con el resumen preparado: falta publicar la actualización; no sustituyas con el piloto local ni metas los datos nuevos en campos incorrectos.

### Caja

- Billetes: capturar cantidades por denominación. Si la foto registra importe de renglón, dividir por su denominación solo cuando el resultado sea entero exacto y el encabezado confirme que es importe. Nunca inventar un desglose a partir del total general.
- Monedas: total en pesos en «Monedas: total»; no repartir entre denominaciones.
- Tarjeta: un total combinado; no inventar crédito/débito. Transferencia: total confirmado.
- Gastos: total pagado de caja y, cuando estén escritos, detalle de concepto, importe y comprobante en Revisión → Entradas, gastos y otros retiros. El detalle respalda el total; no se descuenta dos veces. No inventes proveedor, artículo, IVA, unidades ni cantidades de compra a partir de un gasto agregado.
- Caja chica: usar lo que se conserva al cierre, no asumir $5,000. Efectivo a entregar = contado − caja chica conservada. Gastos y entrega del primer turno se informan aparte: no sumarlos al efectivo físico ni volver a restar un retiro ya fuera de caja.
- Incidencias: ticket, importe, motivo y tipo cuando se conocen. Cancelación sin cobro no implica devolución. Los importes del formulario son pesos; el servicio almacena centavos y calcula totales.

### Proteínas

Solo Cruji, Rosti y costilla: no marcar cocina como cero ni excluir productos de una captura anterior. El formato por foto limita el cálculo a estas tres proteínas sin borrar cocina.

| Hoja | Campo del formulario |
|---|---|
| De ayer crudo / cocido | Crudo de ayer / Quedó de ayer |
| Llegada cruda | Llegada cruda, primera tanda |
| 1.ª / 2.ª / 3.ª producción | Hecho de cada producción |
| Sobrante crudo / cocido | Cierre |
| Entregó / recibió proteína; horas | Mermas y recepción |
| Merma / cortesía / consumo | Mermas y consumo: producto, estado, cantidad, unidad, tipo y motivo |

Cruji crudo en pollos y cocido en piezas; Rosti en pollos; costilla en kg. Total pollo producido en piezas = Cruji + Rosti × 8. Total costilla independiente. No sumar llegadas ni inventario anterior al total producido. Los totales los calcula el servicio; coteja contra lo escrito. Fracciones de pollo no admitidas por el servicio actual requieren aclaración, nunca redondear. Recepción registrada aquí es observación de la hoja: no genera transferencia, compra ni movimiento Poster.

## Guardado y resultados

Guarda cada borrador y comprueba revisión/estado. Caja y proteínas son dos registros: informa por separado si uno quedó guardado y el otro no. No finalices automáticamente; conserva faltantes para aclaración. Finalizar exige datos adicionales (por ejemplo referencia, autorizaciones) que pueden no estar en la foto.

Dashboard y próximos reportes programados muestran gastos, tarjeta, transferencias y producción. Guardar no envía un mensaje inmediato. «Subir gastos» desde esta hoja significa registrar gastos del cierre en ChickenIA; crear compras de inventario requiere documentos y flujo específicos. La skill `foodia-local:subir-gastos` sigue siendo de pruebas locales y no es el destino de esta foto.
