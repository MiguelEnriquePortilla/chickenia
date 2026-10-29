# Diseño operativo de Chicken ChicanIA

La plataforma conserva el Inicio aprobado: fondos cálidos neutros, tinta azul marino, Poppins cuando está disponible y superficies discretas. El contenido y las acciones de trabajo tienen prioridad sobre la decoración.

- Celular: contenido a todo el ancho, margen 16px y menú superpuesto con cierre por botón, fondo o Escape. Foco contenido dentro del menú mientras está abierto.
- Controles: mínimo 44px y campos de 16px, foco visible, sin bloquear zoom. Estados explícitos de guardado y recuperación.
- Divulgación: Mostrar/Ocultar y Abrir/Cerrar. Sin flechas, chevrones ni triángulos como indicadores.
- Capturas primero, compartir después. Pedidos conserva un borrador en el dispositivo; producción/evaluación indican su guardado automático; inventarios conservan su guardado manual.
- Fecha y área consultadas se mantienen al navegar. Cero, sin captura y dato no disponible son estados diferentes.
- Resumen con secciones colapsables e indicadores de captura, evaluaciones compactas y orden opcional de pendientes. Históricos y reconocimiento 120% conservados.
- Inventarios distinguen origen CEDIS y destino Sucursal/Móvil. Las salidas se consideran entregadas. Correcciones y reinicios viven como operaciones secundarias protegidas.
- WhatsApp siempre muestra vista previa y deja el envío al usuario.

## Verificación
Pruebas locales aisladas a 320, 390 y 1440px en claro y oscuro, además de recorridos API/PostgreSQL. La emulación no sustituye una comprobación en teléfono físico: teclado del sistema, área segura y comportamiento táctil requieren esa revisión.

El detector de diseño señala la paleta crema aprobada y elementos heredados ocultos (mascota de bienvenida y acceso anterior). No justifican sustituir la identidad aceptada ni reactivar pantallas retiradas.
