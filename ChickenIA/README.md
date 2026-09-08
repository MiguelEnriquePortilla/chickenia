# ChickenIA

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
  `inventory-movements`, `summary`, `employees`, `attendance`) y `api/lib/db.js` con el
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
simple original. Todo vive en `api/lib/db.js` (`SEED_ACTIVITIES`); solo se siembra una vez
(si ya hay datos, no se vuelve a insertar), así que un cambio después del primer deploy se
hace directo en la base de datos o borrando la tabla `activities` para que se vuelva a
sembrar.

## Hojas de entrenamiento (`/entrenamiento.html`)

Página standalone, no enlazada desde el resto de la app. Genera con JS, desde un array de
datos embebido en el propio archivo, una hoja imprimible por área (tamaño carta horizontal,
columnas L-M-M-J-V-S-D): las 5 áreas ya migradas al marco de 11 indicadores imprimen la
lista real de actividades (con meta/unidad chiquita debajo del nombre cuando aplica, y un
punto rojo para las críticas); las 5 áreas sin migrar imprimen una plantilla en blanco para
llenarse a mano. Se abre directo con el botón "Imprimir / Guardar PDF" de la propia página.

**Ojo:** el array de actividades ahí adentro es una copia de `SEED_ACTIVITIES` en
`api/lib/db.js`, no se lee de la misma fuente — si el catálogo cambia en la base de datos,
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
