# Controles e indicadores iniciales de ChickenIA

## Qué cambia

Supervisión y Dashboard incorporan los cuatro controles acordados: 09:30 apertura, 12:00 comida, 16:00 ajuste de producción y 19:00 cierre. Cada control distingue reporte completo de operación lista. La lista anterior conserva su avance y sus reportes históricos, identificada como checklist.

El indicador de Supervisión es controles cumplidos completos y a tiempo / controles exigibles. Las áreas muestran su cumplimiento por corte, además de acumulados de 7 y 30 días; no se suman kg con pollos ni se castigan cortes futuros. Meta inicial: 100%. Rastro y Almacén se verifican contra solicitudes en cada corte; esta primera versión registra la verificación de Supervisión, no calcula automáticamente puntualidad por cada entrega individual.

Los indicadores de Móvil se muestran por separado, sin puntuación: falta acordar horarios y unidad. No se mezclan los registros diarios de Jojutla con otras ubicaciones. No hay cálculo ni pago automático de bonos.

## Uso

1. Entrar con la sesión de Supervisión. Abrir Supervisión o Dashboard y elegir la fecha.
2. Guardar las cantidades en Producción Diaria. Definir los productos aplicables antes de la primera verificación que use esa producción. El conjunto se conserva durante el día para no quitar productos pendientes después del corte.
3. Abrir el control correspondiente. Verificar las condiciones con cada área, registrar incidencias y acciones. En cada producto, confirmar cantidad disponible y calidad; la producción se lee del formato existente.
4. A las 16:00 registrar cantidad en proceso, venta restante estimada, producción adicional acordada, decisión de continuar/reducir/detener y motivo. La decisión no genera otra producción ni movimientos de inventario.
5. Al cierre, finalizar Producción Diaria y Caja; comprobar sobrantes contra el conteo y caja sin diferencias. En el formato digital de Caja se añadieron apartados de datos para el cuadre y ventas por forma de pago. Completarlos antes de finalizar; un formato antiguo incompleto no se considera cuadrado automáticamente.
6. Guardar la revisión. Se admiten revisiones incompletas para documentar pendientes; la pantalla muestra qué falta. Si cambió la producción, actualizar y volver a revisar productos. El historial conserva cada versión, responsable y hora.

## Tiempo y evidencia

- La evaluación empieza el día siguiente a la primera inicialización de los indicadores. La fecha exacta aparece en pantalla y queda guardada una sola vez. El día inicial permite práctica sin calificación. No se recalifican días previos.
- Se consideran jornadas diarias de Jojutla; no se ha implementado calendario de días cerrados ni excepciones. Los horarios generales son los acordados por Miguel.
- Se guarda hora del servidor. Para cada corte, la última verificación guardada hasta su límite define el resultado. Las revisiones posteriores se muestran como correcciones, sin convertir retrasos en puntualidad.
- Los registros de evaluación son independientes de Telegram. Un retraso o falla de entrega del aviso no modifica la evaluación.
- Las verificaciones de condiciones operativas son declaraciones firmadas por la sesión de Supervisión. Producción y caja se contrastan además contra sus versiones guardadas; no afirmar que todas las condiciones se detectan automáticamente.
- Al cierre se exige diferencia cero de efectivo, entrega, ventas y formas de pago, además de coherencia entre tarjeta total y crédito/débito, y entre venta en efectivo y cobro neto de devoluciones.

## Cambios técnicos

- Catálogo, cálculo, almacén de revisiones y API: `lib/supervision/kpi-*.js` y `kpi.js`.
- Endpoint autenticado: `/api/summary?kpi=1&date=YYYY-MM-DD`; POST requiere sesión de gerencia, origen local y JSON. Rechaza versiones obsoletas y captura de fechas pasadas/futuras; no acepta anticipar un corte posterior antes de iniciar su etapa.
- Tablas nuevas: `supervision_kpi_config`, `supervision_kpi_heads`, `supervision_kpi_events`. No se borra ni transforma historial existente.
- Interfaz compartida: `js/kpis.js` y `css/kpis.css` en Supervisión y Dashboard.
- Horarios de Telegram: 15:30, 18:00, 22:00 y 01:00 UTC, equivalentes a 09:30, 12:00, 16:00 y 19:00 CDMX. Sustituyen 14:00 y 17:00 por 16:00. No se enviaron mensajes de prueba al grupo.
- Los informes históricos anteriores al 5 de octubre conservan el calendario previo; las capturas nuevas llevan la etiqueta de su corte.

## Verificación

Pruebas de lógica, API y PostgreSQL aislado: puntualidad, revisiones tardías, cortes futuros, historia, concurrencia, permisos, integridad del catálogo, calidad, decisiones de producción y cuadre de caja. Recorrido de navegador con API real y base temporal: registro y recarga, productos, ajuste de las 16:00, datos de Caja, Supervisión y Dashboard en móvil/escritorio y claro/oscuro. Ningún registro de prueba se crea en producción.

Guion de reunión: `GUION_REUNION_KPIS.md`. La propuesta previa se conserva como antecedente; este documento describe la implementación inicial.
