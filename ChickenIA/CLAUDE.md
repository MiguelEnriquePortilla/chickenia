# ChickenIA — contexto para Claude Code

**Nota 2026-08-26: la tarea de "pulir el acabado visual" descrita más abajo ya se completó**
(formato + animaciones, dos rondas, ambas desplegadas y verificadas en producción). Lee
`HANDOFF_COWORK.md` primero — tiene el detalle completo de esa sesión y los pendientes
reales actuales. Lo de abajo queda como contexto histórico de cómo arrancó este proyecto.

Este proyecto viene de una sesión de Cowork (Claude en la nube) que ya construyó y desplegó
la app completa. Esta carpeta es una copia exacta de lo que está en producción. Tu trabajo
aquí es continuar **desde este punto exacto**, no empezar de cero ni repensar la arquitectura.

Lee `HANDOFF_COWORK.md` y `chicanito.SKILL.md` en esta misma carpeta antes de tocar nada —
tienen todo el contexto de marca, del negocio, y el detalle técnico completo. Este archivo
es solo el resumen operativo + la tarea específica de esta etapa.

## Qué es esto

App interna de operaciones para Chicken Chicanito (rosticería en Jojutla, Morelos) y las
unidades móviles Chicanito Móvil. HTML/CSS/JS vanilla (sin frameworks, sin build step) +
funciones serverless de Vercel + Postgres (Neon). Dos pantallas: `supervision.html`
(checklist en tiempo real, sin contraseña) y `dashboard.html` (métricas consolidadas,
con gate de contraseña `chickenia2026`).

**Producción:** `https://chickenia-three.vercel.app` — proyecto Vercel `chickenia`
(`prj_2uSEQioZxV2diY9nUmoWgQLW6mW8`, team `team_1P2MDjO0f72YHux4j2yu7JJx`). Ya está
desplegado y funcionando; lo que hagas aquí es sobre lo que ya vive en producción.

## La tarea de esta etapa: pulir el acabado visual

La sesión anterior ya construyó toda la funcionalidad: acordeón colapsable por área en
Supervisión, una barra superior de "chips" con el % de avance de cada área (código de
color: gris/amarillo/verde/rojo según score y pendientes críticos), un menú `⋮` en la
esquina (expandir/colapsar todo, modo oscuro, cerrar sesión en Dashboard), y secciones
colapsables en el Dashboard. Todo eso **ya funciona y ya está probado** — no lo
reconstruyas.

**Lo que falta es pulido de diseño: animaciones y mejores acabados.** Tienes Claude Design
conectado — úsalo para esto. Algunas ideas concretas de dónde hay oportunidad (no es una
lista cerrada, usa tu criterio):

- Transición suave al abrir/cerrar un área del acordeón (actualmente es instantáneo vía
  el atributo `hidden` — se puede animar con `max-height`/`grid-template-rows` o
  `interpolate-size` sin romper el patrón de "no re-renderizar" que ya está ahí a propósito).
- Micro-animación en los chips de la barra superior al cambiar de estado (por ejemplo
  cuando pasan de warning a ok tras marcar una actividad).
- Transición al abrir/cerrar el menú `⋮` (actualmente aparece/desaparece de golpe).
- Transición de modo claro↔oscuro (actualmente es un cambio instantáneo del atributo
  `data-theme`; un fade corto de colores se sentiría más pulido).
- Feedback visual al marcar una actividad como hecha (el check ya se guarda al instante,
  pero la fila podría tener una micro-animación de confirmación).
- Estados de carga / skeleton mientras cargan los datos de un área o ubicación nueva.
- Barra de progreso del `%` de cumplimiento animada al llenarse, no solo aparecer con el
  valor final.

**Lo que NO debes tocar en esta etapa:**
- La lógica de scoring/ponderación (`CRITICALITY_WEIGHT`, cómo se calcula el % — vive en
  `api/lib/db.js` y `api/summary.js`).
- El catálogo de actividades (`SEED_ACTIVITIES` en `api/lib/db.js`) — eso está en un track
  separado, pendiente de la retroalimentación de Miguel sobre el manual impreso que ya
  revisó por su cuenta. No mezcles ambos tracks.
- La estructura HTML/JS del acordeón, chips y menú — ya están hechos y probados; anímalos,
  no los reemplaces por un mecanismo distinto.

## Sistema de diseño ya establecido — úsalo, no inventes uno nuevo

`css/style.css` ya tiene custom properties (design tokens) para modo claro/oscuro:
`--bg`, `--surface`, `--text`, `--border-soft` (alias de modo claro de las variables de
marca en `:root`, sobreescritas solo dentro de `:root[data-theme="dark"]`). Las variables
de marca (`--navy`, `--red`, `--gold`, etc.) no cambian entre temas. **Cualquier animación
o componente nuevo debe usar estos tokens** — si hardcodeas un color fijo (`#fff`, `#eee`,
etc.) se va a ver mal o invisible en modo oscuro. Ya pasó una vez con `.activity-row.done`
y se corrigió — no lo repitas en componentes nuevos.

**Colores de marca:** rojo `#E30613`, navy `#1A213E` (la app usa `#17213E`, prácticamente
igual — respeta la que ya está en `style.css`), negro `#1D1D1B`, blanco `#FFFFFF`, dorado
`#D9A441`, crema `#FFF6EB` (la app usa `#FFF7EC`). Tipografía: Bebas Neue para
títulos/display, Poppins para texto y números. Tono de marca: editorial y sobrio, no
promocional — evita animaciones muy "juguetonas" o de app genérica; que se sientan como
transiciones discretas de un producto premium, no rebotes exagerados ni confetti.

## Probar antes de desplegar

Ya existe un harness de pruebas visuales en `test/` — `test/fixtures.py` (datos falsos +
la misma lógica de scoring que la API real) y `test/run_visual_test.py` (levanta un
servidor local, mockea las rutas `/api/**` con Playwright, y recorre cada interacción:
abrir/cerrar áreas, menú, modo oscuro, chips, recargar página). Requiere Python +
Playwright (`pip install playwright && playwright install chromium`, o usa el Chromium
del sistema si ya está). Córrelo antes de cada deploy — ya atrapó un bug real de
contraste en modo oscuro antes de que llegara a producción.

## Cómo desplegar desde aquí — SIEMPRE por GitHub, nunca por snapshot directo a Vercel

**Regla dura (8 sep 2026): NUNCA uses la tool `deploy_to_vercel` (deploy de archivos
directo/MCP) para esta app.** Esa tool sube un snapshot completo del árbol de archivos en
cada llamada — si te falta un solo archivo en la llamada, ese archivo desaparece de
producción. Eso pasó de verdad: intentando agregar solo los iconos del PWA, se rompió la
app en producción **cinco veces seguidas** (perdía CSS, o JS, o toda la API) porque cada
intento de "solo agregar lo nuevo" borraba lo demás. Cambiar a GitHub resolvió todo en un
solo push.

El repo ya existe y el proyecto de Vercel ya está enlazado a él — cada push a `main` hace
build y deploy automático (usa Root Directory `ChickenIA` dentro del repo, así que el repo
en sí vive un nivel arriba, en `02-OPERACION/`, con `ChickenIA/` como subcarpeta):

- Repo: https://github.com/MiguelEnriquePortilla/chickenia
- El working tree de git es `02-OPERACION/` (el padre de esta carpeta), NO esta carpeta.
  `.git/` vive ahí. `git status`/`git add`/`git commit`/`git push` deben correr desde ahí
  (o con `cd` explícito), apuntando a rutas `ChickenIA/...`.

Flujo normal para desplegar un cambio:

```bash
cd "02-OPERACION"                    # el padre de ChickenIA, donde vive .git
git add ChickenIA
git commit -m "mensaje del cambio"
git push origin main
```

Eso dispara el build en Vercel solo. Confirma con `get_deployment` (o revisando
`chickenia.chicanito.app` directo) que llegó a `READY` — normalmente toma ~10 segundos.

La variable de entorno `DATABASE_URL` (Neon Postgres) ya está configurada en el proyecto
en Vercel — no hace falta volver a agregarla a menos que la base de datos cambie.

Si algún día hace falta un deploy manual de verdad (sin git, caso raro) — por ejemplo para
probar algo en preview sin ensuciar el historial — usa `deploy_to_vercel` con
`target: "preview"` y **absolutamente todos** los archivos del árbol en una sola llamada,
nunca `target: "production"` para pruebas.

## Nota chiquita pendiente (no urgente)

El `README.md` en producción quedó abreviado por un deploy de emergencia en la sesión
anterior; el que está en esta carpeta ya es la versión completa correcta — al desplegar
desde aquí eso se corrige solo, sin que tengas que hacer nada especial.
