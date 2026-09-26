# Ajustes operativos y reinicio de Proteínas — 25/09/2026

## Estado al cerrar

Publicado `ba40898` por GitHub/Vercel. Miguel confirmó que quedó listo y pidió cerrar. Los nueve ajustes se comprobaron en producción. Reinicio real completado una sola vez: revisión 133 → 157, cuatro saldos en cero y cero pendientes al verificar. **No volver a ejecutarlo ni asumir que los saldos siguen en cero.** Leer [reporte de cierre y continuidad](REPORTE_SESION_2026-09-25.md).

## Catálogo vigente

- Zanahoria en palitos para campesina pasa de Cocina a Freidoras, en kg.
- Rosticero: retirar recepción/montaje de producción inicial de Cocina/Freidoras y verificación de desechables, consumibles y adobo envasado de apertura.
- Ventas/Barras: detallar arranque con Cruji, papas gajo, campesina, salsas, ensalada de col, puré, codo, desechables y consumibles.
- Hidratación incluye ensaladas. Hidratación y atención al cliente se califican con porcentaje entero 0–100; al verificar, aportan su porcentaje del peso al Dashboard y nuevos cortes de Telegram. Los cortes ya enviados no se recalculan.
- Promo del día reemplaza promociones/ensaladas; exige especificar la promoción en Observaciones al verificarla. No queda una métrica separada de ofrecer ensaladas.
- Cierre parcial de barra exige conteo por producto y autorización manager con la sesión actual. Guarda productos, unidades, cantidades, responsable y hora del servidor. El conteo es evidencia; no genera una salida ni altera automáticamente inventario. Cruji en pollos, acompañamientos en kg.
- Supervisión: retirar Preparar el reporte de apertura.

`lib/supervision/operational-adjustments.js` aplica una migración atómica, idempotente y vigente desde el día de activación. Solo versiona las actividades afectadas. Sus capturas anteriores se conservan con sus IDs; las nuevas métricas requieren nueva verificación. Los catálogos anteriores permanecen como fuentes históricas de las migraciones iniciales: no editar sus versiones para actualizar producción. `scripts/sync-training-rastro.js` aplica también los ajustes a entrenamiento.

## Reinicio de Proteínas

Miguel pidió explícitamente limpiar el ciclo de ambas proteínas hoy para realizar arqueo y recibir pollo mañana. Botón **REINICIAR PROTEÍNAS**, junto a RECTIFICAR INVENTARIO, con la misma autorización manager del piloto. No se cambia la clave ni el régimen de acceso.

- Solo hoy, motivo y confirmación obligatorios, revisión de concurrencia y bloqueo de escritura.
- Una sola transacción registra cuatro marcas `protein-reset`, inicia Rostizado y Crujiente en cero (sin marinar y marinados) y cierra el ciclo anterior.
- Los acumulados, conteos y recepciones pendientes anteriores no pasan al nuevo ciclo. No permite recibir un envío del ciclo anterior ni escribir movimientos en fechas anteriores al reinicio.
- Conserva los registros originales, responsable, motivo y saldo previo en bitácora; no borra tablas, catálogos ni inventario de otros artículos. Las fechas históricas anteriores siguen consultables.
- Después se usa RECTIFICAR INVENTARIO para el arqueo físico de hoy y las fichas habituales para movimientos nuevos. La fecha elegida permanece en la URL al recargar.

## Validación

67 pruebas de dominio/API/PostgreSQL aislado aprobadas, incluidos porcentaje real en Dashboard/cortes, notas obligatorias, autorización, migración repetida, reinicio atómico, fallo intermedio, concurrencia, decimales y preservación de otros artículos. Recorridos de navegador con API real y PostgreSQL desechable en móvil/escritorio, claro/oscuro. Construcción estática correcta.

No usar capturas de prueba en Neon. Los archivos `.local/protein-reset-2026-09-25-before.json` y `.local/protein-reset-2026-09-25-result.json` existen y documentan el antes y resultado del único reinicio real solicitado. No repetir ese reinicio al retomar.
