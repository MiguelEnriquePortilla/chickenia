# Asistencias y nómina semanal — diseño y plan aprobado

Solicitud y acuerdos: hoja similar a la foto, lunes a domingo, pago domingo. Nancy marca siete estados obligatorios por persona y elige Petra o Maricruz como CAJERA TIEMPO COMPLETO. Asistencia existente sirve de sugerencia; no altera checadas. Sueldo semanal por seis días: general 2400, Nancy 3500 + bono 1000, Eliseo 2600, Julissa 2700, cajera completa 2800. Ajuste por día respecto de seis: 400, 583, 434, 450 y 467 respectivamente. Descanso, falta, vacaciones y permiso no generan día pagado. Descuento e importe de bono manuales; motivo obligatorio al descontar. Lilian autoriza al final. No automatizar sanciones.

Enfoque elegido: extender asistencia con hoja semanal independiente y persistencia PostgreSQL; conserva checadas. Alternativa descartada: motor de políticas de descuentos, expresamente simplificado por Miguel. Identidad y catálogo existentes; sin inventar empleados de la foto.

- [x] Pruebas de cálculo, redondeos y validación.
- [x] API con sesión existente, persistencia, revisión de versiones y autorización exclusiva de Lilian.
- [x] Hoja editable, navegación, impresión y guardado explícito.
- [x] Verificar cálculos y flujo con PostgreSQL aislado y compilación estática.

Límite: el acceso actual usa selección de nombre compartida; autorizar como Lilian registra esa identidad, sin añadir una autenticación nueva.

Validaci?n: pruebas de dominio y API con PostgreSQL PGlite; recorrido de navegador con seis asistencias y un descanso por persona, Petra completa con descuento manual de 100, total 14900; guardado persistente y autorizaci?n de Lilian comprobados en base aislada. No se capturaron operaciones reales.

Publicación: 8cef8d5, Vercel READY. HTML y JavaScript públicos coinciden con fuente verificada; API anónima 401, autenticada 200 con 13 empleados y revisión 0. Sin guardado ni autorización real. Sueldos individuales entregados solo mediante API autenticada; no están en el JavaScript público.
