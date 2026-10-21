# Calibre Chicanito — fichas, indicadores y reportes

**Sesión cerrada y entrega aceptada por Miguel.** Leer [cierre del 21 de octubre](CIERRE_CALIBRE_CHICANITO_2026-10-21.md). Esperar nuevas indicaciones; no ejecutar capturas ni envíos automáticos.

Implementación autorizada por Miguel el 21 de octubre de 2026, después de revisar las seis fichas aprobadas y acordar las reglas una por una.

## Entrada

- Supervisión: `/supervision.html`. Dashboard: `/dashboard.html`.
- Histórico anterior: `/supervision-historico.html`, conservando las revisiones y fórmulas previas. Ninguna tabla de actividad, proteína, producción o caja se reinicia ni se reinterpreta.
- API autenticada: `/api/summary?calibre=1&date=AAAA-MM-DD`.

## Reglas acordadas

- 50% cumplimiento de ficha y 50% resultado del KPI. Cada actividad aplicable pesa igual.
- Menos de 85: «¡Vamos a levantarlo!». 85 a menos de 100: «Mínimo». 100: «Aceptable». 120: «Calibre Chicanito».
- Una actividad adicional acordada con el asociado por área/turno, con resultado esperado. Verificada y lograda suma 20 puntos completos únicamente con base al 100%, sin fallas críticas pendientes y con KPI medido.
- Supervisión acuerda y verifica; para su propia área lo hacen Lilian o Miguel. El cierre general de Caja solo lo confirma Lilian.
- «Hoy no aplica»: motivo, actor y fecha; se excluye. «Sin casos para evaluar»: ficha provisional y sin extra. «Pendiente de verificar»: falta una revisión que sí corresponde.
- Fallas originales e incidencias conservadas, con solución por separado. Incidencias: responsable y plazo original, atención inmediata a críticas; solución verificada. Las pendientes pasan al siguiente día.
- Cierres por área congelan datos y fórmula. Solo Miguel o Lilian reabren el día actual con motivo; el histórico no admite cambios.

## Contenido

Catálogo versionado en `lib/supervision/calibre-catalog.js`: seis fichas finales de Rastro/Apertura, Cocina (14 puntos), Rosticero, Freidoras, Barras y Caja; rutinas de Lavado y Supervisión alineadas a las responsabilidades acordadas.

Acuerdos: Apertura coloca mesas/tómbolas y Rosticero limpia/revisa exterior; Cocina limpia cambray y Rosticero prepara; Cocina entrega papa gajo cocida y pasta de codo; Freidoras crema/elote de codo; crudo/frito separados; Caja sin fondo fijo; pedido diario de Cocina a Rastro; Barras lava Rosticero y conserva equipos con producto operando.

Las recetas, producción y controles periódicos existentes se conservan en sus módulos; la nueva lista no convierte cantidades antiguas en requisitos diarios. Los horarios no confirmados se acuerdan antes de capturar; no se inventan cantidades ni temperaturas.

## KPI y muestras

- Rastro: cada entrega completa, puntual y con calidad contra solicitud confirmada.
- Cocina: dos muestras de tres preparaciones distintas, primera entrega y reposición de comida; calidad y puntualidad.
- Rosticero: primera producción, 10:30–11:30, 13:30; disponibilidad/calidad/necesidad según orden y venta. Sobrantes al entregar.
- Freidoras: mismos momentos por Cruji, campesina, Papas Gajo y salsa; resultados por producto y agregado por observaciones. Sobrantes y crudo/frito al entregar.
- Barras/Caja: tres muestras de cinco pedidos/cobros consecutivos por turno. Si hay menos, se registran los reales con motivo.
- Lavado: tres entregas entre arranque, comida y precierre, limpias y puntuales según acuerdo.
- Supervisión: incidencias con plazo vencido en la fecha resueltas y verificadas antes de su plazo original. Se incluyen pendientes anteriores. Sin incidencias no se inventa 100%.

Las incidencias fuera de muestra también se registran. Una revisión fallida no se convierte retrospectivamente en exitosa al corregirla.

## Reportes y datos

«📲 Comparte cómo vamos»: por área o general. «Así vamos» provisional y «Así cerramos» únicamente con áreas cerradas. Vista previa guardada antes de abrir WhatsApp; el usuario elige destinatario y envía. No hay envío automático ni afirmación de entrega.

Los reportes incluyen ficha, KPI, nivel, actividad destacada y siguiente paso. Excluyen importes, nombres del equipo y observaciones personales. Cada preparación guarda texto y snapshot inmutables; el histórico muestra 30 días de reportes y cierres.

Tablas nuevas e independientes: `calibre_settings`, `calibre_days`, `calibre_events`, `calibre_reports`; creación idempotente al primer acceso autorizado. Activación por fecha del servidor en Ciudad de México. Guardado con revisión y evento atómico; un conflicto no sobreescribe capturas de otro usuario.

## Verificación y publicación

Pruebas de dominio, API autenticada y PostgreSQL aislado: `test/calibre.test.js`. Navegador con API real/base aislada: `test/calibre_browser.py`; guardar, recargar, conflicto de muestra, reporte/histórico, móvil, modo oscuro y error de red. Sin operaciones ni mensajes reales de prueba.

Publicado en producción: commit `5ebe6c1`, push a `origin/main`. Vercel confirmó despliegue `dpl_37FWNLVaySxgVjLsZ1EFPzWVccC4`, estado READY, destino production. Verificación autenticada en `https://chickenia.chicanito.app/supervision.html?area=general`: ocho áreas, puntos de ficha, KPI, extra, cierres, histórico y asistencia visibles; datos iniciales sin revisiones ficticias. Miguel revisó la pantalla y respondió «Se ve super bien».

Validación completada: 25 pruebas automatizadas y dos recorridos de navegador con PostgreSQL aislado; incluye obtener 120%, cerrar y recargar el resultado, reporte final sin marca provisional, nueva vista del Dashboard y regresión de proteínas/tablas semanales. En producción se verificó lectura y presentación; no se capturaron operaciones reales ni se enviaron mensajes de prueba.
