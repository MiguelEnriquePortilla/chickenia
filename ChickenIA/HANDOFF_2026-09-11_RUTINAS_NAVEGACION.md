# ChickenIA — rutinas y navegación por áreas

Miguel validó la transcripción de rosticero y su cierre, y pidió organizar todas las
áreas en Apertura / Operación durante el día / Cierre. Esta entrega carga rosticero:
10 actividades de apertura, 7 de operación y 6 de cierre. Apertura de venta: 9:30.
Las demás áreas conservan su catálogo hasta contar con su levantamiento validado.

## Catálogo y registros

- Fuente vigente de rosticero: `api/lib/rosticero-routines.js`. Cada fila agrega el
  bloque como séptimo campo. El seed de `db.js` conserva la versión histórica.
- `api/lib/routine-migration.js` aplica una versión una sola vez, atómicamente.
  No borra actividades ni capturas. Usa `valid_from` inclusivo y `valid_until`
  exclusivo. `areas` y `summary` consultan el catálogo correspondiente a la fecha.
- Si ya existen capturas de rosticero en el día de activación, el nuevo catálogo
  empieza al día siguiente; así se conserva completa la jornada en curso.
- Un cliente desactualizado recibe 409 al guardar una actividad fuera de vigencia.
- La hoja `entrenamiento.html` conserva su funcionamiento standalone e incluye los
  mismos renglones y encabezados de bloque. Mantener ambas fuentes sincronizadas.
- No cambia la fórmula de ponderación. Cantidades y recetas ambiguas no se
  convirtieron en metas numéricas. El formulario conserva cantidad/observaciones.
- El sobrante sigue formando parte del inventario de Sucursal: el registro de
  cierre y recalentamiento no generan otra entrada de inventario.

## Navegación

Miguel pidió barra lateral izquierda colapsable con iconos de todas las áreas,
compartida por Actividades, Dashboard e Inventario. Implementación común:
`js/area-navigation.js` y `css/area-navigation.css`.

La selección se conserva en `?area=...` al cambiar de módulo. Vista general conserva
la visión completa; cada área muestra sus actividades o indicadores. Almacén tiene
inventario, pero aún no catálogo de supervisión: se muestra esa ausencia sin inventar
actividades. Moto sigue oculta según los acuerdos anteriores.

Inventario conserva saldos por CEDIS/Sucursal y permisos en servidor. El filtro de
área es una vista de productos relacionados, no subinventarios ni movimientos entre
oficios. Usa familias ROSTI/CRUJI y los espacios existentes del catálogo; Caja no
tiene artículos asignados. Abastecimiento, ventas, historial y preparaciones siguen
siendo operaciones compartidas de la ubicación y se identifican como tales.
Los conteos filtrados son parciales. Para conteo completo, volver a Vista general.

## Validación y publicación

- `node --test test/inventory.test.js test/routines.test.js`.
- `python test/run_visual_test.py`: navegación, rutinas, temas, móvil y Dashboard.
- `python test/inventory_browser.py`: API real y PostgreSQL local, diez pantallas,
  saldos, ventas, conteos, filtro de áreas y permisos existentes.
- `node scripts/build-static.js` y `git diff --check`.

Publicar por commit/push al repo existente en `02-OPERACION`; Vercel despliega
`ChickenIA`. No usar snapshot manual. No incluir `Formatos-Internos/`, secretos,
datos locales ni capturas de pruebas en el commit.

Pendientes operativos: confirmar receta/proporciones, conservación/recalentamiento,
primera disponibilidad de rostizados y mínimos/máximos de salsa envasada.
