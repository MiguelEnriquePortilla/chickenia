# ChickenIA — activación de inventario

## Versión

Implementación independiente del checklist anterior, accesible en `/inventario.html`.
El registro operativo está en Neon, mediante las tablas nuevas `inv_state`, `inv_events`,
`inv_reversals` e `inv_login_attempts`. Las tablas anteriores no se borran ni se reinterpretan.
No hay integración con Poster. No se cargan saldos ni ventas de ejemplo en producción.

## Antes de activar

1. En el proyecto Vercel **chickenia**, mantener Root Directory **ChickenIA** y `DATABASE_URL` existente.
2. Ejecutar localmente `npm run setup:inventory` una sola vez. Genera dos archivos ignorados por Git:
   - `.local/inventory-production.env`: valores de las dos variables nuevas.
   - `.local/inventory-accounts.json`: usuarios y contraseñas iniciales para entregar personalmente.
3. En Settings → Environment Variables, agregar **INVENTORY_SESSION_SECRET** y
   **INVENTORY_USERS_JSON** usando los valores completos del archivo local. No incluir el nombre
   de variable ni comillas adicionales en el campo Value. Aplicar al entorno de Production.
   Para probar Preview, usar una base de datos de prueba y cuentas independientes; nunca cargar
   registros de ensayo en la base operativa.
4. Node.js: 22.x o 24.x. El repositorio incluye `vercel.json` con construcción de archivos
   públicos. No cambiar el Root Directory. Se conserva `DATABASE_URL` sin imprimirla ni copiarla al repo.
5. Con las variables guardadas, desplegar por **push a main en GitHub**. Si el código ya se había
   desplegado antes de configurar variables, hacer Redeploy del último commit en Vercel.

Sin las variables de cuentas la API responde 503 y no permite leer ni escribir inventario.
Supervisión y asistencia anteriores siguen disponibles. La primera sesión válida aplica una
migración aditiva e idempotente; solo crea tablas propias y el catálogo sin cantidades.

## Cuentas

| Usuario | Permiso |
|---|---|
| nancy | Gerencia: saldos, validaciones, producción, ventas, conteos y correcciones |
| miguel | Gerencia |
| lilian | Preparar envíos y autorizar pedidos a proveedores |
| eliseo | Preparación de pollo y revisión de apertura |
| cocina | Solicitud de abastecimiento |

Las contraseñas no se guardan en el repositorio ni en texto plano en Vercel; se guardan hashes
scrypt. Las sesiones usan cookies HttpOnly/Secure, vencen a las 10 horas y dejan de ser válidas
al cambiar el hash o rol de la cuenta. Para rotar una cuenta, generar un hash nuevo y actualizar
`INVENTORY_USERS_JSON`; conservar el resto. Evitar compartir la cuenta de Nancy.

## Primera operación real

1. Nancy revisa el Catálogo. Corregir nombres/unidades antes de usar un artículo; las porciones
   no se convierten automáticamente a kilos. Si requiere otra unidad, crear un artículo específico.
2. En Inventario, seleccionar CEDIS y cargar saldos físicos iniciales. Repetir para Sucursal.
   Capturar cero expresamente donde no haya existencias. Un campo vacío queda pendiente.
3. Abrir una solicitud de Sucursal. Lilian prepara el envío; Eliseo transporta; Nancy registra
   la recepción aceptada. Lo no recibido conserva saldo en tránsito.
4. Registrar preparación/cocción, ventas y consumo de insumos. Para recetas distintas de pollo,
   usar Otras preparaciones con entradas y salidas efectivamente medidas.
5. Al cierre, registrar conteo. Una diferencia no cambia automáticamente el saldo; Nancy la
   investiga y concilia. Si hubo movimientos posteriores, se requiere un conteo nuevo.

Las existencias del día anterior ya están en el saldo. Nunca usar Saldo inicial otra vez ni
registrar el residual como una entrada. Recalentar no genera una nueva cantidad de inventario.

## Validación de despliegue

- Vercel muestra READY para el commit esperado y alias `chickenia.chicanito.app`.
- `/`, `/supervision.html`, `/dashboard.html`, `/entrenamiento.html`, `/inventario.html`,
  `/manifest.json`, `/css/style.css` y `/js/inventory.js` responden.
- Sin sesión, `/api/inventory` responde 401 con cuentas configuradas, o 503 si faltan.
- Iniciar sesión con Nancy; catálogo sin cantidades inventadas. No realizar ventas de prueba.
- `.local/`, fuentes de servidor y archivos de prueba no deben estar en los archivos estáticos.

## Validación local reproducible

`npm ci` → `npm test` → `npm run build`.

`python test/inventory_browser.py` usa Playwright + Microsoft Edge y levanta su propio servidor
con PostgreSQL local (PGlite). Requiere Node en PATH o variable `NODE_BINARY`; las credenciales y
bases de ensayo se guardan en `.local/`, nunca en Neon. Capturas en `test/results/`.

## Recuperación

Revertir el commit en GitHub restaura la interfaz anterior. Conservar las tablas `inv_*` y sus
registros; no borrar inventario para revertir la interfaz. Conservar copia de seguridad de Neon
antes de activar, y documentar los conteos iniciales. Cualquier reversión de movimientos se
registra con referencia y motivo; nunca se edita silenciosamente el historial.

## Límites explícitos de esta entrega

- Captura directa, no cobros ni caja. Los paquetes se registran por cantidades efectivamente
  vendidas de cada componente. No se descuenta arroz/salsa automáticamente sin receta validada.
- El menú de pollo incluye entero/medio/cuarto y piezas CRUJI; artículos terminados adicionales
  admiten cantidades en su unidad base. No se presupone que una pieza ROSTI sea un octavo.
- Los conteos pueden ser parciales y muestran su alcance. Nancy debe contar todo para un cierre
  completo. Las solicitudes de mañana no cambian por el conteo.
- El estado operativo usa un documento JSONB versionado y un historial relacional inmutable.
  Una comparación de versión y una única sentencia SQL confirman saldo e historial juntos.
  Los conflictos piden recargar, sin sobrescribir el trabajo de otra persona. Es apropiado para
  esta operación pequeña; revisar tamaño y normalizar documentos antes de expansión masiva.
- Las áreas nuevas de Apertura no cambian el scoring histórico del checklist anterior.
