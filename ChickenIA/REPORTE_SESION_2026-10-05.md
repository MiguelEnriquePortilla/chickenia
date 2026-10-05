# Supervisión simplificada — 5 octubre 2026

Miguel pidió mantener su checklist habitual, quitar la captura duplicada introducida el 4 de octubre y mostrar el seguimiento por área y hora en Dashboard. Autorizó implementar, hacer commit y push. Revisará el uso mañana; no se programó un seguimiento adicional.

**Publicado y verificado:** implementación `32e1e80`, commit y push a `main` completados. En `chickenia.chicanito.app` se cotejaron contra los archivos locales Supervisión, Dashboard, JS/CSS del gráfico y JS de Supervisión: todos coinciden. La API real de historial respondió 200 con nueve áreas, los cuatro horarios nuevos y evaluación desde `2026-10-06`; el 5 de octubre permanece sin calificación. Esta comprobación solo consultó el sistema e inicializó sus estructuras automáticas, sin crear palomitas ni movimientos operativos.

## Funcionamiento vigente

- Una sola captura: el checklist de Supervisión, con las cantidades y observaciones que ya tenía. Se retiraron de Supervisión y Dashboard el formulario independiente de controles, la lista adicional de áreas/productos y las tarjetas antiguas de cortes.
- Horarios: **10:00, 12:00, 16:00 y 19:00 CDMX**. Hoy 5 de octubre es transición; la evaluación nueva comienza el **6 de octubre de 2026**.
- Dashboard: una fila/barra por área, con cuatro tramos sobre el eje de tiempo, porcentaje y estado. El resultado del último corte indica cuántas áreas están al 100%. Los tramos en curso son provisionales; al tocarlos se consultan sus pendientes, sin otra captura.
- 100% significa todas las actividades exigibles hasta ese corte. Conserva las ponderaciones actuales y los porcentajes de calidad del checklist. Las tareas de cierre no se exigen en apertura.
- El resultado de cada corte se obtiene del historial de cambios registrado hasta su hora límite. Palomear, corregir o desmarcar después no cambia un corte anterior. Capturar para otra fecha tampoco acredita una verificación realizada en el día evaluado.
- Nota diaria por área: promedio de sus cortes exigibles. Promedios de 7 y 30 días: promedio de notas diarias completas, excluyendo fechas anteriores al inicio y días declarados sin operación. Se muestra cuántos días aportan a cada promedio. Los días sin historial no se inventan ni se califican.
- Gerencia puede marcar una fecha registrada como día sin operación desde el apartado plegado de historial, con motivo obligatorio. La exclusión y su reversión dejan autor, hora y motivo; las verificaciones permanecen.
- Telegram usa los mismos horarios y el resultado del checklist al corte. Guardar el historial no depende de que Telegram entregue el mensaje. No se hicieron envíos de prueba ni capturas operativas en producción.

## Horarios de actividades

Se conserva el catálogo, sus nombres, campos y pesos. Apertura se evalúa a las 10:00, operación a las 12:00 y cierre a las 19:00. Actividades con hora explícita se asignan al siguiente corte que las cubre. La orden del siguiente día, necesidades semanales y arqueo intermedio corresponden a las 16:00. El cierre parcial de barra queda para las 19:00.

Las condiciones continuas seleccionadas por nombre (abastecimiento de barra, hidratación, atención y limpieza durante el servicio) se revisan a las 12:00 y nuevamente a las 16:00. Conservan una sola fila; después de mediodía aparece **Verificar de nuevo para las 16:00** si hace falta. Cambiar observaciones o cantidades no renueva por sí solo esa verificación. La revisión de la tarde se conserva para el cierre; no hay tercera captura añadida.

Las dos actividades que el catálogo ubica explícitamente a las 19:15 y 19:30 siguen visibles, identificadas fuera de los cuatro cortes. No se adelantan ni se penalizan a las 19:00. No se revisaron frecuencias ni metas de recetas en esta entrega. Móvil conserva su flujo y no recibe esta calificación.

## Persistencia y compatibilidad

- `checklist_check_events`: bitácora de inserciones, cambios y bajas de `activity_checks`, escrita por trigger dentro de la misma operación. Hora de base de datos, responsable, estado, porcentaje y hora de verificación. `verified_at` distingue verificar de editar una nota.
- `checklist_timeline_days`: copia del catálogo y asignación de horarios al comenzar el día observado, por sucursal. Mantiene los pesos y tareas para reconstruir los cortes aunque luego cambie el catálogo. Incluye las preparaciones semanales programadas al abrir el día; no se cambia retroactivamente después de congelar el catálogo.
- `checklist_timeline_calendar_events`: historial de cambios de días sin operación.
- La bitácora y el catálogo se conservan sin límite automático de retención. La pantalla consulta 30 días alrededor de la fecha elegida; puede seleccionarse una fecha anterior para consultar su periodo.
- La evaluación se reconstruye a partir de eventos originales y catálogo diario; no depende de una captura manual ni de la puntualidad del cron. Una consulta o captura inicia el día y los cortes programados también lo hacen. Si nadie usa el sistema y el programador no ejecuta, ese día figura sin historial.
- Se conservan `activity_checks`, asistencia, inventarios, caja, producción y los históricos de `supervision_kpi_*` y Telegram. La API antigua de escritura de KPI devuelve 410 para impedir que una pestaña vieja siga enviando el formulario retirado; su lectura permanece disponible.

## Validación

**34 pruebas aprobadas**: cálculo por hora, correcciones tardías, verificaciones repetidas, promedio diario, periodos, días sin operación y permisos, migraciones completas con el catálogo real, PostgreSQL aislado y API de checks, compatibilidad de unidades/históricos, programación y reportes Telegram. Build aprobado.

Recorrido de navegador con API real y PostgreSQL temporal: palomear y recargar, ausencia de listas duplicadas, lectura de los cortes, detalle de pendientes, cierre/reapertura de día con motivo y layouts móvil/escritorio, claro/oscuro. Capturas en `test/results/timeline-*.png` (archivos locales de prueba).

Comandos: `npm run test:timeline`; pruebas relacionadas en `test/kpi.test.js`, `test/telegram.test.js`, `test/report-guidance.test.js`, `test/report-image.test.js`, `test/operational-adjustments.test.js`, `test/routines.test.js`, `test/rastro-sucursal.test.js`, `test/chicken-units.test.js`; `npm run build`; `python test/checklist_timeline_browser.py`.

## Próxima revisión

Observar el uso real del 6 de octubre con Nancy/Miguel y revisar si los horarios asignados a las actividades existentes reflejan su operación. El sistema mide verificación registrada a tiempo; no puede probar que algo se hizo antes si se capturó después. No reiniciar inventarios, reenviar cortes ni agregar registros de prueba al retomar. Los cambios ajenos de habilidades y formatos quedaron fuera de esta entrega.
