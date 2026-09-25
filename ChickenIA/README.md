# Estado vigente — 25 septiembre 2026

Leer [ajustes de actividades, porcentajes y reinicio de Proteínas](HANDOFF_AJUSTES_2026-09-25.md). Sustituye las actividades anteriores afectadas. Reinicio real solicitado por Miguel para hoy: comprobar su recibo antes de cualquier nueva ejecución. No repetirlo al retomar.

# Estado vigente: Proteinas como Rastro - 24/09/2026

Captura con fichas fijas para Rostizado y Crujiente: habia, llega, se marino, sale y queda.
Guardado conjunto, campos vacios despues de guardar y operaciones especiales separadas.
Leer [handoff y validacion](HANDOFF_PROTEINAS_2026-09-24.md).
Este ajuste sustituye el selector de movimientos cotidianos descrito anteriormente.

# ChickenIA

## Regla vigente: TODO pollo en pollos, 22/09/2026

Leer [unidades de pollo y compatibilidad histórica](UNIDADES_POLLO.md).
Toda captura de pollo admite pollos con decimales, incluidos Producción, mermas,
inventarios, ventas y supervisión. Sustituye las instrucciones anteriores de piezas.
Splash revisado: es el inicio nativo de Android; no se modificó.

## Estado vigente: 22 septiembre 2026

Leer primero [cierre de sesión y acuerdos vigentes](REPORTE_SESION_2026-09-22.md).
Rastro incorpora RECTIFICAR INVENTARIO e histórico de tres días en el dashboard.
Proteínas usa pollos completos con decimales; Producción conserva sus unidades.
La bienvenida con mascota ya fue aprobada; el icono instalado permanece igual.
Las fechas y pendientes anteriores quedan como contexto histórico.

## Estado vigente — informes digitales, 19 septiembre 2026

**Publicado en producción: `e690a4d`, push a `main` completado.** Supervisión y
Asistencia incluye Cierre de Caja, Producción Diaria e Inventario de Rastro.

Los tres formatos tienen botones independientes al final. Comparten modo día/noche
y los puntos de control del día se pueden plegar. Ajuste visual comprobado en móvil
y despliegue verificado; 13 pruebas de captura e inventario aprobadas en esta revisión.

Sesión cerrada: documentación guardada en esta carpeta y servidor temporal de pruebas
detenido. Para continuar, usar el reporte y el handoff enlazados abajo.

- [Supervisión y Asistencia](https://chickenia.chicanito.app/supervision.html?area=supervision)
- [Cierre de Caja digital](https://chickenia.chicanito.app/captura.html?mode=close&format=digital)
- [Producción Diaria digital](https://chickenia.chicanito.app/captura.html?mode=production&format=digital)
- [Inventario de Rastro](https://chickenia.chicanito.app/rastro.html)

Para retomar: [reporte del 19/09 y ajustes pendientes](REPORTE_SESION_2026-09-19.md),
[handoff](HANDOFF_CAPTURA_DIARIA.md) y [guía técnica](INFORMES_DIGITALES.md).
18 pruebas aprobadas y build correcto; comprobación pública del despliegue realizada.
Pendiente: primera captura autenticada de Rastro y revisión de Miguel. Todo pollo
debe ir en piezas; aplicado en el formulario de producción, pendiente de extender
al motor antiguo de inventario. Los estados fechados inferiores son históricos.

## Histórico: captura diaria, 18 de septiembre de 2026

Publicado y verificado: **`5cc9127`**. Cierre de Caja y Produccion tienen ficha con marca, guardado real autenticado, resumen en dashboard y en los cortes programados de Telegram. Los estados fechados inferiores son historicos y no reemplazan esta entrega.

- [Cierre de Caja](https://chickenia.chicanito.app/captura.html?mode=close)
- [Produccion](https://chickenia.chicanito.app/captura.html?mode=production)
- [Dashboard](https://chickenia.chicanito.app/dashboard.html)

Para retomar: [handoff de captura diaria](HANDOFF_CAPTURA_DIARIA.md), [guia tecnica y limites](CAPTURA_DIARIA_PRODUCCION.md) y [cierre de sesion](REPORTE_SESION_2026-09-18.md). Primero probar un borrador real con Miguel, revisar el dashboard y confirmar el siguiente corte de Telegram. Despues: compras por foto con revision humana; mas adelante gastos corrientes. El piloto local permanece separado y no fue importado.

## Estado vigente — supervisión, 16 de septiembre de 2026

Reportes de Telegram activos en Vercel Pro: **09:30, 12:00, 14:00, 17:00 y 19:00, hora CDMX**, todos los días. Primer reporte real recibido y confirmado por Miguel. Formato con emojis y barras de avance publicado; último cambio funcional `038f3cb`.

Para retomar, leer el [reporte de cierre y pendientes](REPORTE_SESION_2026-09-16.md) y la [guía de Telegram](TELEGRAM_SUPERVISION.md). Pendiente: confirmar el siguiente envío y continuar la asignación de actividades, ponderaciones y metas con Nancy. El reporte usa los datos disponibles del checklist; no equivale a medición automática de inventario o producción. El piloto fudIA conserva su estado independiente, descrito abajo.

## Estado vigente — fudIA, 15 de septiembre de 2026

Piloto local de compras y movimientos diarios probado con Miguel. Skills: `$subir-gastos` y `$movimientos-inventario`, además de `$fudia-pruebas`. Solicitud → envío → recepción parcial/completa funciona sin costos en las transferencias. MCP corregido para compartir la base entre tareas por turnos. El acceso remoto sigue pendiente de OAuth.

Leer [guía de uso](GUIA_FOODIA.md), [reporte de cierre](REPORTE_FUDIA_2026-09-15.md) y [handoff vigente](HANDOFF_FUDIA_REPORTES_2026-09-15.md). Próxima sesión: skill de reportes precisos de operaciones, inventario y compras. Código y documentación en GitHub; base de pruebas en `.local/foodia-pilot/postgres`, excluida de Git y sin respaldo adicional en Drive. Los estados fechados siguientes son históricos.

## FoodIA — piloto del 14 de septiembre de 2026

Compras conversacionales mediante MCP, listas orientadoras, costos, recepción e historial. Plugin local instalado y pruebas aisladas; conexión remota preparada pero pendiente de configurar OAuth. La navegación web se simplifica a Supervisión/asistencia, Dashboard y preguntas rápidas. Ver [cómo probarlo](GUIA_FOODIA.md), [configuración técnica](FOODIA_PILOTO.md) y [reporte de entrega](REPORTE_FOODIA_2026-09-14.md). Las secciones anteriores a esta entrega conservan contexto histórico.

## Estado al cierre del 11 de septiembre de 2026

Implementación publicada: `c105098`. Ver [reporte de sesión](REPORTE_SESION_2026-09-11.md) y [handoff vigente](HANDOFF_2026-09-11_CIERRE_CHAT.md).

**Próximo piloto, todavía no implementado:** apartado independiente “Pregúntale a Chicken-IA”, al nivel de Dashboard, Inventarios y Supervisión, para Miguel y Lilian. Consultas con datos reales, solo lectura, fuentes y fecha de actualización. WhatsApp y comercialización quedan para etapas posteriores.


## Control de inventario — nueva versión

Acceso en `/inventario.html`: inventario CEDIS/Sucursal, solicitud y recepción,
preparación/cocción, ventas directas, conteos, proveedores, insumos y apertura por área.
No se conecta a Poster. Conserva sin modificar las tablas del checklist y asistencia.

**Activación:** leer [RELEASE_INVENTARIO.md](RELEASE_INVENTARIO.md). Requiere dos variables
de cuentas en Vercel además de `DATABASE_URL`. Sin configurarlas, inventario queda cerrado.
`npm test` verifica lógica/API/PostgreSQL; `python test/inventory_browser.py` recorre la UI.
`npm run build` prepara archivos públicos sin credenciales, pruebas ni fuentes de servidor.

Las secciones siguientes describen la versión original de supervisión; sus referencias a
una futura integración de ventas quedan reemplazadas por captura directa en ChickenIA.

Supervisión operativa en tiempo real para Chicken Chicanito: checklist maestro por área
(sucursal Jojutla + unidades Moto Chicanito), inventario y verificación cruzada de pollo
recibido vs. sobrante. Mismo stack que chicanito-app y Chicanito Capital: HTML/CSS/JS
vanilla + funciones serverless de Vercel + Postgres (Neon). Sin frameworks, sin build step.

## Qué incluye esta primera versión

- `/` — landing con acceso a Supervisión y Dashboard.
- `/supervision.html` — pantalla única de Nancy: selecciona ubicación y fecha, y va
  verificando cada actividad por área en tiempo real. Cada check se guarda al instante
  con hora de servidor (no autoreportada) y con su nombre.
- `/dashboard.html` — vista de Miguel y Lilian: cumplimiento ponderado por área,
  pendientes críticos resaltados, verificación cruzada de pollo (moto) y movimientos
  de inventario del día. Se refresca solo cada 60 segundos.
- `api/` — endpoints serverless (`locations`, `areas`, `checks`, `inventory-items`,
  `inventory-movements`, `summary`, `employees`, `attendance`) y `lib/supervision/db.js` con el
  esquema y el catálogo semilla (áreas, actividades por área tomadas de los checklists
  reales de Chicanito, ~30 artículos de inventario, 13 empleados).
- **Asistencia** — dentro de `/supervision.html`, arriba del checklist. No es un check
  ✓/✗ como el resto: es reloj checador por empleado con 4 marcas al día (entrada, salida
  a comer, regreso de comer, salida), siempre con hora de servidor, nunca a mano.
- **PWA instalable** — `manifest.json` + `sw.js` + iconos en `icons/`. La app se puede
  agregar a la pantalla de inicio del celular como cualquier app.
- `/entrenamiento.html` — hojas de entrenamiento imprimibles, una por área, formato
  semanal L-D, para llenar a mano junto con Nancy. Ver la sección de abajo.

La primera vez que cualquier endpoint corre, `ensureTables()` crea las tablas si no
existen y siembra el catálogo inicial — no hay que correr una migración a mano.

**El catálogo de actividades está a medio migrar a un marco de 11 indicadores**
(INSUMO, PRODUCCIÓN, EXCEPCIÓN, LIMPIEZA, FRECUENCIA, ANTICIPACIÓN, PUNTUALIDAD, DINERO,
CALIDAD, PROCESO, EVIDENCIA) — ya migradas: Freidoras, Rastro, Cocina, Rosticero, Caja.
Pendientes de que Miguel mande la transcripción de cada una: Ventas/Barras, Lavado de
Trastes, Supervisión (tienda), Moto Recepción, Moto Cierre — esas siguen con el catálogo
simple original. Todo vive en `lib/supervision/db.js` (`SEED_ACTIVITIES`); solo se siembra una vez
(si ya hay datos, no se vuelve a insertar), así que un cambio después del primer deploy se
hace mediante migraciones versionadas que preservan actividades y capturas históricas;
no se debe borrar la tabla `activities` para actualizar el catálogo.

## Hojas de entrenamiento (`/entrenamiento.html`)

Página standalone, no enlazada desde el resto de la app. Genera con JS, desde un array de
datos embebido en el propio archivo, una hoja imprimible por área (tamaño carta horizontal,
columnas L-M-M-J-V-S-D): las 5 áreas ya migradas al marco de 11 indicadores imprimen la
lista real de actividades (con meta/unidad chiquita debajo del nombre cuando aplica, y un
punto rojo para las críticas); las 5 áreas sin migrar imprimen una plantilla en blanco para
llenarse a mano. Se abre directo con el botón "Imprimir / Guardar PDF" de la propia página.

**Ojo:** el array de actividades ahí adentro es una copia de `SEED_ACTIVITIES` en
`lib/supervision/db.js`, no se lee de la misma fuente — si el catálogo cambia en la base de datos,
hay que actualizar `entrenamiento.html` a mano también.

## Deploy — por GitHub (no manual)

Este proyecto ya está conectado: repo [MiguelEnriquePortilla/chickenia](https://github.com/MiguelEnriquePortilla/chickenia)
enlazado al proyecto `chickenia` en Vercel. Cada push a `main` dispara build y deploy
automático a `chickenia.chicanito.app` — no hace falta `vercel --prod` ni ninguna CLI.

El repo git vive un nivel arriba de esta carpeta (`02-OPERACION/`, con `ChickenIA/` como
subcarpeta). Para desplegar un cambio:

```bash
cd ..                                # a 02-OPERACION, donde vive .git
git add ChickenIA
git commit -m "mensaje del cambio"
git push origin main
```

En unos ~10 segundos el cambio queda live. La variable `DATABASE_URL` (Neon Postgres) ya
está configurada en Vercel.

**Por qué así y no con deploys manuales de archivos:** se probó subir cambios directo a
Vercel sin pasar por git (una tool que sube el árbol de archivos completo en cada llamada)
y, al no incluir *todos* los archivos en una sola llamada, cada intento borraba partes de
la app ya en producción — pasó cinco veces seguidas en una sola sesión. Con GitHub, el
repo completo siempre va junto; no hay forma de mandar "la mitad" de un push.

## Pendiente para siguientes iteraciones

- Conectar la API de Poster para importar venta por artículo automáticamente
  (tabla `pos_sales` ya existe, lista para recibir los datos).
- Migrar las 5 áreas restantes (Ventas/Barras, Trastes, Supervisión, Moto x2) al marco de
  11 indicadores, cuando Miguel mande la transcripción de cada una.
- Concentrar el recetario (por ahora vive fuera de ChickenIA, en la carpeta que Miguel
  defina) y decidir si conviene sumarlo aquí o dejarlo aparte.
- Roles/login: por ahora no hay autenticación — Nancy usa `/supervision.html` y
  Miguel/Lilian `/dashboard.html`, mismo criterio que el resto de las apps de Chicanito
  (sin cuentas, acceso por URL).
