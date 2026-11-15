## Cierre confirmado - 15 noviembre 2026

Miguel revisó y confirmó que todo funciona bien. Entrega aceptada y sesión cerrada. Código funcional publicado: c231884. Sin pendientes de este encargo. [Acuerdos, extractos y cierre verificados en Drive](https://drive.google.com/file/d/14wVwaoCmx1AZ6QdmrYkYBQTmKZJqt2ID/view?usp=drivesdk). Evidencias originales enlazadas dentro del cierre. Esperar nuevas instrucciones.

---

# Asistencias y nómina — rediseño aprobado, 15 noviembre 2026

## Acuerdo vigente (sustituye la interfaz de tabla anterior)

Miguel rechazó la tabla y el acceso independientes. Aprobó paso a paso: encabezado y menú lateral compartidos, sesión existente, Asistencias por persona/fecha con cinco botones de estado y sin importes, cajera completa semanal en Petra/Maricruz, Nómina individual con ajustes manuales, revisión final de Lilian y bloqueo/reapertura. Reportes Persona/Equipo para celular, filtros Pendientes/Completos, totales y apartados desplegables; WhatsApp con vista previa y envío a cargo del usuario, impresión y PDF por diálogo del sistema. Autorizó implementar y publicar el 15 de noviembre, sin esperar maqueta.

Plan de ejecución: conservar tablas y cálculos; probar API de parches individuales y respuesta sin importes en Asistencias; reemplazar solo interfaz de personal y navegación de sus entradas; verificar móvil, escritorio, tema oscuro, guardado/reintento, persistencia, vuelta al Inicio sin bienvenida, ajustes, autorización, previsualización para compartir e impresión. Publicar únicamente los archivos de este cambio. Sin nóminas reales de prueba.

## Antecedente técnico (interfaz sustituida)

Solicitud y acuerdos: hoja similar a la foto, lunes a domingo, pago domingo. Nancy marca siete estados obligatorios por persona y elige Petra o Maricruz como CAJERA TIEMPO COMPLETO. Asistencia existente sirve de sugerencia; no altera checadas. Sueldo semanal por seis días: general 2400, Nancy 3500 + bono 1000, Eliseo 2600, Julissa 2700, cajera completa 2800. Ajuste por día respecto de seis: 400, 583, 434, 450 y 467 respectivamente. Descanso, falta, vacaciones y permiso no generan día pagado. Descuento e importe de bono manuales; motivo obligatorio al descontar. Lilian autoriza al final. No automatizar sanciones.

Enfoque elegido: extender asistencia con hoja semanal independiente y persistencia PostgreSQL; conserva checadas. Alternativa descartada: motor de políticas de descuentos, expresamente simplificado por Miguel. Identidad y catálogo existentes; sin inventar empleados de la foto.

- [x] Pruebas de cálculo, redondeos y validación.
- [x] API con sesión existente, persistencia, revisión de versiones y autorización exclusiva de Lilian.
- [x] Hoja editable, navegación, impresión y guardado explícito.
- [x] Verificar cálculos y flujo con PostgreSQL aislado y compilación estática.

Límite: el acceso actual usa selección de nombre compartida; autorizar como Lilian registra esa identidad, sin añadir una autenticación nueva.

Validaci?n: pruebas de dominio y API con PostgreSQL PGlite; recorrido de navegador con seis asistencias y un descanso por persona, Petra completa con descuento manual de 100, total 14900; guardado persistente y autorizaci?n de Lilian comprobados en base aislada. No se capturaron operaciones reales.

Publicación: 8cef8d5, Vercel READY. HTML y JavaScript públicos coinciden con fuente verificada; API anónima 401, autenticada 200 con 13 empleados y revisión 0. Sin guardado ni autorización real. Sueldos individuales entregados solo mediante API autenticada; no están en el JavaScript público.

## Verificación del rediseño

Pruebas de dominio, API PostgreSQL PGlite y sesión aprobadas. Navegador aislado a 320, 390 y 1440 px: un encabezado compartido, menú lateral, cero desbordamiento horizontal, Asistencias sin importes, persistencia de persona/fecha/filtro, vuelta a Inicio sin bienvenida, ajustes y bloqueo de autorización con cambios pendientes. Semana local lista por Nancy y autorizada por Lilian, sin operaciones reales. Vista previa individual/equipo y apertura/cancelación del diálogo de impresión comprobadas; no se envió WhatsApp ni se imprimió físicamente. En celular real queda por comprobar teclado y diálogo nativo.

Plásticos: FILTROS PARA FREIDORA agregado al final, unidad/cantidad/notas vacías. Comparación de catálogos: 23 anteriores y otros proveedores idénticos; ahora 24 artículos. Sin pedidos enviados.
