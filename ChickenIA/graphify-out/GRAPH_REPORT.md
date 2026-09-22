# Graph Report - .  (2026-09-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 792 nodes · 1251 edges · 62 communities (47 shown, 15 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 108 edges (avg confidence: 0.56)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `05b0c543`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- telegram.js
- food-mcp.js
- db.js
- inventory-auth.js
- app.js
- js/inventory.js
- supervision.js
- dev-inventory.js
- scripts
- lib/rastro.js
- lib/protein-inventory.js
- chicken-query.test.js
- dashboard.js
- interface
- chicken-units.js
- inventory-store.js
- today
- js/protein-inventory.js
- cash-close.js
- inventory-domain.js
- js/rastro.js
- inventory.test.js
- production-daily.js
- proteins.test.js
- daily-live.test.js
- pilot-access.test.js
- manifest.json
- sync-training-rastro.js
- foodia-local.test.js
- foodia.test.js
- vercel.json
- build-static.js
- chicken-chat.js
- daily-capture.test.js
- protein-view.js
- cash-close-web.js
- daily-photo.test.js
- area-navigation.js
- daily-handler.js
- run_visual_test.py
- inventory_browser.py
- checkpoints.js
- welcome.js
- rastro-sucursal-routines.js
- fudia
- enable-supervision-cron.js
- chicken_browser.py
- chicken_units_browser.py
- protein_browser.py
- rastro_browser.py
- foodia/.mcp.json
- mcp.json
- pilot_browser.py
- rastro_inventory_browser.py
- refined_browser.py

## God Nodes (most connected - your core abstractions)
1. `applyOperation()` - 24 edges
2. `commit()` - 20 edges
3. `render()` - 20 edges
4. `repository()` - 15 edges
5. `today()` - 15 edges
6. `location()` - 14 edges
7. `wireForm()` - 13 edges
8. `freshState()` - 11 edges
9. `linesFrom()` - 11 edges
10. `InventoryError` - 10 edges

## Surprising Connections (you probably didn't know these)
- `service()` --indirect_call--> `commit()`  [INFERRED]
  lib/food-service.js → js/inventory.js
- `purchase()` --calls--> `today()`  [EXTRACTED]
  test/foodia.test.js → lib/inventory-domain.js
- `run()` --calls--> `applyOperation()`  [EXTRACTED]
  test/proteins.test.js → lib/inventory-domain.js
- `fixture()` --indirect_call--> `location()`  [INFERRED]
  test/inventory.test.js → lib/protein-inventory.js
- `summary()` --indirect_call--> `message()`  [INFERRED]
  js/feedback.js → lib/supervision/telegram.js

## Import Cycles
- None detected.

## Communities (62 total, 15 thin omitted)

### Community 0 - "telegram.js"
Cohesion: 0.06
Nodes (44): celebrate(), progress(), saved(), summary(), areaSummary(), blockFor(), classifications(), closing (+36 more)

### Community 1 - "food-mcp.js"
Cohesion: 0.05
Nodes (41): auth, createHandler(), {createServer}, {repository}, {StreamableHTTPServerTransport}, authenticate(), configuration(), {InventoryError} (+33 more)

### Community 2 - "db.js"
Cohesion: 0.05
Nodes (31): { ensureTables }, { ensureTables }, EVENT_COLUMNS, { ensureTables }, { ensureTables }, { ensureTables }, { ensureTables }, { CUTS, report } (+23 more)

### Community 3 - "inventory-auth.js"
Cohesion: 0.06
Nodes (30): authenticate(), { createHmac, timingSafeEqual, scryptSync, createHash, randomBytes }, { InventoryError }, login(), pilot, safeEqual(), session(), settings() (+22 more)

### Community 4 - "app.js"
Cohesion: 0.15
Nodes (32): api(), area(), cashForm(), cashLabels, dateParts, denominations, details(), detailSpecs (+24 more)

### Community 5 - "js/inventory.js"
Cohesion: 0.23
Nodes (30): api(), catalog(), commit(), counts(), history(), home(), incoming(), itemOptions() (+22 more)

### Community 6 - "supervision.js"
Cohesion: 0.14
Nodes (30): api(), applyAutoOpenDefaults(), applyTheme(), ATT_EVENTS, attachHandlers(), closeCornerMenu(), escapeAttr(), formatTime() (+22 more)

### Community 7 - "dev-inventory.js"
Cohesion: 0.07
Nodes (28): passwordHash(), credentials, folder, fs, {passwordHash}, path, profiles, {randomBytes} (+20 more)

### Community 8 - "scripts"
Cohesion: 0.07
Nodes (29): @electric-sql/pglite, jose, @modelcontextprotocol/sdk, @neondatabase/serverless, dependencies, jose, @modelcontextprotocol/sdk, @neondatabase/serverless (+21 more)

### Community 9 - "lib/rastro.js"
Cohesion: 0.10
Nodes (22): auth, domain, correctionRequest, date, fail(), kinds, note(), qty (+14 more)

### Community 10 - "lib/protein-inventory.js"
Cohesion: 0.14
Nodes (23): auth, domain, base, catalog, date, decimal(), ensureCatalog(), fail() (+15 more)

### Community 11 - "chicken-query.test.js"
Cohesion: 0.13
Nodes (16): auth, createHandler(), {InventoryError}, {parse,answer}, answer(), AREAS, normalize(), parse() (+8 more)

### Community 12 - "dashboard.js"
Cohesion: 0.21
Nodes (20): api(), applyTheme(), closeCornerMenu(), init(), initCollapsible(), initCornerMenu(), initCriticalChip(), initGate() (+12 more)

### Community 13 - "interface"
Cohesion: 0.10
Nodes (20): author, name, interface, description, extensions, com.openai, capabilities, category (+12 more)

### Community 14 - "chicken-units.js"
Cohesion: 0.13
Nodes (16): chicken, { ensureTables }, activity(), check(), command(), display(), ids, isChicken() (+8 more)

### Community 15 - "inventory-store.js"
Cohesion: 0.14
Nodes (12): { createHash }, { freshState, applyOperation, InventoryError }, migrations, production(), repository(), stable(), assert, {freshState,applyOperation} (+4 more)

### Community 16 - "today"
Cohesion: 0.18
Nodes (11): auth, createHandler(), { production }, { roles, OPENING_TASKS, today, InventoryError }, auth, createHandler(), { today, InventoryError }, InventoryError (+3 more)

### Community 17 - "js/protein-inventory.js"
Cohesion: 0.22
Nodes (11): api(), fields(), form(), load(), lock(), render(), cash, describe() (+3 more)

### Community 18 - "cash-close.js"
Cohesion: 0.19
Nodes (12): amount, blank(), calculate(), cashKeys, cashService(), denominations, difference(), paymentKeys (+4 more)

### Community 19 - "inventory-domain.js"
Cohesion: 0.34
Nodes (13): applyOperation(), balance(), checkedLines(), date(), fail(), getItem(), getLocation(), initialItems (+5 more)

### Community 20 - "js/rastro.js"
Cohesion: 0.29
Nodes (11): api(), correctionPreview(), dialog, esc(), field(), load(), lock(), meta() (+3 more)

### Community 21 - "inventory.test.js"
Cohesion: 0.17
Nodes (11): freshState(), domain(), assert, auth, fixture(), { freshState, applyOperation, today }, manager, { PGlite } (+3 more)

### Community 22 - "production-daily.js"
Cohesion: 0.23
Nodes (12): blank(), calculate(), captureCatalog(), catalog, chickens(), extraFields, fields, qty (+4 more)

### Community 23 - "proteins.test.js"
Cohesion: 0.20
Nodes (9): proteinReport(), PROTEINS, { today }, assert, {freshState, applyOperation}, {proteinReport}, {randomUUID}, run() (+1 more)

### Community 24 - "daily-live.test.js"
Cohesion: 0.18
Nodes (7): actor, assert, auth, cash, handler, prod, {test}

### Community 25 - "pilot-access.test.js"
Cohesion: 0.18
Nodes (7): assert, auth, {PGlite}, {randomUUID}, {repository}, {roles,applyOperation,freshState}, {test}

### Community 26 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, scope, short_name, start_url (+1 more)

### Community 27 - "sync-training-rastro.js"
Cohesion: 0.20
Nodes (9): catalogs, end, file, fs, html, path, start, supervisionEnd (+1 more)

### Community 28 - "foodia-local.test.js"
Cohesion: 0.20
Nodes (9): assert, {Client}, fs, path, {randomUUID}, {spawnSync}, {StdioClientTransport}, {test} (+1 more)

### Community 29 - "foodia.test.js"
Cohesion: 0.20
Nodes (9): actor, assert, {freshState,applyOperation,today}, {PGlite}, purchase(), {randomUUID}, {repository}, {service} (+1 more)

### Community 30 - "vercel.json"
Cohesion: 0.20
Nodes (9): includeFiles, buildCommand, crons, functions, api/summary.js, headers, installCommand, outputDirectory (+1 more)

### Community 31 - "build-static.js"
Cohesion: 0.25
Nodes (7): capture, daily, files, fs, out, path, root

### Community 32 - "chicken-chat.js"
Cohesion: 0.57
Nodes (6): api(), ask(), element(), render(), setBusy(), start()

### Community 33 - "daily-capture.test.js"
Cohesion: 0.29
Nodes (5): actor, assert, cash, prod, {test}

### Community 35 - "cash-close-web.js"
Cohesion: 0.33
Nodes (4): fs, http, path, {randomBytes}

### Community 36 - "daily-photo.test.js"
Cohesion: 0.33
Nodes (5): assert, cash, photo, prod, {test}

### Community 37 - "area-navigation.js"
Cohesion: 0.60
Nodes (3): mount(), select(), selected()

### Community 38 - "daily-handler.js"
Cohesion: 0.40
Nodes (3): auth, cash, production

### Community 39 - "run_visual_test.py"
Cohesion: 0.60
Nodes (3): build_summary(), mock_api(), ReusableTCPServer

### Community 40 - "inventory_browser.py"
Cohesion: 0.50
Nodes (3): command(), Real UI + HTTP API + PostgreSQL; disposable local database, no production…, snap()

## Knowledge Gaps
- **360 isolated node(s):** `ReusableTCPServer`, `closing`, `{ CUTS, ZONE }`, `fontfile`, `path` (+355 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `applyOperation()` connect `inventory-domain.js` to `food-mcp.js`, `app.js`, `inventory-store.js`, `today`, `inventory.test.js`, `proteins.test.js`, `pilot-access.test.js`, `foodia.test.js`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `move()` connect `app.js` to `inventory-domain.js`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `service()` connect `food-mcp.js` to `foodia.test.js`, `inventory-domain.js`, `js/inventory.js`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `applyOperation()` (e.g. with `inventory-domain.js` and `move()`) actually correct?**
  _`applyOperation()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `render()` (e.g. with `catalog()` and `counts()`) actually correct?**
  _`render()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `repository()` (e.g. with `inventory-store.js` and `snapshot()`) actually correct?**
  _`repository()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ReusableTCPServer`, `closing`, `{ CUTS, ZONE }` to the rest of the system?**
  _360 weakly-connected nodes found - possible documentation gaps or missing edges._