**Publicado y aceptado; sesión cerrada.** Commit funcional `60cb5b2`, Vercel success y activos públicos cotejados. [Cierre vigente](CIERRE_RESPONSABLES_2026-11-06.md). Los comentarios de publicación pendiente más abajo describen el momento previo al push.

# Responsables diarios e historial personal — 6 noviembre 2026

## Alcance autorizado

Miguel pidió vincular cada evaluación a la persona responsable, aunque cambie de área en otros días. Confirmó una sola área por persona durante toda la jornada, sin cambios en el mismo día. Confirmó la corrección Mauricio → Maurilio Salgado.

- Selector de empleados activos en cada ficha y guardado explícito de la asignación.
- Asignación inmutable por fecha/área; unicidad de persona/fecha incluso entre ubicaciones, garantizada por PostgreSQL. Reintentos de la misma asignación son idempotentes.
- A partir de la activación se exige responsable antes de guardar evaluaciones. Fecha inicial registrada una sola vez con reloj de Ciudad de México.
- Historial por persona desde la ficha y el Dashboard, con filtros de fechas (hasta un año por consulta), áreas, porcentajes, actividades, observaciones y evaluador. Promedio simple de días evaluados; sin revisión no equivale a cero.
- Responsable visible en tarjetas, semana y textos preparados para compartir. No se envían mensajes automáticamente.
- Corrección versionada de employees.id=8 únicamente si conserva el nombre Mauricio Salgado, manteniendo ID, estado e historial. La semilla nueva usa Maurilio Salgado.
- Se conservan nombres de áreas, actividades, fórmula de puntuación y 120%, diseño, inventarios, capturas previas y snapshots de reportes.
- No se asignan responsables por inferencia a días antiguos. Permanecen en su historial por área.

## Implementación

Nueva tabla calibre_assignments y configuración calibre_assignment_settings, integradas en la migración habitual de evaluaciones. Las asignaciones guardan actor y hora; no se añade una ruta de reasignación ni borrado. Catálogo compartido con Asistencia. La corrección del nombre está disponible tanto en inicialización de Asistencia como en la de evaluaciones.

Archivos principales: lib/supervision/equipo-responsables.js, calibre-store.js, calibre-handler.js; js/equipo-personas.js, equipo-checklist.js y equipo-weekly.js. Reportes agregan únicamente el nombre del responsable; las notas internas siguen excluidas.

## Verificación

23 pruebas específicas pasan (responsables, checklist, dominio, personal y reportes). Suite principal: 33 pruebas pasan. Build estático y git diff --check correctos. Dos recorridos de navegador con PostgreSQL aislado: flujo anterior y nueva asignación/historial. Guardado, recarga, 120%, notas, concurrencia, error y reintento, respuesta perdida tras guardar, bloqueo del cambio, consulta histórica, 320/390/1440px y temas claro/oscuro comprobados. Sin capturas ni mensajes de prueba en producción.

El conector Neon de esta sesión solo permite consultas. No se ejecutaron SQL ni migraciones sobre producción mediante ese conector. Miguel pidió expresamente commit y push; el despliegue utiliza el flujo normal GitHub → Vercel del proyecto. Estado de publicación a comprobar después del push; este documento no acredita por sí solo el despliegue ni escrituras reales.
