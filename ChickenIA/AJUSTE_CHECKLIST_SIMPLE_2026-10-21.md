# Evaluación Equipo Chicanito — checklist sencillo y semana en Dashboard

Pedido posterior de Miguel, 21 octubre 2026: la evaluación se sobrecomplicó. Sustituir su pantalla por la misma lista de la ficha, con casilla y nota opcional. Separar captura y visualización; conservar menú lateral y registros anteriores. Autorizó implementar y publicar.

## Comportamiento vigente

- Captura en `/evaluacion-equipo.html`; `/supervision.html` redirige conservando fecha y área. Entrada del menú compartido: «Evaluación Equipo Chicanito». Asistencia sigue disponible al pie.
- Una ficha visible por área. Números, títulos, instrucciones y bloques de las fichas aprobadas. Casilla + nota opcional, guardado automático. Sin desplegables por actividad, botones repetidos, formularios de KPI, muestras, incidencias o extras.
- Dashboard: navegación lateral restaurada independientemente de que la consulta de resumen tenga éxito. Retirados los formularios completos. Tabla de ocho áreas por siete días, lunes a domingo, con tarjetas de porcentaje del checklist y enlace a área/fecha. Sin captura muestra «Sin revisión», distinto de un 0% registrado.
- Porcentaje = actividades palomeadas / actividades de la ficha × 100; sin KPI, extra, ponderaciones ni 120% en esta vista. El día seleccionado lleva contorno; 100% dorado, avance marino y sin revisión neutro. En móvil la tabla se desplaza horizontalmente dentro de su contenedor.
- Los cortes/evaluaciones anteriores se conservan para fechas previas a la activación; no se mezclan con el nuevo porcentaje.

## Conservación y guardado

Las tablas existentes se mantienen. `data.checklistPoints` guarda una capa independiente sobre los puntos previos: antes de la primera modificación se muestran las marcas existentes; las nuevas marcas no sobreescriben puntos originales, muestras, evaluaciones finales ni snapshots de reportes. Cada guardado conserva actor/hora y evento con control de revisión.

Captura solo del día actual; fechas anteriores son consulta. La confirmación general de Caja sigue reservada a Lilian. Cambios rápidos se guardan en orden, notas con espera breve; ante error la selección permanece y ofrece reintentar, sin falso «Guardado». Conflictos requieren revisión/reintento explícito. La tabla usa snapshots y versiones de ficha de cada fecha.

## Verificación

Pruebas nuevas en `test/equipo-checklist.test.js`: semana lunes–domingo, sin revisión vs cero, cálculo por checklist, conservación de evaluación cerrada, SQL real aislado, guardado/recarga y rechazo de conflictos/histórico. Se mantienen las pruebas de dominio anteriores para acreditar compatibilidad.

Navegador con API real y PostgreSQL aislado: `test/equipo_checklist_browser.py`. Comprueba casillas y nota persistidas, error/reintento, ausencia de formularios por actividad, menú lateral, 8×7 tarjetas, enlace exacto a ficha/fecha, histórico de solo lectura, móvil y modo oscuro. Se repite regresión de tarjetas/tabla semanal de proteínas. No se usan capturas operativas ni mensajes reales para probar.

La verificación de publicación se añadirá al completar la entrega. No volver a introducir formularios adicionales sin indicación de Miguel.
