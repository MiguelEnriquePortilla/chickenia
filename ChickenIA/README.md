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
  `inventory-movements`, `summary`) y `api/lib/db.js` con el esquema y el catálogo
  semilla (áreas, actividades por área tomadas de los checklists reales de Chicanito,
  ~30 artículos de inventario).

La primera vez que cualquier endpoint corre, `ensureTables()` crea las tablas si no
existen y siembra el catálogo inicial — no hay que correr una migración a mano.

**Los pesos de criticidad y el catálogo de actividades son un primer borrador**
razonable, tomado de tus listas reales — ajústalos con Nancy directamente en
`api/lib/db.js` (arrays `SEED_AREAS`, `SEED_ACTIVITIES`, `SEED_INVENTORY_ITEMS`) antes
o después del primer deploy; solo se siembran una vez (si ya hay datos, no se vuelven
a insertar), así que un cambio después del primer deploy se hace directo en la base
de datos o borrando la tabla `activities` para que se vuelva a sembrar.

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
- Ajustar con Nancy y Miguel los pesos de criticidad y el catálogo de actividades.
- Concentrar el recetario (por ahora vive fuera de ChickenIA, en la carpeta que Miguel
  defina) y decidir si conviene sumarlo aquí o dejarlo aparte.
- Roles/login: por ahora no hay autenticación — Nancy usa `/supervision.html` y
  Miguel/Lilian `/dashboard.html`, mismo criterio que el resto de las apps de Chicanito
  (sin cuentas, acceso por URL).
