# Supervisión simple y barras por horario — 10 octubre 2026

Estado: implementación local preparada y probada. No publicada; sin capturas ni mensajes en producción.

## Acuerdos de Miguel

Pantalla móvil limpia, lenguaje simple, sin botones de guardar ni comentarios obligatorios. Cuatro horarios y diez áreas con tres puntos de un punto cada uno, tomados de los formatos revisados con las transcripciones. Asistencia plegada y separada. Producción diaria se conserva en su módulo actual: esta entrega reorganiza Supervisión y su seguimiento, no modifica la ficha digital de producción.

Dashboard: barras de cuatro tramos por área, color por avance, porcentaje diario e historial. No grid de calificaciones. Meta de bono: 85% o más; sin cálculo ni pago automático del importe del bono.

## Reglas y continuidad

- Catálogo: `lib/supervision/control-points-catalog.json`. Copia de los puntos del papel aprobados hasta el cierre recibido el 10 de octubre. El comentario final de mediodía continúa truncado; no se inventó su continuación.
- Un registro separado por punto y horario. Cada corte tiene 30 puntos, tres por área. No hay pesos diferentes.
- Catálogo diario congelado; tabla `supervision_point_days`. Cambios y autor registrados en `supervision_point_events` con hora del servidor. No se reutilizan o reinterpretan las actividades históricas.
- Palomitas se guardan automáticamente; POST exige sesión de gerencia, mismo origen, JSON, día actual, horario ya iniciado y revisión vigente. Las revisiones concurrentes devuelven 409 y recargan la lista. Históricos se consultan desde Dashboard; no se editan.
- Rectificación de Miguel: solo está habilitado el horario actual. Antes de 10:00 apertura; desde 10:00 hasta antes de 12:00 mediodía; desde 12:00 hasta antes de 16:00 tarde; desde 16:00 hasta antes de 19:00 cierre. A las 19:00 todo queda cerrado. API rechaza registros y cambios de horarios pasados o futuros, incluso con pestañas viejas abiertas. Pantalla muestra reloj sincronizado con hora del servidor y cambia el horario automáticamente. Fotos, videos e inspección de cierre deben estar completos antes de 19:00; esto sustituye el cierre extendido propuesto previamente.
- Nota diaria: promedio de los cuatro cortes; en curso, solo los vencidos. Semana calendario lunes–domingo y mes calendario: promedio de notas de días completos registrados, excluyendo fechas sin historia nueva y días sin operación declarados en el calendario existente. Se muestran días incluidos. Umbral de bono con el porcentaje exacto, sin redondear para alcanzar 85%.
- Historial anterior: conserva las ponderaciones originales y sus promedios de 7/30 días, presentado como barras; no se mezcla con las nuevas notas ni se recalifica para bono.
- No se añadieron nuevos controles de N/A ni subida de archivos. Los puntos de evidencia verifican las fotos/videos que el equipo comparte en su grupo; esta implementación no envía archivos o mensajes. El manejo de evidencia permanece operativo.
- El primer día de uso es práctica; el inicio de evaluación se guarda una sola vez para el día siguiente. No recalifica fechas pasadas ni incluye el día de práctica en bonos.
- Telegram conserva el cálculo del checklist anterior; no se modificó su programación o envío. Si se quiere que también use estos puntos, coordinar esa actualización antes de activar los nuevos reportes en el grupo.

## Verificación

14 pruebas aprobadas: puntos, igualdad de peso, congelación por hora, correcciones tardías, semanas/meses, umbral 85%, días sin operación, permisos de calendario existente, migraciones e historial antiguo. API real con PostgreSQL aislado: guardado, autor y conflicto de revisión.

Recorrido de navegador con API real y base aislada: palomear, recargar, cuatro horarios, ausencia de tabla/grid en Dashboard, historial antiguo en barras, Asistencia plegada, ancho sin desbordamiento en 320/390/1280 y modos claro/oscuro. Build aprobado. Capturas: `test/results/points-*.png`.

No se tocaron los cambios ajenos que estaban presentes en skills y Formatos-Internos. No hubo commit, push ni despliegue.


