# Asistencia — ajuste de personal, 11 octubre 2026

Miguel autorizó retirar a **Herman Melo** y **Rocío Mata** de la lista activa y agregar **Diana** (sin apellido por ahora) y **Silvia Najera**. Se conservan las demás personas y el orden de la lista, con Diana y Silvia en los lugares correspondientes.

Los empleados retirados quedan inactivos; no se renombran ni reutilizan sus identificadores. Se conservan sus registros de asistencia. Migración única versionada en attendance_roster_versions; altas nuevas con sus propios identificadores, sin marcar asistencias de prueba. La semilla de instalaciones nuevas refleja los nombres actuales.

Validación: PostgreSQL aislado, bajas y altas, integridad de registros históricos, repetición sin duplicados y sin reactivar empleados después de la migración; inicialización del esquema completo. Publicación por GitHub.
