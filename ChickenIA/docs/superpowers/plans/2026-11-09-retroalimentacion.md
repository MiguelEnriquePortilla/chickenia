# Retroalimentación diaria ligada al asociado

Propuesta aprobada por Miguel el 9 noviembre: observación y recomendación obligatorias, máximo 180 caracteres cada una, al cerrar evaluación; palomitas con guardado automático. Responsable tomado de asignación diaria inmutable. Desde 2026-11-09; no atribuir ni modificar históricos. Reporte semanal carta horizontal, una página por área, con día, responsable, observación, recomendación y promedio base. Historial personal conserva el vínculo. No cambia fórmula de 120% ni se automatizan pagos/envíos.

Enfoque: campos dentro del JSON de calibre_days y eventos existentes, sin nuevas tablas ni migración de históricos. Cierre independiente de la antigua evaluación KPI. Ediciones posteriores vuelven a dejar pendiente la retroalimentación hasta reconfirmar. Reporte interno imprimible; mensajes de grupo continúan sin notas privadas.

- [x] Pruebas: campos vacíos, longitud, responsable, cierre y edición, fecha anterior, historial y semana; verificar fallo.
- [x] Dominio/almacenamiento: borrador y cierre auditados, actor de sesión, responsable de la base, fecha efectiva fija.
- [x] Interfaz: campos, estado, botón de cierre, reintento y reporte semanal.
- [x] Verificar pruebas específicas, suite principal, build y navegador aislado (móvil, histórico, impresión; concurrencia cubierta en pruebas de almacenamiento).
- [ ] Publicar commit/push solo alcance autorizado y verificar despliegue.
