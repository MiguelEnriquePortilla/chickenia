# ChickenIA — diseño de inventario

Estado: implementación local terminada y validada, pendiente de activación en Vercel. Ver RELEASE_INVENTARIO.md para el alcance ejecutable, configuración y pruebas. Las secciones siguientes conservan el contexto de diseño.

## Corrección de alcance vigente — registro integral en ChickenIA

ChickenIA registra todo el inventario mediante captura directa: solicitudes, recepciones, producción, ventas, cortesías y conteos. No hay dependencia de sistemas externos.

Incorporar Ventas del día: artículo/presentación, cantidad, ubicación, responsable y hora efectiva. Descontar existencias mediante operación única y auditable, con correcciones vinculadas. Las cortesías se identifican y también descuentan producto. No deducir ventas del conteo físico: se registran ventas y conteos de manera independiente, y se comparan al cierre.

El modelo técnico utiliza ventas y renglones propios, no importaciones externas. El cierre revisa que las ventas estén capturadas, no sincronizaciones. La implementación inicial completa debe incluir captura de ventas. Las conversiones por presentación se validan con el catálogo existente. Eliminar leyendas de demostración y desconexión de las pantallas del producto; la propuesta sigue sin desplegar y los prototipos no escriben datos operativos.

## Operación confirmada

- CEDIS tiene Rastro y Almacén. Rastro contiene cámara de pollo enhielado (entero, limpio, sin marinar) y cámara de pollo marinado ROSTI/CRUJI. Almacén contiene seco, cámara de vegetales y espacio de limpieza.
- Sucursal recibe, prepara alimentos, rostiza, fríe, hornea y vende.
- Cocina solicita abastecimiento hacia las 16:00 considerando residual estimado. Nancy cuenta el residual real hacia las 19:00; el pedido se mantiene.
- Lilian prepara el abastecimiento y valida todos los pedidos a proveedores. Eliseo procesa pollo, recibe y cuenta pollo de proveedores, y transporta a Sucursal. Nancy valida recepciones.
- Nancy indica producción según experiencia de venta y existencias; se prepara reserva para al menos dos días. Eliseo registra preparación y Nancy la supervisa. Nancy captura cocción en Sucursal.
- Nancy realiza conteo semanal de todo CEDIS, idealmente antes de recibir pollo, y revisiones diarias.
- ROSTI se marina entero. CRUJI se corta en ocho piezas por pollo y usa otro marinado. La unidad de abastecimiento es pollo completo.
- FIFO físico por posición. No se requiere separar recalentado y nuevo en inventario operativo. Se conserva distinción marinado/cocinado para registrar transformaciones.
- Todas las cantidades vendidas y cortesías se registran directamente en ChickenIA.
- P significa porción variable por artículo; B significa bulto. Cero es cantidad explícita; un campo vacío significa pendiente de captura.
- Apertura de Sucursal debe separarse de apertura de Rastro.

## Pantallas propuestas

1. Control del día: pendientes de validación, existencias, producción y actividades.
2. Control de abastecimiento: solicitud, residual de cierre, envío, recepción y disponible tras recibir. Cada etapa conserva su responsable y fecha.
3. Inventario: CEDIS/Sucursal, existencias por artículo y estado, historial de movimientos.
4. Producción: preparación CEDIS y cocción Sucursal; entrada consumida y salida obtenida.
5. Conteos: saldo registrado, conteo físico y diferencia, con revisión de Nancy.
6. Ventas del día: captura por presentación y registro de cortesías, con descuento de inventario.
7. Actividades: rutinas por área sin duplicar validaciones de documentos.

## Reglas de saldos propuestas

- Solicitud no mueve inventario. Recepción de proveedor validada genera entrada externa.
- Preparación consume pollo enhielado y produce ROSTI/CRUJI marinado. Cocción consume marinado y produce cocinado. Nunca sumar la salida producida sin descontar su entrada.
- Envío consume saldo de CEDIS y crea saldo en tránsito. Recepción aceptada mueve tránsito a Sucursal. Diferencias permanecen identificadas para conciliación; no desaparecen ni se consideran venta.
- Residual es saldo existente, no nueva entrada. Disponible tras recepción = saldo previo del mismo artículo/estado + recepción aceptada. Para reposición usar saldo vigente, nunca residual inicial otra vez.
- Recalentado no crea existencias. Las ventas y cortesías registradas en ChickenIA descuentan el producto correspondiente.
- Conteo físico registra observación. No sobrescribe silenciosamente el saldo; cualquier conciliación requiere diferencia, motivo y validación.
- Mostrar disponibilidad prevista antes de validar y confirmada después. Campo sin capturar nunca equivale a cero.

## Modelo técnico propuesto

Ampliar el stack existente de funciones Vercel y Neon, sin reescribir la app.

- Ubicaciones y espacios de almacenamiento; áreas de actividades separadas conceptualmente.
- Catálogo de artículos/estados, unidad base y presentaciones con conversiones por artículo.
- Solicitudes y renglones; envíos y renglones; recepciones y renglones vinculados. Permitir entregas parciales.
- Órdenes/registros de producción con entradas y salidas.
- Conteos y renglones, validaciones y motivos de conciliación.
- Historial de movimientos con documento origen, artículo, ubicación, cantidad, unidad, responsable y hora del servidor.
- Ventas propias y renglones: presentación, cantidad, ubicación, responsable, hora y equivalencia a inventario; operaciones únicas y correcciones auditables.
- Usuarios y permisos reales en servidor. La selección de un nombre en la interfaz no equivale a autenticación.

Validaciones y movimientos de un documento deben confirmarse en una transacción. Clave de idempotencia por operación para evitar duplicados por reintento. No permitir consumo superior al saldo confirmado; detectar conflictos de concurrencia. Documentos confirmados se corrigen mediante operación vinculada y auditable, no edición silenciosa.

## Alcance y dependencias

Implementación propuesta: ubicaciones, catálogo, cuentas, saldo inicial y abastecimiento; después producción, captura de ventas y conteos. Todo se registra en ChickenIA.

El seguimiento completo inicia con pollo. Los demás insumos requieren captura de consumo ligada a producción o recetas verificadas. No inventar conversiones ni consumos. El equipo reutilizable no se descuenta como ingrediente.

Pendientes: equivalencias por artículo y paquete, porciones, bultos, fracciones y piezas; correcciones de ventas y conteos durante movimientos. Revisar el menú existente al incorporar paquetes.

Los prototipos no escriben a la base operativa. Deploy por GitHub; nunca snapshot directo a Vercel.

## Detalle propuesto: conteo y cierre

Dos vistas: cierre diario Sucursal y conteo semanal CEDIS. Cada renglón muestra artículo/estado, unidad, saldo según registros, captura física y diferencia. Sucursal muestra también la solicitud ya enviada para mañana, solo lectura. El alcance semanal real incluye todo CEDIS; las filas del prototipo son una muestra.

Un campo vacío es sin contar, no cero. Permitir guardar un conteo final únicamente con capturas completas del alcance seleccionado; requerir observación si hay diferencias. Guardar el conteo conserva el saldo contable y marca diferencias pendientes de conciliación. Antes de aplicar el residual a una recepción se debe resolver la diferencia o indicar explícitamente que el saldo sigue pendiente; nunca mostrar un saldo incierto como confirmado.

Cierre: verificar ventas capturadas hasta la hora de corte, contar y revisar diferencias. Una captura tardía conserva hora efectiva y obliga a revisar el cierre, sin duplicar descuentos. Las ventas no se deducen del conteo.

La conciliación distingue movimiento omitido, error de captura u otra diferencia investigada. Corregir el registro origen cuando proceda; ajustes excepcionales con motivo y Nancy como validadora. No clasificar ajustes como ventas. Definir la política antes de implementar ajustes sobre datos reales.

La captura demostrativa de ROSTI cocinado acepta cuartos de pollo; CRUJI cocinado usa piezas sin convertirlas aún a pollos. Son decisiones de interfaz propuestas, pendientes de revisar con las equivalencias del menú. No sumar indicadores de unidades diferentes en un total general.

## Detalle propuesto: Inicio de Nancy

Inicio por ubicación (CEDIS/Sucursal), con pendientes que abren sus documentos y existencias por artículo. No mezclar conteos de actividades con saldo de inventario en un porcentaje único. Priorizar recepciones por validar y diferencias; después preparación, solicitud y conteo programado. El prototipo ofrece navegación al detalle de ejemplo, no acciones sobre la base de datos.

Mostrar saldo confirmado separado del disponible previsto de recepciones sin validar. No sumar una recepción pendiente al saldo actual. Mostrar discrepancias de conteo sin sustituir el saldo registrado. Los documentos del inicio son ejemplos independientes de los otros prototipos, no una base compartida.

Inicio: acceso a Ventas del día y estado del cierre. No mostrar sincronización externa. Programar el conteo semanal antes de considerarlo vencido.

## Detalle propuesto: Ventas del día

Captura de cantidades por producto/presentación, tipo (venta o cortesía), responsable, fecha/hora y nota. Sin precios, cobros ni importaciones externas. Entero/medio/cuarto ROSTI descuentan 1/0.5/0.25 pollos; CRUJI por pieza descuenta piezas. No convertir piezas a pollos sin validar reglas de paquetes. No sumar unidades diferentes.

El prototipo muestra cada captura como un registro nuevo y limpia cantidad después de guardar para reducir repetición accidental. La implementación debe garantizar idempotencia en servidor y manejar correcciones vinculadas, sin descontar un total acumulado como si fuera otro movimiento. Se propone motivo obligatorio para cortesías. La identidad de Nancy en la propuesta no sustituye autenticación.
