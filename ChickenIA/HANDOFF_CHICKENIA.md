# HANDOFF — ChickenIA (8 sep 2026)

Lee esto antes de tocar nada en este proyecto. Resume el estado real al cierre de esta
sesión y lo que falta confirmar en la siguiente.

## Qué es esto

App interna de operaciones para Chicken Chicanito (rosticería Jojutla + Chicanito Móvil).
HTML/CSS/JS vanilla + funciones serverless de Vercel + Postgres (Neon). Ver `CLAUDE.md` y
`chicanito.SKILL.md` en esta misma carpeta para contexto completo de marca/negocio.

**Producción:** `https://chickenia.chicanito.app` (alias) / `https://chickenia-three.vercel.app`
— proyecto Vercel `chickenia` (`prj_2uSEQioZxV2diY9nUmoWgQLW6mW8`, team `team_1P2MDjO0f72YHux4j2yu7JJx`).

## CAMBIO IMPORTANTE DE ESTA SESIÓN: deploy ahora es por GitHub, no manual

**Regla dura, no la rompas:** nunca uses la tool de deploy directo a Vercel (`deploy_to_vercel`,
snapshot de archivos) para esta app. Se rompió producción **cinco veces seguidas** en esta
sesión intentando agregar los iconos del PWA así — cada llamada sube el árbol completo de
archivos, y si falta uno solo, desaparece de producción. Cambiar a GitHub resolvió todo en
un push (~10 segundos, sin errores).

El repo ya existe y el proyecto de Vercel ya está enlazado — cada push a `main` hace build
y deploy automático:

- Repo: https://github.com/MiguelEnriquePortilla/chickenia
- El working tree de git es `02-OPERACION/` (el padre de esta carpeta `ChickenIA/`), NO
  esta carpeta. `.git/` vive en `02-OPERACION/`. Corre git desde ahí:
  ```bash
  cd "02-OPERACION"          # padre de ChickenIA, donde vive .git
  git add ChickenIA
  git commit -m "mensaje"
  git push origin main       # Vercel hace build y deploy solo, ~10s
  ```
- Identidad de git configurada **local al repo** (no global): `user.email
  miguel.e.portilla@gmail.com`, `user.name "Miguel Portilla"`.
- Esto ya quedó documentado en `CLAUDE.md` y `README.md` de esta carpeta — no hace falta
  repetir la explicación al usuario, solo seguir el flujo.

## Estado de la app (todo confirmado en producción)

- Checklist con marco de 11 indicadores (INSUMO, PRODUCCIÓN, EXCEPCIÓN, LIMPIEZA,
  FRECUENCIA, ANTICIPACIÓN, PUNTUALIDAD, DINERO, CALIDAD, PROCESO, EVIDENCIA) ya cargado
  para **5 áreas**: Freidoras (piloto, 2 sep), Rastro, Cocina, Rosticero, Caja (7 sep).
  Catálogo completo en `api/lib/db.js` (`SEED_ACTIVITIES`).
- **5 áreas pendientes de reclasificar** al marco de 11 indicadores (siguen con el
  catálogo simple original): Ventas/Barras, Lavado de Trastes, Supervisión (tienda),
  Moto — Recepción, Moto — Cierre. Nadie ha mandado transcripción de audio para estas
  todavía — no las toques hasta que Miguel mande la transcripción, como con las anteriores.
- **Asistencia** (7 sep): feature nueva, NO es checklist — es reloj checador diario por
  empleado (entrada / comida-salida / comida-regreso / salida), hora de servidor, nunca
  a mano. Tablas `employees` + `attendance_checks`, API en `api/employees.js` +
  `api/attendance.js`, UI arriba del checklist en `supervision.html`. 13 empleados
  sembrados (nombres confirmados por Miguel, con acentos correctos).
- **PWA**: `manifest.json`, `sw.js` (sin fetch handler a propósito — la app necesita datos
  en vivo), iconos en `icons/` (JPEG comprimido, no PNG — el arte con degradado comprimía
  mucho mejor así). Confirmado: manifest carga, iconos regresan 200, instalable.

## Pendiente — lo único que falta es a ojo de Miguel/Nancy, no de código

`entrenamiento.html` (commit `51fc630`) quedó **confirmado en producción** al reanudar la
sesión: `get_deployment` → `READY`, y `https://chickenia-three.vercel.app/entrenamiento.html`
responde 200 con el HTML completo (10 hojas). No hace falta re-verificar el deploy.

Lo único que sigue abierto es que Miguel/Nancy revisen cómo se ve **impreso o en PDF real**
(el diseño solo se probó en pantalla vía el Browser pane) — abrir la URL, dar clic en
"Imprimir / Guardar PDF", y confirmar que los saltos de página entre áreas se vean bien
antes de imprimir en volumen. Si hace falta ajustar algo (tamaño de letra, alto de fila,
dónde cae un salto de página), es edición directa en `entrenamiento.html` + el flujo de
deploy normal (`git add / commit / push`), no algo que requiera tocar la app en sí.

## Sobre `entrenamiento.html`

Página nueva, standalone, NO parte del flujo normal de la app (no la enlaces desde
`index.html` a menos que Miguel lo pida). Genera las hojas con JavaScript desde un array
de datos embebido en el propio archivo (copiado literal de `SEED_ACTIVITIES` en
`api/lib/db.js` — si el catálogo cambia ahí, hay que actualizar `entrenamiento.html` a
mano también, no se leen de la misma fuente).

- Una hoja por área, tamaño carta horizontal, columnas L-M-M-J-V-S-D.
- Las 5 áreas con catálogo de 11 indicadores (Rastro, Cocina, Rosticero, Freidoras, Caja)
  imprimen la lista real de actividades, con la meta/unidad chiquita debajo del nombre
  cuando la actividad requiere cantidad, y un punto rojo para las críticas.
- Las 5 áreas sin reclasificar imprimen una plantilla en blanco (filas vacías) para
  llenarse a mano — decisión explícita de Miguel en esta sesión, no un descuido.
- Autopaginación vía CSS (`thead { display: table-header-group }` + `page-break-inside:
  avoid` por fila) — si un área no cabe en una hoja, el encabezado de columnas se repite
  solo en la siguiente página. No se hizo split manual "1/2, 2/2".
- Abre bien por `file://` directo (sin servidor) porque no usa rutas absolutas `/css/...`
  como el resto de la app — todo el CSS está inline. Útil para iterar rápido sin depender
  del deploy.

## Convención de memoria para este proyecto

Ver memoria `project_chickenia.md` (índice en `MEMORY.md`) para contexto de sesiones
anteriores a esta. Actualízala si el estado cambia de forma importante.
