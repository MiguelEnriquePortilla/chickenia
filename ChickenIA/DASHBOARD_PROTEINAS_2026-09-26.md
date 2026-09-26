# Dashboard y Telegram de proteínas — entrega publicada

Estado: **`d501467` commiteado y enviado a `main` el 26/09/2026.** Miguel confirmó el dashboard en producción mediante dos capturas del dominio real y pidió actualizar README, handoff y GitHub. La tabla, filtros, alertas y los dos gráficos están visibles en modo oscuro. La recepción del primer corte de Telegram con el nuevo formato todavía no se confirmó. Sin envíos de prueba al grupo ni movimientos reales de inventario. Los mínimos quedan para después.

## Resultado

- Proteínas al principio del dashboard: Sucursal (Rostizado/Crujiente) y Móvil (Rostizado), filtros por inventario y proteína, tabla compacta y tarjetas en celular.
- Dos gráficos: existencias por estado en CEDIS y entradas de proveedor/envíos de la semana hasta la fecha seleccionada. Barras y días abren detalles. Enlaces al historial operativo existente.
- Pendientes incluyen envíos de días anteriores. Diferencias de recepción y conteo corresponden al día consultado. Se informa si hubo movimientos posteriores al conteo.
- Última captura por inventario, horas CDMX. La actualización sigue el intervalo existente del dashboard (60 segundos).
- No se mezclan inventarios, no se calcula existencia del punto de venta a partir de recepciones y no se crean mínimos arbitrarios. Sin captura y datos no disponibles se distinguen de un cero capturado.
- Telegram conserva ambos inventarios en el pie de la imagen aunque Supervisión sea extensa. La imagen incluye el resumen de proteínas antes del detalle de áreas. Se conserva un único envío y el botón del dashboard.
- Un módulo de resumen compartido entre navegador y Telegram calcula cantidades pendientes con precisión de milésimas. La lectura de Telegram obtiene ambos libros en una consulta; no inserta ni modifica inventarios.

## Vista previa

`.local/dashboard-preview/preview.html` es un archivo autónomo con datos ficticios, filtros, gráficos y ejemplo de Telegram. `telegram.txt`, `desktop.png`, `mobile.png`, `mobile-dark.png` y `telegram.png` son evidencia local. No incluir `.local` en despliegue.

Generación: `node scripts/preview-protein-dashboard.js`. El script crea una base PGlite desechable usando `test/protein-dashboard-fixture.js`, nunca Neon. La vista se puede servir con un servidor HTTP local limitado a esa carpeta.

## Validación

23 pruebas aprobadas: `node --test test/protein-summary.test.js test/protein-inventory.test.js test/chicken-units.test.js test/telegram.test.js test/report-guidance.test.js test/report-image.test.js`.

`python test/protein_dashboard_browser.py` aprobado con API real y PostgreSQL local desechable: filtros, detalle de entregas, diferencia decimal, movimientos por día, celular, claro/oscuro, fechas anteriores a apertura y fallo de uno de los inventarios. Build estático y revisión de whitespace correctos.

## Continuación

Entrega de código publicada y dashboard confirmado por Miguel. Próximo paso cuando el usuario lo solicite: confirmar recepción y legibilidad del nuevo reporte en Telegram y definir mínimos si los necesita. No enviar pruebas al grupo ni reiniciar inventarios. Preservar los cambios preexistentes de `plugins/foodia-local/skills/cierre-caja/` y `../Formatos-Internos/`.
