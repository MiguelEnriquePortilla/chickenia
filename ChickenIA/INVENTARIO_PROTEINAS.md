# Actualizacion 24/09/2026

La captura cotidiana usa fichas fijas como Rastro y un guardado atomico para ambas
proteinas. Ver [handoff vigente](HANDOFF_PROTEINAS_2026-09-24.md). Las reglas de
inventario documentadas abajo se conservan; el selector queda para operaciones especiales.

# Inventario de Proteínas — 21 septiembre 2026

Implementado y probado localmente. Miguel aprobó la publicación por GitHub/Vercel
el 21 de septiembre de 2026. Las pruebas no cargaron existencias en Neon.
No confundir las capturas de pruebas con inventario real.

## Ajuste aprobado: captura sencilla y rectificación

Miguel pidió simplificar el lenguaje después de que una salida se capturara como
pollo que seguía en CEDIS. La pantalla y el dashboard ahora dicen «pollos que quedan
en CEDIS», «sin marinar» y «Pollos Marinados en CEDIS». Un aviso explica:
**hay 180 − salen 30 = quedan 150**. El botón **SALIDA A SUCURSAL** abre la salida;
la vista previa calcula la resta real antes de guardar. Llegadas de proveedor y
salidas son opciones distintas; ya no se selecciona una entrada por defecto.

**RECTIFICAR INVENTARIO** permite a supervisión/gerencia (rol manager) escribir
las dos cantidades reales que quedan en CEDIS, con campos vacíos, motivo obligatorio
y confirmación de antes/después. Es una corrección del saldo, no una edición o
anulación de envíos. Si únicamente falta registrar una salida, se usa SALIDA A
SUCURSAL para que la entrega y su recepción queden vinculadas. No se corrigen
automáticamente cifras de la foto ni se infieren cantidades reales.

La rectificación agrega dos movimientos `protein-adjustment` con diferencias
firmadas (pueden ser negativas o cero), una operación común y ambos estados antes
y después. Se conservan los originales, usuario autenticado, fecha operativa, hora
de servidor y motivo. No cuenta como compra, marinado, merma, salida o recepción.
Dashboard, semana e historial muestran las rectificaciones por separado. No altera
envíos ni recepciones ya confirmadas. Un conteo anterior conserva su diferencia y
avisa que hubo movimientos posteriores.

Se exige apertura previa. No se permite rectificar antes de registros posteriores
de la misma proteína, ni insertar movimientos de stock con fecha anterior a una
rectificación posterior. Así las cantidades verificadas no cambian silenciosamente.
Se rechazan rectificaciones sin cambios, cantidades negativas, fechas futuras,
permisos insuficientes y repeticiones con revisión vieja. Todo es transaccional;
no crea tablas ni modifica los saldos durante el despliegue.

Validación de este ajuste: 29 pruebas de dominio/API/PostgreSQL y regresión;
recorrido en navegador con API real local, cancelación/confirmación, persistencia,
historial, dashboard, temas día/noche y móvil/escritorio. Los datos de prueba se
mantienen en PostgreSQL temporal, sin capturas reales en Neon.

## Acuerdos de Miguel

- Apartado independiente en Supervisión y Asistencia, junto a Caja, Producción y Rastro.
- Rostizado y Crujiente tienen **Pollo por preparar** y **Pollos Marinados**.
- Ambos estados están físicamente en CEDIS / Rastro. Los marinados están listos para
  llevar a Sucursal. No se incluyen en el saldo por preparar.
- La columna antigua «piezas sueltas» se llama **Pollos Marinados**. Sus cantidades
  ya representan pollos: 100 son 100 pollos, no 12.5.
- Este apartado captura **pollos con hasta tres decimales**. Sustituye aquí la regla
  anterior de piezas. No convierte ni modifica los registros de Producción Diaria.
- Ejemplo de referencia: 232 por preparar + 100 marinados = 332 en CEDIS. Enviar 60
  deja 232 por preparar y 40 marinados. Ninguna cifra del ejemplo se precarga.

## Flujo y controles

Gerencia registra una apertura por proteína con ambos estados, incluso cero.
Sin apertura se muestra «Sin captura», sin asumir cero. Cada operación conserva
usuario autenticado, hora del servidor, fecha operativa y observaciones.

1. Proveedor: suma al pollo por preparar.
2. Marinar: descuenta por preparar y suma marinados en la misma transacción, 1:1.
3. Enviar: descuenta marinados; mañana, mediodía u otra entrega, sin límite de envíos.
4. Recibir: Sucursal confirma el total contado de un envío. No está prellenado.
   Puede ser cero o diferir de lo enviado; una diferencia exige explicación.
   La confirmación es única. No es una recepción parcial: confirma toda esa entrega.
   No vuelve a descontar CEDIS ni pretende calcular la existencia actual de Sucursal.
5. Conteo físico: ambos estados, sin prellenado; compara con lo calculado y conserva
   diferencias, sin ajustar automáticamente el saldo. Requiere motivo si difiere.
6. Merma: salida explícita del estado seleccionado y motivo obligatorio.
7. Rectificar inventario: guarda las cantidades reales en CEDIS con historial de
   antes/después y motivo. Disponible para manager, como la apertura.

Gerencia abre existencias; manager/processor/dispatch registran operaciones en
CEDIS; manager/kitchen confirma recepción. El resumen del dashboard exige manager.
Se conserva el acceso compartido de piloto vigente, que actualmente asigna manager
a sus usuarios: no se ha convertido en permisos individuales más restrictivos.

Revisión optimista y bloqueo de la ubicación evitan duplicados y escrituras
concurrentes. Un error revierte toda la operación. Se rechazan saldos negativos
también en fechas posteriores a una captura retroactiva, fechas futuras, aperturas
duplicadas y cantidades con más de tres decimales. No se permiten movimientos de
stock con fecha anterior a un conteo posterior de esa proteína, para preservar
el saldo contra el que se verificó. No hay borrado ni edición de movimientos.

## Persistencia e integración

Se reutilizan `locations` (`rastro`), `inventory_items` e `inventory_movements`.
No se crean tablas adicionales. La primera escritura autorizada agrega, de forma
idempotente, cuatro artículos `PRO-ROSTI-RAW`, `PRO-ROSTI-MAR`, `PRO-CRUJI-RAW` y
`PRO-CRUJI-MAR`, todos en pollos. GET no crea artículos ni existencias.

El catálogo publicado fue consultado: `RAS-001` a `RAS-012` corresponden a insumos,
costilla, limpieza y utensilios; no representan estos cuatro estados del pollo.
El artículo anterior `POL-001` dice «pieza/entero» y no permite inferir estos saldos;
no se convierte ni importa automáticamente. Tampoco se importa ni agrega el motor
anterior `inv_state`: es independiente y tiene otra clasificación y unidades.
Para operar este control, registrar aperturas verificadas y sus movimientos aquí;
no contabilizar el mismo movimiento también en el motor anterior.

Tipos de stock: `initial`, `entry`, `exit`, `protein-adjustment`. Conteos y recepciones usan
`protein-count` y `protein-received`, sin efecto en el saldo de CEDIS. `notes` guarda
el motivo, acción, usuario, vínculo de envío y un identificador común por operación.
Rastro consulta solo su catálogo, excluyendo estas proteínas. El endpoint antiguo
de movimientos rechaza escribir los nuevos artículos, incluso en otra ubicación.

- Pantalla: `proteinas.html`, `js/protein-inventory.js`, `css/proteins.css`.
- API autenticada: `api/protein-inventory.js`.
- Cálculos y persistencia: `lib/protein-inventory.js`.
- Presentación compartida con dashboard: `js/protein-view.js`.
- El resumen usa la fecha seleccionada y se actualiza con el dashboard cada minuto.
- Semana lunes a domingo: movimientos acumulados hasta la fecha seleccionada y
  existencias al cierre de esa fecha, sin sumar existencias entre días.
- Confirmaciones y conteos muestran responsable, hora y diferencias. El conteo
  avisa si hubo movimientos posteriores.
- No se activan reportes de Telegram nuevos ni se modifica su contenido.

## Validación local

`npm run test:daily`: captura, Rastro y nuevas pruebas de proteínas (PostgreSQL
temporal, errores, concurrencia/revisión, decimales, cronología, roles y origen).
También se verificaron inventario anterior, proteínas anteriores, acceso piloto,
rutinas y separación de Rastro/Sucursal. Compilación mediante `npm run build`.

`NODE_BINARY=<ruta de node> python test/protein_browser.py`: API real del nuevo
apartado sobre PostgreSQL en memoria; las demás API del dashboard usan datos de
prueba explícitos. Comprueba aperturas, envío, marinado, recepción con diferencia,
conteo, persistencia al recargar, error sin perder captura, fechas históricas,
enlace desde Supervisión, tema claro/oscuro y anchos 390/1280.
El servidor temporal finaliza al acabar. Imágenes en `test/results/proteins/`.

Para publicar se usa el despliegue existente por GitHub/Vercel. No requiere cargar
SQL manual ni copiar bases locales. La ubicación Rastro y las tablas existentes
deben seguir disponibles; la primera apertura real la registra gerencia.
