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

## Deploy — pasos exactos

1. Abre una terminal en esta carpeta (`ChickenIA`).
2. Instala dependencias:
   ```
   npm install
   ```
3. Si no tienes Vercel CLI:
   ```
   npm install -g vercel
   ```
4. Inicia sesión si hace falta:
   ```
   vercel login
   ```
5. Crea una base de datos en [neon.tech](https://neon.tech) (o usa una que ya tengas)
   y copia el **connection string** (empieza con `postgres://...`).
6. Enlaza el proyecto (te va a preguntar nombre — puedes usar `chickenia`):
   ```
   vercel link
   ```
7. Agrega la variable de entorno con el connection string de Neon:
   ```
   vercel env add DATABASE_URL
   ```
   Pégalo cuando lo pida, y selecciona Production y Preview.
8. Despliega a producción:
   ```
   vercel --prod
   ```
9. Abre la URL que te da Vercel. Entra a `/supervision.html` para que Nancy empiece a
   verificar, y a `/dashboard.html` para revisar tú y Lilian.

Opcional (recomendado para que quede igual que tus otros proyectos): sube esta carpeta
a un repo de GitHub y conecta ese repo en Vercel para que cada cambio se despliegue
solo.

## Pendiente para siguientes iteraciones

- Conectar la API de Poster para importar venta por artículo automáticamente
  (tabla `pos_sales` ya existe, lista para recibir los datos).
- Ajustar con Nancy y Miguel los pesos de criticidad y el catálogo de actividades.
- Concentrar el recetario (por ahora vive fuera de ChickenIA, en la carpeta que Miguel
  defina) y decidir si conviene sumarlo aquí o dejarlo aparte.
- Roles/login: por ahora no hay autenticación — Nancy usa `/supervision.html` y
  Miguel/Lilian `/dashboard.html`, mismo criterio que el resto de las apps de Chicanito
  (sin cuentas, acceso por URL).
