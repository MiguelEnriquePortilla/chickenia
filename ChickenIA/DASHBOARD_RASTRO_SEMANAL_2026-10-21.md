# Dashboard: proteínas de Rastro — 21 octubre 2026

Reemplazo del bloque gráfico de proteínas por ocho tarjetas y dos tablas semanales (Rosti y Cruji). Tarjetas del día seleccionado: había, llegó del proveedor, salió a Sucursal y queda en Rastro. Semana lunes–domingo; salidas de mañana, mediodía y otras cuando existan. Merma y rectificación aparecen si afectan la semana. Solo se acumulan flujos; el saldo final no suma existencias de días distintos.

La fuente sigue siendo el inventario de proteínas ubicado en Rastro y asignado a Sucursal (`inventory=sucursal`), no existencias físicas de Sucursal. Se excluye el inventario independiente para Móvil de este bloque. No se cambian captura, API, esquema SQL, saldos, historiales, reportes ni los otros apartados del Dashboard. Sin tablas nuevas ni migraciones. Datos faltantes se muestran como «Sin captura»; error de consulta muestra aviso, no cero. La fecha seleccionada permite consultar semanas anteriores.

Implementación: `js/rastro-week-dashboard.js`, `css/rastro-week-dashboard.css`, referencias en `dashboard.html` y consulta en `js/dashboard.js`. Los componentes gráficos anteriores permanecen como archivos sin ser cargados por el Dashboard.

Validación: 12 pruebas Node aprobadas de inventario, resumen y nueva vista, con PostgreSQL local aislado; conversión/marinado no duplica pollo, entrega/recepción no duplica entradas, ceros reales y datos ausentes distintos, fechas futuras, mermas y ajustes. Navegador con API real y base desechable: ocho tarjetas, 14 filas diarias, exclusión de Móvil, saldo esperado de fixture, móvil 320/390 sin desbordamiento de página, tablas desplazables, tema oscuro, falta de captura y error de red. Build público aprobado. Ninguna operación real ni mensaje de prueba.

Las unidades existentes son pollos (hasta tres decimales). No convertir a piezas silenciosamente. Las tarjetas corresponden al día seleccionado y a datos al cargar; no son venta disponible ni inventario de cocidos en Sucursal.

Pendiente independiente: ubicar las proteínas de Sucursal en otro espacio, como pidió Miguel. No implementado aquí. Las fichas aprobadas y demás cambios locales ajenos no se incluyen en el commit de este ajuste.
