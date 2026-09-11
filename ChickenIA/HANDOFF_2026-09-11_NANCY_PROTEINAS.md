# Panel de Nancy, proteínas y reacciones

Miguel autorizó aplicar los ajustes y hacer commit/push después de revisarlos.

## Decisiones

- Pollo suelto = pollo anterior / inventario residual, incluido en la existencia.
  No es una columna adicional que deba sumarse, ni una nueva recepción.
- Ana Lira se corrige a Ana Lima; Perla Estrada a Petra Estrada.
  Se corrigen nombres en `employees` sin cambiar IDs ni registros de asistencia.
- Nancy empieza con solicitud, recepción y existencias de pollo en su panel.
  Se conserva la autenticación y los permisos existentes; se simplifica la navegación,
  no se convierte en una nueva barrera de autorización. Gerencia conserva su vista.

## Implementación

- Entrada por `/inventario.html?panel=nancy` desde Inicio y Supervisión; la cuenta
  Nancy entra automáticamente en el panel básico.
- Solicitud de pollo y recepción contada, sin cantidades recibidas prellenadas.
  Se reutilizan movimientos existentes: no se crean hojas con saldos independientes.
- Existencias: cinco estados/productos de pollo existentes, por CEDIS y Sucursal,
  con tránsito separado. CRUJI cocinado conserva piezas, con total equivalente a
  ocho piezas por pollo claramente rotulado. No hay seguimiento de tandas en curso.
- Saldo anterior + entradas − salidas = saldo registrado. Incluye todos los eventos
  del día hasta la versión consultada, no solo la primera página del historial.
- Conteo físico sin prellenado; al iniciarlo se ocultan saldos esperados. Guarda
  responsable autenticado, hora del servidor y momento (apertura/durante/cierre).
  No modifica el saldo; las diferencias quedan pendientes. La conciliación existente
  permanece en gerencia. Los saldos no inicializados tienen captura inicial explícita
  cuando la cuenta tiene permiso, sin recontarlos como recepción.
- Panel muestra verificaciones de Nancy por producto/ubicación, entregas confirmadas
  por ella hoy y diferencias pendientes/atendidas. Un conteo con diferencia cuenta
  como verificación. No se inventaron horarios de corte para calificar puntualidad.
- Consulta automática cada 30 segundos solo en vistas de consulta, sin reemplazar
  formularios en captura. Se muestra última consulta y último conteo por separado.
- Confirmación visual tras respuesta exitosa; aviso ámbar para diferencias.
  Celebración al pasar a 100 %, no al cargar una pantalla. Se recuerda por fecha,
  ubicación y área en el dispositivo. Respeta reducción de movimiento.

## Archivos y validación

`lib/protein-report.js`, `api/inventory.js`, `lib/inventory-store.js`,
`lib/inventory-domain.js`, `js/inventory.js`, `js/feedback.js`, `css/feedback.css`.

Pruebas: lógica de inventario/rutinas/proteínas, API y PostgreSQL local, recorrido
de Nancy (recepción, solicitud, conteo coincidente y con diferencia), móvil/escritorio,
celebraciones y reducción de movimiento; Supervisión y Dashboard existentes.

Los valores de pruebas no se cargan a producción. Las existencias reales dependen
de capturar saldos iniciales y movimientos. El seguimiento por hora límite y las
metas formales de supervisión requieren acordar sus horarios/frecuencias.
