# FoodIA — piloto local

Estado al 14 de septiembre de 2026: implementación local probada; plugin local instalado. El usuario autorizó commit/push para publicación del código. El MCP remoto necesita configurar OAuth antes de operar; sin escritura de pruebas en Neon ni acceso de Lilian. Consultar el reporte de entrega para resultado del push y despliegue.

## Qué funciona

- Buscar catálogo y consultar existencias, distinguiendo saldo desconocido de cero.
- Preparar y guardar listas orientadoras con existencia observada y mínimos/máximos sin candados.
- Agregar productos desde la conversación; conservar unidades históricas.
- Registrar compra verificada, cantidades reales, proveedor/lugar, precios o costo pendiente, importe pagado y destino.
- Recibir todo al comprar si ya llegó, o recibir por partes después.
- Completar/corregir costos y anular compras con motivo e historial.
- Consultar compras y gasto conocido por fechas, distinguiendo costos/pagos incompletos.
- Borrador revisable, folio, reintento idempotente, control de concurrencia y escritura atómica de compra + renglones + inventario + auditoría.

## Probar aquí, antes de conectar cuentas

Se puede escribir o dictar: “En la base de pruebas, registra una compra ficticia de Sam’s…” o “Probemos una lista de Central”. Este mismo agente puede ejecutar la consola local; no necesita publicar ni conectar el ChatGPT de Lilian. El dictado llega como texto; no se ha validado conversación de voz con el plugin en Android.

La base persistente está en `.local/foodia-pilot/postgres`. Arranca vacía de movimientos y conserva el catálogo existente. No se cargaron compras ni existencias reales de las fotos. No se lee `.env`, no se carga Neon y no se utiliza `DATABASE_URL` en el ejecutor local. Otro proceso no puede abrir simultáneamente esa base: cerrar el MCP antes de usar la consola.

Desde la carpeta ChickenIA, con Node disponible:

```powershell
'{"action":"inventory","search":"arroz"}' | node scripts/foodia-local.js
```

En esta computadora, si Node no está en PATH:

```powershell
'{"action":"inventory","search":"arroz"}' | & 'C:/Users/hp/AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe' scripts/foodia-local.js
```

Acciones de consola: `inventory`, `prepare` (con `operation`), `commit` (con `draftId`), `purchases` (con `from` y `to`) y `lists`. El esquema de las operaciones está en `lib/food-mcp.js` y se valida también en consola. No enviar un borrador nuevo para reintentar una escritura incierta.

## Plugin local

Paquete: `plugins/foodia-local`. Incluye el skill `foodia-pruebas` y un servidor MCP por stdio que usa el mismo ejecutor y la misma base local. Sus rutas son específicas de esta computadora. No es el paquete que se compartirá con Lilian.

Después de registrar e instalar el paquete en el catálogo personal, abrir una nueva tarea y seleccionar **FoodIA local - pruebas**. Se puede invocar el skill con `$foodia-pruebas` y pedir una prueba. La instalación no inyecta herramientas retroactivamente en una tarea ya abierta. En esta tarea podemos seguir con la consola local sin instalar nada.

Instalación local confirmada: `foodia-local@personal`, versión `0.1.0`, en el catálogo personal de Miguel. La fuente instalada vive en `C:/Users/hp/plugins/foodia-local`; el paquete de desarrollo sigue en `plugins/foodia-local`. Para probar el plugin en otra tarea seleccionar **FoodIA local - pruebas** e invocar `$foodia-pruebas`. No mantener abierta esa conexión mientras se use la consola sobre la misma base.

## Pruebas reproducibles

```powershell
npm test
node --test test/foodia-local.test.js
python test/inventory_browser.py
python test/refined_browser.py
npm run build
```

El recorrido MCP local usa datos ficticios en una carpeta distinta por ejecución: 5 kg iniciales, lista de 20 kg, compra de 45 kg a $18/kg, llegada en dos partes, gasto $810 y saldo 50 kg. Verifica persistencia al reiniciar. Resultado detallado generado en `test/results/foodia-flow.json` (ignorado por Git).

Las pruebas HTTP usan JWT firmados de prueba, servidor de claves local, cliente MCP oficial y PostgreSQL local. Comprueban consulta entre usuarios, sesión inválida/vencida, audiencia equivocada, permisos de lectura, borrador y reintento sin duplicación. No son una prueba del flujo OAuth interactivo de ChatGPT.

## Alcance que todavía falta

- Conectar el plugin a una sesión real de ChatGPT y validar su selección de herramientas con dictado real.
- Catálogo persistente de presentaciones/alias: por ahora las equivalencias se documentan en cada compra.
- Importación validada de las guías/fotos reales y definición de sus campos ambiguos.
- Almacenamiento privado de tickets: se admite referencia de comprobante, no se suben imágenes al servidor.
- Desglose fiscal, descuentos separados, varios pagos y comparación automática por proveedor: el piloto conserva importe final por renglón, importe pagado acumulado y auditoría.
- Una guía se conserva en la lista como snapshot; todavía no hay administración independiente de versiones de guías.
- Multiempresa: se limita explícitamente a Chicanito; no habilitar otro negocio sobre el estado global actual.

## Conexión remota, para una etapa posterior

Paquete preparado: `plugins/foodia`, con manifiesto portable y compatibilidad Codex. URL prevista, aún no publicada: `https://chickenia.chicanito.app/mcp`. No instalarlo esperando datos reales antes de configurar y publicar.

El servidor valida tokens JWT RS256 de un proveedor OAuth externo. No incluye todavía un proveedor de inicio de sesión. Configuración necesaria:

| Variable | Contenido |
|---|---|
| `FOODIA_RESOURCE_URL` | URL HTTPS exacta del MCP, usada como audiencia |
| `FOODIA_OAUTH_ISSUER` | Emisor OAuth exacto |
| `FOODIA_OAUTH_JWKS_URL` | URL HTTPS de claves públicas del emisor |
| `FOODIA_MEMBERS_JSON` | Usuarios autorizados por identificador estable del proveedor |

Cada miembro tiene `subject`, `id`, `name`, `business: "chicanito"` y `role: "operator"` o `"reader"`. Los tokens deben incluir `sub`, `exp`, `iat`, la audiencia correcta y `scope` con `foodia:read`; las escrituras requieren además `foodia:write` y rol operator. Configurar vida de acceso no mayor a una hora y flujo de renovación en el proveedor. El proveedor debe soportar el contrato OAuth de MCP, PKCE y registro/identificación del cliente ChatGPT. No pegar tokens ni contraseñas en conversaciones.

Las rutas de metadatos OAuth se resuelven a la misma función MCP. Sin configuración el servidor responde no disponible; una configuración vacía nunca abre acceso anónimo.

Una vez configurado y publicado, seguir la conexión de desarrollo oficial, vincular cada identidad y comprobar primero lectura y luego una escritura autorizada. Acceso de Lilian, distribución compartida y Android quedan fuera del piloto local actual.

Referencias: [conectar MCP](https://developers.openai.com/plugins/deploy/connect-chatgpt), [autenticación](https://developers.openai.com/plugins/build/auth), [empaquetar plugins](https://developers.openai.com/plugins/build/plugins).
