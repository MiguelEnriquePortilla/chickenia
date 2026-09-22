# Informes digitales — 19 septiembre 2026

## Estado vigente: 22 septiembre 2026

Leer primero [cierre de sesión y acuerdos vigentes](REPORTE_SESION_2026-09-22.md).
Rastro incorpora RECTIFICAR INVENTARIO e histórico de tres días en el dashboard.
Proteínas usa pollos completos con decimales; Producción conserva sus unidades.
La bienvenida con mascota ya fue aprobada; el icono instalado permanece igual.
Las fechas y pendientes anteriores quedan como contexto histórico.

Supervisión y Asistencia incluye accesos con la fecha seleccionada a Cierre de Caja,
Producción Diaria e Inventario de Rastro. No se crean tablas para Rastro: se utilizan
`locations`, `inventory_items` e `inventory_movements`, configuradas por Miguel en Neon.

## Inventario de Rastro

`api/rastro.js` exige sesión, rol manager/processor/dispatch y mismo origen para
escribir. Cada envío se guarda en una transacción, con bloqueo de la ubicación y
revisión basada en el último movimiento. Un reintento con revisión vieja devuelve
409 sin duplicar movimientos. El endpoint antiguo no puede escribir en Rastro.

Tipos de movimiento: `initial`, `entry`, `exit`. Las cantidades son positivas;
el signo se aplica al calcular. No tener inicial significa desconocido, nunca cero.
El saldo se arrastra por fecha y las salidas retroactivas se comprueban contra
los movimientos posteriores. Entrega, recibe y observaciones se conservan en `notes`
como JSON; `recorded_by` corresponde al usuario autenticado. No modifica el motor
separado `inv_state` de abastecimiento.

## Caja y producción

Se conservan las tablas e historiales existentes. `format=digital` habilita el
conteo simplificado, tarjeta combinada y monedas totales, sin inventar una foto.
La revisión del cierre consulta proteínas del mismo día desde Producción.
Producción conserva preparar/hecho separados, compras y comida, y agrega llegada,
tercera tanda, recepción y mermas al formulario digital.

En estas capturas de producción todo pollo, crudo o cocido, se expresa en piezas.
`chickenUnit: piezas` distingue los registros nuevos de los antiguos. Al leer un
registro antiguo se convierten sus cantidades de pollos multiplicando por ocho;
Cruji cocido ya estaba en piezas y no se convierte. Leer no escribe en Neon y el
historial anterior no cambia. Al guardar se mantiene la revisión y se registra
la nueva versión con su unidad. Los registros finalizados siguen siendo de lectura.

Validación: `npm run test:daily`; comprobación del navegador con PostgreSQL local
aislado para guardar Rastro y producción, y calcular conteo de caja. No se cargan
existencias ficticias en producción.
