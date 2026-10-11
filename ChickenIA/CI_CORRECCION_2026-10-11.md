# Corrección de las alertas de GitHub — 11 octubre 2026

Miguel reportó correos «Run failed: ChickenIA inventory checks». La ejecución 66, commit `8737e26`, falló en el último paso de navegador; instalación, 33 pruebas y compilación pasaron. Los fallos comenzaron después del cambio de acceso por nombre.

Se actualiza test/inventory_browser.py para seleccionar MIGUEL/NANCY sin buscar contraseña, volver explícitamente a Inicio al cambiar de usuario y verificar la navegación y permisos amplios del piloto vigente. La solicitud de compra sigue pendiente hasta autorizarse, y se prueban la autorización y recepción por separado.

Se mantiene toda la revisión automática: no se deshabilitan Actions, correos ni comprobaciones. Se conservan las pruebas de inventario, cantidades, recepciones parciales, persistencia, saldos insuficientes, conteos, preparación, compras, cierre de sesión y vista móvil/escritorio. Los ajustes locales previos de navegación responsiva se conservaron.

Validación local: 33 pruebas de lógica/API/PostgreSQL aprobadas, compilación aprobada y recorrido completo de navegador con API/base aisladas aprobado en Edge. Chromium no instalado localmente; verificado en el servidor de GitHub. No se cambiaron datos ni comportamiento de producción.

Corrección `5d1d6e2` publicada en main. GitHub Actions **ejecución 67 completada correctamente**, incluyendo el recorrido de navegador con Chromium: https://github.com/MiguelEnriquePortilla/chickenia/actions/runs/38171115815. Los correos anteriores pertenecen a ejecuciones fallidas que permanecen en el historial; no se silenciaron notificaciones. Este fallo quedó corregido.
