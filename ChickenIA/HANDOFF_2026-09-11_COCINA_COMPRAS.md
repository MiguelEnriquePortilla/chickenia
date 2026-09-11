# Cocina y abastecimiento semanal — 11 septiembre 2026

- Cocina: 38 actividades, 31 diarias y 7 semanales, separadas en apertura, operación y cierre. Las semanales entran en supervisión solamente en la fecha programada. Hay 24 actividades con cantidad.
- Nancy: Orden de producción por fecha y kg; preparaciones pesadas, transformación con consumo real de insumos, conteo inicial y cierre. El checklist no mueve inventario automáticamente.
- Catálogo aditivo: preparaciones en kg sin convertir unidades ni saldos históricos. Leche y aceite tienen artículos en litros; proteínas conservan sus unidades. Pollo residual no se suma otra vez.
- Compras semanales: solicitudes locales/foráneas, fecha, destino y excepción urgente con motivo. Nancy solicita; Lilian o Miguel autorizan. Recepción contada exige referencia de comprobante, importe y origen del pago. Registra la referencia de caja, no hace una integración contable con caja.
- La programación no permite cambiar días anteriores ni actividades ya capturadas. Cero elimina la programación. No se inventaron mínimos de inventario.
- Migración de rutinas preserva catálogo histórico y capturas; si ya hay capturas del área hoy, el catálogo nuevo comienza mañana. Migración de inventario agrega solamente artículos faltantes.
- Cookie de sesión compartida bajo /api para inventario y programación. Al iniciar/cerrar sesión se elimina la cookie anterior bajo /api/inventory. Usuarios con sesión anterior deben volver a iniciar sesión para usar programación.
- Pruebas: 15 pruebas Node aprobadas; navegador real con API y PGlite aprobó programación, solicitud/autorización/recepción y recorridos previos; revisión visual de supervisión/dashboard aprobada; build estático y diff --check aprobados.
- Publicación: commit/push de main a GitHub, despliegue automático existente de Vercel. No usar publicación manual de snapshot.
