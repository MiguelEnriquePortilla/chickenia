# Entrega: captura de Proteinas como Rastro - 24/09/2026

> Continuidad al 26/09: [handoff vigente](HANDOFF_PROTEINAS_MOVIL_2026-09-26.md) y [reporte de cierre](REPORTE_SESION_2026-09-26.md). Este mecanismo se conserva en Sucursal y se reutiliza, solo con Rostizado y registros independientes, en Chicanito Móvil. Publicado y confirmado; no ejecutar pendientes históricos.

Miguel autorizo el ajuste, commit y push. La captura cotidiana muestra fichas fijas
para Rostizado y Crujiente: habia, registrado hoy, llega del proveedor, se marino,
sale a Sucursal y queda en CEDIS, separado en sin marinar y marinados.

- Todo sigue en pollos con hasta tres decimales. Marinar conserva el total.
- Guardar movimientos procesa ambas fichas en una transaccion: cualquier error
  revierte todo. Conserva entradas escritas ante error y las limpia tras el exito.
- Entrega, Recibe y Observaciones quedan en la bitacora. El nombre de quien recibe
  no confirma cantidades; la recepcion sigue vinculada al envio, sin doble resta.
- Apertura, conteo fisico, merma, recepcion y rectificacion quedan en Otras operaciones.
  RECTIFICAR INVENTARIO conserva acceso directo, motivo y confirmacion.
- Una captura en curso bloquea el otro formulario; Actualizar permite descartarla.
- No cambia saldos al desplegar ni crea tablas. Se conservan historial, permisos,
  validacion cronologica y proteccion contra duplicados. Dashboard conserva su resumen.

Archivos: proteinas.html, js/protein-inventory.js, js/protein-view.js,
lib/protein-inventory.js. API conserva su transaccion y admite action=movements.
El contrato individual sigue disponible para otras operaciones y compatibilidad.

Validacion: pruebas de dominio/API con PostgreSQL aislado y navegador con API real
local: apertura, ambas fichas, fallo atomico, decimales, recarga, recepcion, conteo,
rectificacion, movil/escritorio y temas claro/oscuro. No se cargan pruebas en Neon.

Continuacion: Nancy debe comprobar el formato con sus movimientos reales.
Capturar solo el movimiento nuevo, nunca repetir los acumulados del dia ni escribir
el saldo final en una entrada o salida. La publicacion se hace con push a main
mediante el despliegue existente de Vercel.

Resultado final: 22 pruebas automatizadas aprobadas, recorrido de navegador aprobado,
build correcto y diff sin errores de espacios.
