# Evaluación Equipo Chicanito — checklist sencillo y semana en Dashboard

**Estado final aceptado y sesión cerrada:** [cierre vigente con 120% y compartir](CIERRE_EVALUACION_120_COMPARTIR_2026-10-21.md). Código publicado `bf27589`. Esperar nuevas indicaciones.

## Ajuste posterior autorizado: conservar 120% y compartir

Miguel aclaró que deben mantenerse las actividades adicionales y el botón de compartir, sin volver a los formularios complejos. Se recuperan las tres propuestas por área al pie de la ficha: casilla + comentario opcional, guardado automático. Ficha completa (100%) y al menos una actividad extra verificada suman 20 puntos; máximo 120% aunque se marquen varias. Con la base incompleta se conserva la actividad extra, pero no suma el bono. Lilian o Miguel verifican extras de Supervisión.

«Compartir esta área» y «Compartir todo el equipo» preparan una vista previa de WhatsApp con ficha, avance y lista de extras. El Dashboard también tiene «Compartir avance» general. Los comentarios internos no se incluyen. Se guarda el mensaje y snapshot en el histórico; abrir WhatsApp no acredita envío. No hay envío automático.

Las capturas anteriores, incluidas las actividades extra verificadas de la primera versión, se conservan. Las nuevas casillas extra se guardan en `simpleExtras`, sin sobreescribir su evaluación original. La tabla semanal y los reportes usan el mismo cálculo sencillo hasta 120%. Los apartados inferiores documentan la entrega anterior antes de esta aclaración.

**Entrega aceptada y sesión cerrada por Miguel.** Leer [cierre vigente](CIERRE_CHECKLIST_SIMPLE_2026-10-21.md). Esperar nuevas indicaciones; sin cambios ni capturas automáticas pendientes.

Pedido posterior de Miguel, 21 octubre 2026: la evaluación se sobrecomplicó. Sustituir su pantalla por la misma lista de la ficha, con casilla y nota opcional. Separar captura y visualización; conservar menú lateral y registros anteriores. Autorizó implementar y publicar.

## Comportamiento vigente

- Captura en `/evaluacion-equipo.html`; `/supervision.html` redirige conservando fecha y área. Entrada del menú compartido: «Evaluación Equipo Chicanito». Asistencia sigue disponible al pie.
- Una ficha visible por área. Números, títulos, instrucciones y bloques de las fichas aprobadas. Casilla + nota opcional, guardado automático. Actividades de 120% también con casilla y comentario. Sin desplegables por actividad, botones repetidos ni formularios de KPI, muestras o incidencias.
- Dashboard: navegación lateral restaurada independientemente de que la consulta de resumen tenga éxito. Retirados los formularios completos. Tabla de ocho áreas por siete días, lunes a domingo, con tarjetas de porcentaje del checklist y enlace a área/fecha. Sin captura muestra «Sin revisión», distinto de un 0% registrado.
- Base = actividades palomeadas / actividades de la ficha × 100; sin KPI ni ponderaciones. Con base completa y al menos un extra verificado se agregan 20 puntos, máximo 120%. El día seleccionado lleva contorno; 100%/120% dorado, avance marino y sin revisión neutro. En móvil la tabla se desplaza horizontalmente dentro de su contenedor.
- Los cortes/evaluaciones anteriores se conservan para fechas previas a la activación; no se mezclan con el nuevo porcentaje.

## Conservación y guardado

Las tablas existentes se mantienen. `data.checklistPoints` guarda una capa independiente sobre los puntos previos: antes de la primera modificación se muestran las marcas existentes; las nuevas marcas no sobreescriben puntos originales, muestras, evaluaciones finales ni snapshots de reportes. Cada guardado conserva actor/hora y evento con control de revisión.

Captura solo del día actual; fechas anteriores son consulta. La confirmación general de Caja sigue reservada a Lilian. Cambios rápidos se guardan en orden, notas con espera breve; ante error la selección permanece y ofrece reintentar, sin falso «Guardado». Conflictos requieren revisión/reintento explícito. La tabla usa snapshots y versiones de ficha de cada fecha.

## Verificación

Pruebas nuevas en `test/equipo-checklist.test.js`: semana lunes–domingo, sin revisión vs cero, cálculo por checklist, conservación de evaluación cerrada, SQL real aislado, guardado/recarga y rechazo de conflictos/histórico. Se mantienen las pruebas de dominio anteriores para acreditar compatibilidad.

Navegador con API real y PostgreSQL aislado: `test/equipo_checklist_browser.py`. Comprueba casillas y nota persistidas, error/reintento, ausencia de formularios por actividad, menú lateral, 8×7 tarjetas, enlace exacto a ficha/fecha, histórico de solo lectura, móvil y modo oscuro. Se repite regresión de tarjetas/tabla semanal de proteínas. No se usan capturas operativas ni mensajes reales para probar.

Publicado: commit funcional `45c3431` enviado a `origin/main`. Vercel confirmó despliegue `dpl_BL9zWd6d6vPLE4rFh55j1vw5c7uB`, READY, production. Lectura autenticada del checklist publicado comprobó las marcas existentes de Rastro (15/15) sin cambiarlas, casillas/notas y menú lateral con acceso a Evaluación Equipo Chicanito. Dashboard publicado verificado: menú lateral, ocho áreas × siete días, porcentajes de marcas existentes (incluido Rastro 100%), «Sin revisión» para fechas sin captura y enlaces con área/fecha; tarjetas/tablas de proteínas conservadas.

Validación: 23 pruebas automatizadas y dos recorridos de navegador aprobados (checklist/semana y regresión de proteínas). No se hicieron capturas operativas ni envíos de prueba en producción. No volver a introducir formularios adicionales sin indicación de Miguel.
