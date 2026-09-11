# Acceso unificado durante el piloto — 11 septiembre 2026

## Decisión expresa del usuario

Durante el periodo de prueba y ajustes de operación/UI, todo el equipo debe entrar a todos los apartados con una sola clave compartida y el nombre de quien entra. Esta decisión reemplaza temporalmente la restricción de Chicken-IA a Miguel/Lilian y los permisos diferenciados de inventario.

## Implementación

- `lib/pilot-access.js`: modo de prueba habilitado por defecto, hash de la clave compartida validado solo en servidor. Nombre libre de 2–40 caracteres; cuando coincide con una cuenta existente, conserva su ID y nombre. Personas nuevas reciben un ID estable derivado del nombre.
- `lib/inventory-auth.js`: usa la clave compartida en el piloto y conserva una cookie firmada HttpOnly. Cada sesión lleva su nombre y marca `pilot`; no se confía en un rol o indicador enviado desde el navegador. Requiere el secreto de sesión ya configurado.
- Las sesiones antiguas deben volver a iniciar sesión. Una sesión dura diez horas y funciona en Inventario/Control Operativo, Dashboard y Chicken-IA. Supervisión conserva su acceso existente.
- Dashboard deja de tener contraseña/localStorage separados; si falta sesión, dirige al acceso común de inventario y regresa a la vista solicitada después de entrar. Cerrar sesión desde Dashboard también invalida el acceso de ese navegador a los otros módulos.
- Todos los usuarios del piloto reciben el rol operativo manager, incluido acceso a catálogos, conteos, programación, movimientos y autorización de compras. Control Operativo muestra todos los módulos durante el piloto, también para Nancy.
- Chicken-IA acepta toda sesión de prueba, pero sigue siendo un apartado de consultas de solo lectura. No se añadieron escrituras desde el chat.
- Las capturas de inventario y programación siguen guardando el nombre de quien las realiza. No cambian saldos, catálogos, recetas ni registros históricos por el mero inicio de sesión. La identidad es declarada por quien entra durante este piloto.

## Cómo volver a cuentas individuales

Configurar `CHICKENIA_PILOT_ACCESS=0` en el servidor y desplegar con esa variable. Esto restaura las cuentas y roles de `INVENTORY_USERS_JSON`, invalida las cookies del piloto y restablece las restricciones por ID para compras y Chicken-IA. No borrar la configuración de cuentas ni el secreto de sesión. El acceso común del Dashboard permanece, en lugar de su contraseña antigua en cliente.

## Verificación

- 20 pruebas Node aprobadas, incluyendo PostgreSQL local: clave incorrecta, nombre libre, identidad firmada, acceso completo, preservación de Nancy, cookies alteradas y restauración de cuentas individuales.
- `test/pilot_browser.py` comprobó login real con API y base local, redirección del Dashboard, acceso a Chicken-IA sin otro login, módulos de inventario para persona nueva y Nancy, y cierre de sesión compartido. Solo los reportes del Dashboard se sustituyeron por fixtures.
- `scripts/dev-inventory.js` conserva cuentas individuales por defecto para los tests antiguos; para probar el piloto localmente, usar `CHICKENIA_PILOT_ACCESS=1`. Se agregó la ruta local de Chicken-IA.
- Publicación confirmada: commit `41563c3` enviado a main. Dashboard publicado con sesión compartida; login real, sesiones de Inventario/Chicken-IA y consulta de inventario devolvieron HTTP 200. Se comprobaron 20 operaciones habilitadas. Logout devolvió HTTP 200 y la siguiente consulta de sesión HTTP 401. No se registraron movimientos operativos en esta verificación.
- Detalle y enlaces en [reporte de cierre de acceso unificado](REPORTE_SESION_2026-09-11_ACCESO_UNIFICADO.md). Los servidores locales de prueba se detuvieron.

## Continuidad

La siguiente sesión sigue dedicada a **áreas restantes y EL RECETARIO**. Consultar `00_INICIAR_AQUI.md` y el handoff de operación/recetario, aplicando esta actualización de acceso por encima de las restricciones históricas. No reintroducir bloqueos por persona durante el piloto sin que el usuario lo pida.
