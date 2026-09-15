# Reporte de entrega — FoodIA y ChickenIA

14 de septiembre de 2026.

## Resultado

Implementado un piloto funcional para listas de abastecimiento, compras verificadas, costos y recepción desde herramientas MCP. El plugin local está instalado en la computadora de Miguel; el servicio remoto está implementado, pero requiere proveedor OAuth y configuración antes de usarse con cuentas reales. No se hicieron movimientos de prueba en Neon ni se habilitó acceso a Lilian.

Commit de implementación: `5b9e53e` (`Add FoodIA purchase MCP pilot and simplify ChickenIA navigation`), enviado correctamente a `origin/main`. Se incluyeron 37 archivos; la carpeta ajena `Formatos-Internos/` quedó intacta y fuera del commit.

Publicación verificada en `https://chickenia.chicanito.app`: inicio responde HTTP 200 con la navegación simplificada y el JavaScript publicado contiene el nuevo comportamiento. `/mcp` y `/.well-known/oauth-protected-resource` responden HTTP 503 con `Falta configurar el acceso FoodIA.`: el servicio está desplegado y cerrado mientras no se configure OAuth. Esto no equivale a una conexión de ChatGPT habilitada. La comprobación en producción fue de solo lectura; no registró compras ni alteró inventarios.

## Decisiones incorporadas

- ChatGPT será la interfaz conversacional; ChickenIA conserva datos y reglas.
- Lilian normalmente compra y verifica al comprar. No se exige una segunda verificación.
- Sam’s tiene destino predeterminado CEDIS; si aún está en traslado, la compra no se presenta como saldo disponible.
- La guía, la existencia observada, la lista, la compra efectiva, el costo y la recepción se conservan relacionados.
- Mínimos/máximos son orientadores. Se permite comprar más y agregar productos fuera de lista, en la conversación.
- Las fotos son fuentes de diseño, no importaciones validadas. No se inventaron cantidades, precios, equivalencias ni saldos de esas imágenes.
- Prioridad confirmada posteriormente: pruebas locales antes de compartir con Lilian. La compatibilidad Android se comprobará después.

## Interfaz ChickenIA

Se retiraron del inicio, Supervisión y la navegación general los accesos a Control Operativo e Inventario. El Dashboard conserva cumplimiento, pendientes y detalle por área; ya no muestra ni consulta movimientos de inventario del módulo antiguo. Las preguntas rápidas deterministas se mantienen.

Las rutas y servicios operativos permanecen, incluido el acceso de sesión existente. Ocultar navegación no equivale a eliminar APIs ni constituye un cambio de permisos. El login común todavía usa la ruta de inventario cuando una página necesita sesión.

## Implementación de compras

Se añadieron operaciones de lista, compra, recepción, actualización de costos y anulación al dominio existente. Se reutilizan catálogo, cantidades en milésimas, control de versión y auditoría. Importes en centavos MXN; cálculo y validación del servidor, con costo pendiente explícito cuando falta información.

Nuevas tablas: `food_lists`, `food_drafts`, `food_purchases`, `food_purchase_lines`. Los documentos de compra y sus renglones se proyectan en tablas relacionales y se conservan también en el estado versionado del piloto. Una única sentencia SQL actualiza estado, auditoría y documentos: una falla revierte todo.

Los borradores pertenecen al usuario que los prepara y vencen a las 24 horas si no se guardaron. El mismo identificador se reutiliza en reintentos. Una versión desactualizada exige revisar y preparar de nuevo. Una compra FoodIA no puede volver a recibirse por la operación antigua de proveedor.

Las anulaciones conservan eventos y motivo y no permiten saldo negativo. Los costos pueden corregirse manteniendo historial. No se implementó una contabilidad general ni pagos bancarios: se registran datos de operaciones realizadas.

## MCP y acceso

Se utiliza el SDK oficial de MCP. Herramientas: sesión, inventario, preparar operación, guardar borrador, compras por periodo y listas. Esquemas estrictos, anotaciones de lectura/escritura y errores sin divulgar detalles internos.

El servidor HTTP usa transporte sin sesiones en memoria y respuestas JSON, compatible con el patrón serverless. La identidad remota valida firma RS256, emisor, audiencia, expiración, antigüedad y permisos. Los usuarios permitidos se configuran por identificador del proveedor. Se rechazan negocios distintos de Chicanito; no es todavía un sistema multiempresa.

No se construyó un proveedor OAuth propio ni se configuró uno externo. El endpoint remoto permanece cerrado sin esa configuración. No se sustituye el acceso remoto individual por la clave compartida del piloto web.

## Pruebas locales e instalación

El ejecutor local usa PGlite persistente en `.local/foodia-pilot`, no carga `.env` y no conecta a Neon. Incluye bloqueo para impedir dos procesos sobre la misma base. Puede usarse como MCP stdio o como consola desde esta tarea.

Plugin instalado: `foodia-local@personal`, versión `0.1.0`. Fuente personal: `C:/Users/hp/plugins/foodia-local`. Caché de instalación: `C:/Users/hp/.codex/plugins/cache/personal/foodia-local/0.1.0`. Paquete de desarrollo conservado en `plugins/foodia-local`.

También se creó `plugins/foodia`, paquete remoto con manifiesto portable y compatibilidad Codex, sin instalar ni vincular a cuentas reales.

## Validación completada

- 31 pruebas Node aprobadas: lógica, PostgreSQL local, autenticación, permisos, aislamiento del piloto, transacciones, concurrencia, idempotencia y regresiones existentes.
- Cliente MCP oficial contra HTTP real con JWT de pruebas: descubrimiento, borrador, compra, consulta por otro usuario, reintento; rechazos de sesión vencida, audiencia incorrecta, usuario desconocido y usuario de solo lectura.
- MCP local por stdio y persistencia tras reinicio: 5 kg ficticios iniciales, lista orientadora de 20 kg, compra de 45 kg a $18/kg, recepción en dos entregas, $810 de compra y 50 kg finales.
- Prueba de fallo de restricción SQL: ni saldo ni historial cambian si falla la escritura del documento.
- Recorrido de navegador con API/PostgreSQL local: solicitudes, envíos, recepción, cocción, ventas, conteos, apertura y compras previas; diez pantallas a tamaños móvil/escritorio.
- Revisión de cinco rutas en claro/oscuro y móvil/escritorio, menú, Dashboard y consulta local.
- Build estático y validadores de plugins y skills aprobados.

Se corrigió una carrera del test visual al cambiar de tamaño: espera a que se aplique el comportamiento responsive antes de leer el estado del menú. También se corrigió una pérdida de acentos en el botón de inicio introducida durante una edición por consola.

Estas pruebas no validan el inicio de sesión OAuth interactivo de ChatGPT, disponibilidad en Android ni cuentas reales. No hay afirmación de compras capturadas por voz en producción.

## Entregables

- `GUIA_FOODIA.md`: guía de uso con ejemplos conversacionales.
- `FOODIA_PILOTO.md`: ejecución local, herramientas, configuración remota y límites.
- `ARQUITECTURA_FOODIA.md`: decisiones y propuesta de evolución.
- `lib/food-*.js`, `api/foodia-mcp.js`, `scripts/foodia-local.js`: implementación.
- `plugins/foodia-local`, `plugins/foodia`: paquetes y skills.
- `test/foodia*.test.js`: pruebas nuevas, integradas en npm test.

## Pendientes explícitos

Probar con Miguel dictados reales en la base local; validar catálogo y presentaciones de compras; configurar acceso OAuth y conectar ChatGPT cuando se decida pasar a datos compartidos. Después comprobar Android e incorporar a Lilian. Almacenamiento privado de tickets, múltiples pagos, desglose fiscal, guías independientes y multiempresa quedan para siguientes iteraciones.

## Recuperación

Conservar las tablas nuevas si se revierte la interfaz. No borrar ni convertir inventarios históricos. Desactivar la conexión remota retirando su configuración de acceso si hiciera falta. Los ejemplos locales permanecen separados y no deben subirse a Git. Publicar por GitHub/Vercel, sin snapshots manuales.
