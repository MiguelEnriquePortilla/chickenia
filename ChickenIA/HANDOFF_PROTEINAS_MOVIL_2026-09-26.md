# Dos inventarios de proteínas — 26/09/2026

## Estado al cerrar

**Publicado en `main` y Vercel: `52dae97`. Confirmado por Miguel.** Leer [reporte de cierre](REPORTE_SESION_2026-09-26.md). La entrega quedó terminada; esperar una nueva solicitud. La separación real sustituye el cambio de etiquetas previo de `7ed7eca`.

## Acuerdo de Miguel

- **Inventario de proteínas Sucursal**: es el inventario existente, con Rostizado y Crujiente. Conservar sus saldos, historial, recepciones y mecanismo de operación.
- **Inventario de proteínas Chicanito Móvil**: copia funcional independiente, únicamente Rostizado. No comparte cantidades, envíos, recepciones, conteos, correcciones ni ciclos con Sucursal.
- Ambos conservan el mecanismo de CEDIS: proveedor suma, marinar cambia de estado, enviar descuenta y confirmar recepción no descuenta otra vez. No se implementó transferencia automática entre ambos inventarios.

## Implementación

`/proteinas.html` sigue siendo Sucursal. `/proteinas-movil.html` es el apartado nuevo. Inicio y Supervisión ofrecen ambos; el inicio de sesión conserva el destino y la fecha.

La API selecciona `inventory=sucursal|movil`; omitirlo mantiene Sucursal para compatibilidad. La lógica de dominio es compartida, pero cada instancia consulta exclusivamente su catálogo: los cuatro SKU originales `PRO-ROSTI-*` / `PRO-CRUJI-*` permanecen intactos y Móvil usa `PRO-MOVIL-ROSTI-RAW` y `PRO-MOVIL-ROSTI-MAR`. Reutiliza tablas y bloqueo transaccional existentes. El servidor rechaza Crujiente en Móvil y los envíos de otro inventario.

Móvil inicia sin capturas ni historial copiado. La primera captura de gerencia establece sus cantidades iniciales. No confundir «Sin captura» con un arqueo realizado. No se ejecutó ninguna apertura, rectificación ni reinicio en producción durante esta implementación.

El Dashboard existente continúa mostrando el inventario original. El resumen semanal y el historial de Móvil están en su propio apartado.

## Validación

11 pruebas aprobadas de dominio, API, unidades y acceso piloto en PostgreSQL aislado. Incluyen rechazo de Crujiente, rechazo de recepciones cruzadas, movimientos decimales, permisos, reversión de fallos y preservación exacta de Sucursal tras operar y reiniciar Móvil. Construcción estática correcta.

Recorrido de navegador con API real y base desechable: apertura de Rostizado, entrada, marinado, salida, confirmación de recepción, recarga y consulta de Sucursal sin los registros de Móvil. Revisión visual en escritorio y celular.

## Precauciones de continuidad

Leer también `REPORTE_SESION_2026-09-25.md`: el reinicio real del 25/09 ya se realizó, no repetirlo ni asumir saldos actuales en cero. El grafo `graphify-out/` es histórico.

Conservar cambios ajenos en `plugins/foodia-local/skills/cierre-caja/` y `../Formatos-Internos/`. El envío local había fallado sin diagnóstico concluyente; la conexión GitHub permite publicar los objetos revisados y avanzar `main` sin forzar. No atribuir el fallo a un token caducado sin evidencia.
