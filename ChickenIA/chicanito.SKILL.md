---
name: chicanito
description: Loads Chicken Chicanito / Moto Chicanito's confirmed brand identity (exact colors, fonts, tone, mascot rules), the current Socio Operativo recruiting campaign context (candidate profile, compensation framing, approved hook, WhatsApp contact, channel strategy), and the live CHICKEN·IA operations app (architecture, deploy method, access model, current state) so nothing has to be re-explained. Use this whenever the user mentions Chicanito, Chicken Chicanito, Moto Chicanito, Jojutla, Socio Operativo, CHICKEN·IA, ChickenIA, or asks to write copy, generate images/prompts, build campaign materials, or work on the ops app for this business — even if they don't name the skill explicitly or say "load context." Also use it before generating any marketing image or ad copy for this brand, since it contains hard-won corrections (what NOT to do) that are easy to accidentally repeat.
---

# Chicken Chicanito — Brand & Campaign Context

This skill exists so Miguel doesn't have to re-explain his business, brand, active campaign, or the CHICKEN·IA app every session. Read this whole file before doing any Chicanito-related work — it's short by design.

## 1 · The business

**Chicken Chicanito** is a 20+ year rotisserie chicken restaurant in Jojutla, Morelos, Mexico — no dine-in, no delivery, everything sold to-go, and it still does ~$9.8M MXN/year from one location.

**Moto Chicanito** (branded on the live app as **Chicanito Móvil**) is a branded mobile food-cart unit (a motorcycle-trailer, not a truck) that a *Socio Operativo* (operating partner) drives out from the store each morning, loaded with pre-cooked product, to sell at satellite points — schools, office zones, industrial parks. It's a partnership/commission model, not an hourly job.

There's a parallel, separate project — a CDMX expansion seeking an investor partner (*socio capitalista*) for a flagship store with 5 future Moto Chicanito units. That's a different audience (investors) from the current active campaign (recruiting an operator). Don't mix the two unless the user asks about CDMX specifically.

Source documents live on Miguel's desktop at `C:\Users\hp\Desktop\CHICANITO\` — notably `Documentos\Identidad de Marca\CHICANITO-Design-System-Handoff.md.txt` (full color/type system), `Chicanito Franchise\Inversionista\assets\` (real rendered brand assets — `chicanito-movil.png`, `mascota.png`), and `Documentos\Moto Chicanito Movil\Manual Operativo Moto Chicanito.pdf` (the real compensation rules). If you need something not covered below, that folder is the source of truth — read from it rather than guessing.

## 2 · Brand identity — do not deviate from these

**Colors (confirmed hex, verified against the real investor memo, not guessed):**
| Use | Hex |
|---|---|
| Red | `#E30613` |
| Navy | `#1A213E` |
| Black | `#1D1D1B` |
| White | `#FFFFFF` |
| Gold/amber accent | `#D9A441` |
| Cream/parchment background | `#FFF6EB` |

(Note: the live CHICKEN·IA app uses very slightly different navy/cream hex values — `#17213E` navy, `#FFF7EC` cream — carried over from an earlier session. Functionally identical; when touching the app, match its own `css/style.css` variables rather than reconciling the two.)

**Typography:** Bebas Neue for display/headlines (condensed, bold, all-caps). Poppins for body text, labels, and numbers.

**Tone — the most important rule here:** *"sobrio y con autoridad, no promocional."* Editorial and premium, like a page out of an investor deck — NOT a loud cartoon poster. Concretely: cream background (not a solid navy wall), gold divider lines, stat-cards (navy rectangle, big white number, small caps label below — "la cifra manda"), a subtle repeating watermark texture of the "Very Sabrosito!" script at ~5% opacity, and the mascot used **small**, as a circular badge/seal in a corner — never as a giant hero illustration dominating the piece.

**Why this rule exists:** the first AI-generated recruiting image made this session followed a generic loud Americana-sports-poster convention with the mascot as a huge hero character, and Miguel immediately flagged it as looking "muy de IA." The fix was grounding every subsequent piece in the real design-system handoff and the real investor memo (which uses the restrained, editorial style above) instead of inventing a generic fast-food-poster aesthetic. Don't regress to the loud version even if it feels more "fun" — it reads as off-brand and AI-generic to Miguel specifically.

**Mascot:** anthropomorphic rooster, red cap with "CC," gold chain, red varsity jacket with "CC" patch, confident/urban attitude, thumbs-up pose. Never change the pose, never drop the accessories, never redraw it from a text description if a reference image can be attached instead — when generating new images (e.g. via ChatGPT), attach an already-approved Chicanito image as a style/subject reference rather than describing the mascot in prose. Text descriptions alone tend to drift from the real character.

**The real round logo/badge asset** (confirmed live, hotlinkable): `https://www.chicanito.app/assets/brand/logo-badge.jpg` — this is the actual round mascot badge used on `chicanito.app` and `chicanito-movil-landing.vercel.app`. **Never invent a substitute round icon** (a CSS/SVG monogram, a redrawn chicken-head, anything generic) when a round mascot badge is needed — Miguel explicitly rejected a hand-built placeholder icon once ("muy mal ese icono... no utilices nada genérico... usa el logo original") and expects this exact asset to be used going forward for any circular mascot badge, on the app or elsewhere.

**Tagline:** "Very Sabrosito" / "Very Rapidito."

## 3 · Active campaign — Socio Operativo, Jojutla

**What's being recruited:** one Socio Operativo (operating partner, explicitly *not* an employee) for the first Moto Chicanito unit in Jojutla. Commission-based partnership, not a salaried job.

**Candidate profile (v2 — corrected this session, don't revert):** prioritize **salespeople and entrepreneurs** — ideally people who already sell via social media (Instagram/TikTok/Facebook) — over "repartidor" (delivery-driver) profiles. A moto driving license is a baseline minimum requirement, not the differentiator. The original draft of this campaign over-indexed on "has a delivery license" as the headline requirement; Miguel corrected this explicitly to "buscamos vendedor, no repartidor." Keep leading with sales/entrepreneurial ability in any new copy, interview questions, or targeting.

**Compensation (from the real Manual Operativo — verify math before quoting):** $250/day base pay. At 25 packages sold in a day, it doubles to $500 (automatic bonus). Each additional package above 25 adds +$10, uncapped. Agreed marketing framing — present as earning tiers, not as a formula:
- $500/day — "el día que solo cumples tu mínimo"
- $750/day — "si le echas ganas" (this matches the manual's own real "excelente" tier at 50 packages/day — it's a genuine, achievable number)
- $1,000+/day — "sin límite" (this requires 75 packages/day by the formula — mathematically valid since the manual says "no hay techo," but it's the aspirational ceiling, not a typical day. Flag it as such internally; don't let it read as a guarantee.)

**Confirmed WhatsApp contact:** `734 126 0080` — must appear in every campaign piece (posts, captions, job ads, images).

**Approved hook/angle:** *"Si ya sabes vender —en la calle, en redes, donde sea— esto no es una vacante. Es tu primer negocio."* Sales/entrepreneur identity angle. Money-first, urgency/scarcity, and generic delivery-driver angles were all considered and explicitly rejected in favor of this one — don't default back to them without asking.

**Channel strategy conclusions (already researched, don't re-derive from scratch):** Glassdoor and OCC Mundial are low-value for this operational/local segment in Mexico. Computrabajo and Indeed México are meaningfully better for reach. Facebook (local Jojutla groups — compra-venta, emprendedores) and Instagram/TikTok are the highest-priority channels given the sales/social-seller profile. WhatsApp broadcast and the physical Jojutla storefront are strong free/organic channels. Paid spend, if used at all, should be small ($500–1,500 MXN) and geo-targeted to a 10–15km radius around Jojutla.

## 4 · What's already been produced for the recruiting campaign (don't redo from scratch — extend it)

- A full campaign brief (`campana-socio-operativo-moto-chicanito.md`) — objectives, persona, messaging, channel strategy, content calendar, interview guide, risks, metrics.
- An approved Facebook post image, "Abre tu propio Chicanito" — cream/navy/red/gold editorial style, stat-cards, small circular mascot badge, WhatsApp number already baked into the image (edited in directly with PIL after the AI generation, to avoid paying for another generation just to add a phone number).
- A WhatsApp-formatted version of the caption copy (using WhatsApp's own `*bold*` / `_italic_` syntax, not standard markdown).
- A handoff doc for two more planned images — a "¿Cuánto ganaste ayer vendiendo para alguien más?" pattern-interrupt piece and an "¿Eres tú?" self-selection checklist piece — each with full on-image copy, captions, and ready-to-use ChatGPT image-generation prompts that reference the approved piece as a style anchor.
- A platform format cheat-sheet (FB post/story, IG post/story/reel cover, TikTok photo mode — exact pixel dimensions and safe-zone rules for each).

## 5 · CHICKEN·IA — the daily-operations app

**What it is:** a live internal web app (vanilla HTML/CSS/JS + Vercel serverless functions + Neon Postgres) at **chickenia-three.vercel.app** that digitizes the paper daily checklists for every area of the Jojutla store and the Chicanito Móvil units. Each area/shift marks activities done; the system computes a weighted % compliance score automatically. The "IA" in the name is currently **just the weighting/prioritization logic, not an LLM or chatbot** — be honest about this if Miguel or his team asks what the AI does; don't oversell it as more than it is.

**Structure (source of truth: `SEED_ACTIVITIES` / `SEED_AREAS` / `SEED_LOCATIONS` in `api/lib/db.js`):**
- Locations: Jojutla (tienda) + Chicanito Móvil 1/2/3. Only Móvil 1 is close to launch — Móvil 2 and 3 show struck-through/disabled in both `dashboard.js` and `supervision.js` selects (`NOT_YET_ACTIVE` array) until they're ready.
- Areas: 8 in tienda (Rastro, Cocina, Rosticero, Freidoras, Caja, Ventas/Barras, Trastes, Supervisión) + 2 per móvil (Recepción, Cierre).
- Activities: 130 total, taken verbatim from Chicken Chicanito's real paper checklists (Google Sheets "ACTIVIDADES POR AREAS 2") for tienda, and a first-draft supervision checklist for móvil. Each has a criticality (`baja`=weight 1, `media`=3, `alta`=6, `critica`=10) that drives the % score and which pendings get flagged in red.

**Access model:** `supervision.html` (Nancy's screen) is intentionally open, no password — it's used constantly on the floor. `dashboard.html` (Miguel/Lilian's consolidated numbers view) is password-gated (`chickenia2026`, stored in `localStorage` client-side — not real security, just a soft gate) via `initGate()` in `js/dashboard.js`. Don't add a gate to `supervision.html` — Miguel was explicit that it's "no es secreto, pero no es estético" for Nancy to see the numbers view, not that it needs to be locked.

**Branding on the app:** wordmark is "CHICKEN·IA" (CHICKEN in navy/white depending on background, middle dot in gold, IA in red). Mascot badge = the real logo image (`https://www.chicanito.app/assets/brand/logo-badge.jpg`, hotlinked via `<img>`, `border-radius:50%`, `object-fit:cover`) — see the "do not invent a substitute" note in §2.

**Deploy method:** `mcp__Vercel__deploy_to_vercel` (direct file-tree deploy to Vercel's API, bypasses GitHub entirely). Project: `chickenia` (id `prj_2uSEQioZxV2diY9nUmoWgQLW6mW8`), team `team_1P2MDjO0f72YHux4j2yu7JJx`. **Gotcha:** the project has a persisted Root Directory setting of `ChickenIA` that `projectSettings.rootDirectory: null` does NOT override — every file path in the `files` array must be prefixed `"ChickenIA/"` or the deploy fails with `NOW_SANDBOX_WORKER_ROOTDIR_NOT_EXIST`. After deploying, poll `mcp__Vercel__get_deployment` for `readyState: "READY"`, then verify with `WebFetch` using a cache-busting query param (WebFetch caches identical URLs ~15 min, causing false-stale reads).

**One-time DB migrations** (e.g. renaming seeded rows after the DB already has data — editing `SEED_ACTIVITIES`/`SEED_LOCATIONS` only affects a *fresh empty* database, not rows already seeded): write a temporary guarded endpoint (e.g. `api/admin-*.js`, gated by a `?key=` query param check), deploy, invoke once via `WebFetch`, confirm the change, then delete the endpoint and redeploy without it. Already used once to rename `Moto Chicanito N` → `Chicanito Móvil N` in the live `locations` table — don't recreate that specific endpoint, it's done.

**UI/UX layer (shipped in the follow-up session, on top of v1):** both `supervision.html` and `dashboard.html` got a redesign to stop the checklist from being "una sola hoja gigante" and to surface at-a-glance progress:
- **Accordion per área** in Supervisión — each `.area-block` is a collapsible `<button class="accordion-header">` + `<div class="accordion-body">`, state persisted in `localStorage` key `chickenia_open_areas` (JSON array of open area codes). Implemented with direct DOM show/hide (`hidden` attribute + `aria-expanded`), never a re-render, so it never wipes in-progress unsaved form input. On first load, areas with an unresolved *critica* pending auto-open; the rest stay collapsed (respects any saved user preference after that).
- **Top status bar** (`#area-status-bar` / `.area-chip`) on both screens — one chip per área showing name + live % score, color-coded gray/`.status-warn` (≥50%)/`.status-ok` (≥80%)/`.status-critical` (has an unresolved critical pending — takes priority over the score color). Clicking a chip jumps to and expands that área.
- **Corner `⋮` menu** (`.corner-menu-btn` / `.corner-menu-panel`, top-right of the header) holds only secondary controls, per Miguel's call when this was planned: "Expandir todas las áreas" / "Colapsar todas las áreas" / "🌙 Modo oscuro", plus "Cerrar sesión" on the Dashboard only (clears the `chickenia_dash_ok` gate flag). The top bar handles navigation (chips); the corner menu does not duplicate it.
- **Dashboard**: the "Desempeño por área" and "Movimientos de inventario" sections are now collapsible the same way (`initCollapsible`/`setCollapsible` helpers in `dashboard.js`), and the movements header shows a live count, e.g. "Movimientos de inventario — hoy (3)".
- **Dark mode** — shared `localStorage` key `chickenia_theme` (`dark`/`light`) works identically across `index.html`, `supervision.html`, and `dashboard.html` via a tiny inline `<script>` in each `<head>` that sets `data-theme="dark"` on `<html>` before paint (avoids a flash of light mode). CSS uses design-token custom properties — `--bg`, `--surface`, `--text`, `--border-soft` — defined as light-mode aliases of the existing brand vars in `:root`, then overridden only inside `:root[data-theme="dark"]`. Brand-color vars (`--navy`, `--red`, `--gold`, etc.) are untouched so intentionally-navy elements (header, buttons) look the same in both themes. **If you add any new component, style it with these tokens (or add a dark override) — don't hardcode `#fff`/`#eee`/etc., or it'll go low-contrast or invisible in dark mode** (this exact bug happened once with `.activity-row.done`, a near-white hardcoded background that made done-rows unreadable in dark mode — fixed with `:root[data-theme="dark"] .activity-row.done { background: rgba(31, 157, 85, 0.16); }`).

**Testing before deploying UI changes:** there's a local Playwright + mock-API harness in `test/` — `test/fixtures.py` (small fake `LOCATIONS`/`AREAS`/`CHECKS`/`MOVEMENTS` plus a `build_summary()` that replicates the real `api/summary.js` weighted-scoring logic exactly) and `test/run_visual_test.py` (spins up a local `http.server` serving the real repo, mocks `/api/**` via Playwright's `page.route`, walks through every interactive path — accordion open/close, chip-jump, corner menu, dark mode toggle, expand/collapse-all, reload-persistence, dashboard gate/collapsible sections/logout — screenshotting each state to `test/shots/*.png` and asserting zero `pageerror`s). **Reuse/extend this instead of testing directly against production** — it already caught one real dark-mode contrast bug before it shipped.

**Deploy gotcha (important, nearly caused a live break):** `deploy_to_vercel` is a **full file-tree replace, not incremental** — every deploy must include the *complete* current file set, or the missing files effectively get deleted from that deployment. Mid-session, a UI-overhaul deploy was submitted with only `.gitignore`/`package.json`/`README.md`/`index.html`/`supervision.html`/`dashboard.html` — accidentally omitting `css/style.css`, both `js/*.js` files, and all 7 `api/*.js` files. This was caught and corrected with a second full deploy before the bad one could get promoted/aliased, but it's a real risk. **Before every `deploy_to_vercel` call, checklist the full 16-file set:** `.gitignore`, `package.json`, `README.md`, `index.html`, `supervision.html`, `dashboard.html`, `css/style.css`, `js/dashboard.js`, `js/supervision.js`, `api/locations.js`, `api/areas.js`, `api/checks.js`, `api/inventory-items.js`, `api/inventory-movements.js`, `api/summary.js`, `api/lib/db.js` (all prefixed `ChickenIA/` per the Root Directory gotcha above).

**Known minor issue (low priority, not user-facing):** the live `README.md` is currently an abbreviated 2-line placeholder, not the original full version — a side effect of hand-reconstructing the file set during the emergency corrected deploy above. Doesn't affect functionality (nothing serves/reads it), but restore the full original text next time a deploy touches the repo root, for accuracy's sake.

**Current state (as of the end of this session):** two things are out for Miguel's review in parallel, and both are v1/"borrador" — expect feedback on both, not just one:
1. **The manual + activities appendix** — printable one-page PDF manual (`CHICKEN-IA_Manual_Borrador.pdf`) explaining how the system is organized (locations → areas → activities, criticality weights, access model, metrics, honest explanation of the "IA" branding) plus a 5-page appendix listing all 130 seeded activities by area with a blank "Notas / ajustes" column for handwritten feedback. He said he's reviewing it by hand and will come back with changes (activities to add/remove/reword, criticality reweights, area names, etc.).
2. **The UI overhaul above** (accordion, top-bar chips, corner menu, dark mode, collapsible dashboard) — deployed to production and verified live (`chickenia-three.vercel.app`, deployment `dpl_6wBJHuuo34z3WkADdaWSLbMNNcws`, `readyState: READY`, alias confirmed via `get_deployment`; CSS/JS/HTML/API all spot-checked live via `WebFetch`). Miguel hasn't seen/used it yet as of session end — when he gives feedback on it, it'll likely be about the accordion/chip/menu UX itself, not content.

When feedback on either arrives: for **activity content** changes, update `SEED_ACTIVITIES` in `db.js`/`api/lib/db.js` for the source of truth, and — since the live DB is already seeded — use the one-time-migration-endpoint pattern above (not just editing the seed constant) to apply changes to the already-existing rows; regenerate the manual PDF if the changes are substantial. For **UI/UX** changes, extend the existing CSS tokens/accordion/corner-menu patterns above rather than introducing new mechanisms, and re-run the `test/` Playwright harness before redeploying.

**Environment quirks encountered this session (may recur):** the cloud workspace's own network egress is proxy-restricted — direct `curl`/`bash` HTTP requests to `vercel.app`/`chicanito.app` domains get a 403 from the sandbox's own proxy (confirmed via `curl -v`, not a Vercel-side issue) — always use `WebFetch` for external verification instead, with a cache-busting query param (WebFetch caches identical URLs ~15 min, causing false-stale reads). Note `WebFetch` converts HTML to markdown before analysis, so it's unreliable for checking raw attributes like element `id`s/classes (ask about *visible text* or fetch a plain-text asset like `.css`/`.js` instead, where it reads verbatim). The `mcp__remote-devices__*` bridge to Miguel's actual machine can disconnect mid-session and not reconnect — don't block work on it; the Vercel-direct-deploy method above doesn't need it at all.

## 6 · How Miguel likes to work

- Ask before big creative swings — he'd rather answer 1-2 quick clarifying questions (angle, quantity, format) than get a wall of unrequested options.
- Copy should sound direct and human, like a person talking, not corporate HR-speak. He personally rewrites toward this if it drifts.
- He's cost-conscious about paid AI image generation — prefers editing/reusing an already-generated image (e.g. adding a phone number with a script) over paying to regenerate from scratch. Offer the cheaper edit path first when it'll get the job done.
- When something doesn't look right, he'll say so plainly ("se me hace muy de IA", "muy mal ese icono... no utilices nada genérico") and expects the fix to be grounded in the real brand documents/assets, not a fresh guess — go re-check the source files (or the live reference sites) before re-attempting.
- When he says "solo cambia X, no hagas nada más" — scope the fix tightly to exactly that, don't bundle in other improvements even if they seem helpful.
- He does infrastructure/deploy work himself when possible (Vercel, DB) rather than needing manual copy-paste hand-offs — prefer direct-deploy tools over asking him to upload files.

## 7 · When this skill triggers, start by doing this

Don't just silently hold this context — briefly confirm you have it loaded (one line is enough, e.g. "Ya tengo el contexto de Chicanito cargado") and ask what he wants to work on next, unless he's already stated a clear task in the same message.
