# Cómo probar FoodIA

FoodIA local está instalado en la computadora de Miguel. Permite ensayar compras conversando, con una base de prueba separada de la operación real. No hace falta conectar a Lilian ni contratar otro plan para estas pruebas.

## Empezar

1. Abre una nueva tarea en Codex y selecciona **FoodIA local - pruebas** en los plugins.
2. Escribe `$foodia-pruebas` y tu solicitud. Por ejemplo: **“Probemos una compra ficticia de Sam’s destinada a CEDIS.”**
3. Si la tarea actual aún no muestra el plugin, podemos hacer la misma prueba aquí mediante la consola local. No mantengas simultáneamente el plugin y la consola abiertos sobre la misma base.

Los registros de prueba se conservan entre sesiones. Los ejemplos de validación automática viven en otras bases y no se mezclan con tu piloto. El catálogo inicial existe, pero sus saldos son desconocidos hasta que indiquemos un conteo de prueba.

## Preparar una lista

Puedes decir: **“Hay cinco kilos de papa. Para Central prepara una lista de veinte kilos; el mínimo orientador es diez y el máximo veinte.”**

FoodIA busca el producto y su unidad, prepara el borrador y guarda la lista cuando se lo indiques. La existencia observada queda como referencia y no se suma ni sustituye automáticamente el inventario. Los mínimos/máximos no bloquean compras y la lista admite otros productos.

Si “papa” corresponde a más de un artículo, hay que precisar cuál. Si el artículo está en bolsas y la compra se dicta en kilos, hace falta la equivalencia real. No se adivina el peso de una bolsa.

## Registrar lo comprado

**“De esa lista compré 45 kilos a 18 pesos el kilo. Ya llegó todo a CEDIS. Es una prueba.”**

FoodIA prepara una compra de $810. Comprar más de lo previsto está permitido. Si el saldo inicial confirmado era cinco kilos, la recepción deja cincuenta kilos. Si el saldo inicial no se conoce, se puede guardar la compra pendiente de recepción y resolver el conteo antes de sumar existencias.

En Sam’s el destino predeterminado es CEDIS. Lilian verifica al comprar: no hace falta exigir otra revisión. Si lo comprado aún está en traslado, se registra la compra y se deja pendiente la entrada física.

## Capturar primero, completar después

**“Compré tres bolsas de arroz; todavía no tengo el precio.”**

Se aclara la presentación si hace falta, se registra la compra con costo pendiente y luego puede completarse: **“Completa el precio de esa compra: cada bolsa costó…”**. Los análisis señalan que el gasto está incompleto hasta completar los precios.

**“Llegaron cuarenta kilos; los cinco restantes llegan después.”** registra una recepción parcial. La siguiente llegada se vincula a la misma compra.

## Agregar un producto

**“También compré un producto nuevo; agrégalo a la compra.”**

Se busca primero para evitar duplicados. Si no existe, puede darse de alta desde la conversación con su nombre, unidad y clasificación. No hay que abrir la plataforma web ni estar en la lista original.

## Revisar, guardar y corregir

El borrador muestra qué se va a guardar y su efecto. Solo la respuesta de guardado con folio confirma la operación. Si hubo un error de conexión, se reintenta el mismo borrador: no se crea otra compra automáticamente.

Puedes pedir **“Corrige el costo de esa compra”** o **“Anula esa compra de prueba porque la capturé dos veces.”**. Las correcciones conservan historial. Una anulación que retire mercancía ya consumida requiere resolver la diferencia y no puede crear saldo negativo.

## Preguntas útiles

- “¿Cuánto compramos esta semana y qué costos siguen pendientes?”
- “¿Qué compras todavía no llegan completas?”
- “¿Cuánto arroz hay en CEDIS?”
- “Muéstrame las compras de papa y sus precios por kilo.”

El reporte de compras cubre lo registrado en FoodIA. No incluye automáticamente gastos antiguos, ni calcula utilidad completa sin ventas y otros costos.

## Lo que aún no está activado

El plugin remoto preparado para ChatGPT necesita configuración de acceso y prueba real de conexión. La voz directa con el conector en Android no está validada. Las fotos pueden ayudar a preparar datos en la conversación, pero el piloto no guarda imágenes de tickets en un archivo privado del servidor.

Los cambios web simplifican ChickenIA a Supervisión/asistencia, Dashboard y preguntas rápidas. Los servicios de inventario permanecen. Este piloto local no modifica esa base de producción.

Detalles técnicos y configuración futura: [FOODIA_PILOTO.md](FOODIA_PILOTO.md).
